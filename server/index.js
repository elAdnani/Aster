import http from 'node:http';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../web', import.meta.url));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4317);
const ollama = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const remoteToken = process.env.ASTER_REMOTE_TOKEN || '';
const scrypt = promisify(scryptCallback);
const dataDir = process.env.ASTER_DATA_DIR || fileURLToPath(new URL('../data', import.meta.url));
const conversationFile = process.env.ASTER_DATA_DIR
  ? join(process.env.ASTER_DATA_DIR, 'conversations.json')
  : fileURLToPath(new URL('../data/conversations.json', import.meta.url));
const authFile = join(dataDir, 'auth.json');
const storageKeyFile = join(dataDir, 'storage.key');
const sessions = new Map();
const loginAttempts = new Map();
const pinAttempts = new Map();
const inferenceQueues = new Map();
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_OPTIONS = { N:131072, r:8, p:1, maxmem:256 * 1024 * 1024 };
const MAX_CONVERSATIONS = 500;
const MAX_MESSAGES = 200;
const MAX_CONTENT = 100_000;
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
let mutation = Promise.resolve();
let authMutation = Promise.resolve();
let storageKeyPromise;

function json(res, status, body) {
  res.writeHead(status, { ...securityHeaders(), 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' });
  res.end(JSON.stringify(body));
}

function securityHeaders() {
  return { 'x-content-type-options':'nosniff', 'x-frame-options':'DENY', 'referrer-policy':'no-referrer', 'permissions-policy':'camera=(), microphone=(), geolocation=()', 'content-security-policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" };
}

function checkLoginRate(req) {
  const key = req.socket.remoteAddress || 'unknown'; const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter(time => now - time < 10 * 60 * 1000);
  if (recent.length >= 8) throw Object.assign(new Error('Trop de tentatives. Réessayez dans quelques minutes.'), { status:429 });
  recent.push(now); loginAttempts.set(key, recent);
}

function publicProfile(profile) {
  return profile ? { id:profile.id, name:profile.name, pinRequired:!!profile.pinHash } : null;
}

function publicUser(user, includeProfiles = false) {
  return { id:user.id, username:user.username, role:user.role, suspended:!!user.suspended, ...(includeProfiles ? { profiles:user.profiles.map(publicProfile) } : {}) };
}

function revokeUserSessions(userId, profileId = null) {
  for (const [token, active] of sessions) {
    if (active.userId === userId && (!profileId || active.profileId === profileId)) sessions.delete(token);
  }
}

function checkPinRate(session, profileId) {
  const key = `${session.userId}:${profileId}`; const now = Date.now();
  const recent = (pinAttempts.get(key) || []).filter(time => now - time < 10 * 60 * 1000);
  if (recent.length >= 5) throw Object.assign(new Error('Trop de tentatives de PIN. Réessayez dans quelques minutes.'), { status:429 });
  recent.push(now); pinAttempts.set(key, recent);
  return key;
}

function inferenceState(profileId) {
  if (!inferenceQueues.has(profileId)) inferenceQueues.set(profileId, { active:0, queue:[] });
  return inferenceQueues.get(profileId);
}

function acquireInference(profileId, limit, signal) {
  const state = inferenceState(profileId);
  if (state.active < limit) { state.active += 1; return Promise.resolve(() => releaseInference(profileId, limit)); }
  if (state.queue.length >= 25) throw Object.assign(new Error('File d’attente pleine pour ce profil.'), { status:429 });
  return new Promise((resolve, reject) => {
    const waiter = { resolve, reject, signal, aborted:false };
    const abort = () => { waiter.aborted = true; state.queue = state.queue.filter(item => item !== waiter); reject(Object.assign(new Error('Requête annulée.'), { status:499 })); };
    waiter.abort = abort;
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once:true });
    state.queue.push(waiter);
  });
}

function releaseInference(profileId, limit) {
  const state = inferenceState(profileId); state.active = Math.max(0, state.active - 1);
  while (state.queue.length && state.active < limit) {
    const waiter = state.queue.shift();
    if (waiter.aborted) continue;
    waiter.signal?.removeEventListener('abort', waiter.abort); state.active += 1;
    let released = false; waiter.resolve(() => { if (!released) { released = true; releaseInference(profileId, limit); } });
  }
  if (!state.active && !state.queue.length) inferenceQueues.delete(profileId);
}

function cookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

function sessionFor(req) {
  if (remoteToken && req.headers.authorization === `Bearer ${remoteToken}`) return { userId:'remote', profileId:'remote', role:'admin' };
  const token = cookie(req, 'aster_session');
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) { sessions.delete(token); return null; }
  return session;
}

function sessionCookie(token, maxAge = Math.floor(SESSION_MS / 1000)) {
  const secure = host !== '127.0.0.1' && host !== 'localhost' ? '; Secure' : '';
  return `aster_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function isLoopback(req) {
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address.startsWith('::ffff:127.');
}

async function loadAuth() {
  try {
    const value = JSON.parse(await readFile(authFile, 'utf8'));
    if (!value || !Array.isArray(value.users)) throw new Error('invalid auth store');
    return value;
  } catch (error) {
    if (error.code === 'ENOENT') return { version:1, installationMode:null, users:[] };
    throw Object.assign(new Error("Le stockage d'authentification est illisible."), { status:500 });
  }
}

async function saveAuth(value) {
  await mkdir(dataDir, { recursive:true });
  const temporary = `${authFile}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding:'utf8', flag:'wx', mode:0o600 });
  await rename(temporary, authFile);
}

function mutateAuth(operation) {
  const next = authMutation.then(async () => {
    const auth = await loadAuth();
    const result = await operation(auth);
    await saveAuth(auth);
    return result;
  });
  authMutation = next.catch(() => {});
  return next;
}

function validateCredentials(input, setup = false) {
  if (!input || typeof input !== 'object') throw Object.assign(new Error('Identifiants invalides.'), { status:400 });
  const username = String(input.username || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw Object.assign(new Error("Nom d'utilisateur invalide."), { status:400 });
  if (password.length < 12 || password.length > 256) throw Object.assign(new Error('Le mot de passe doit contenir entre 12 et 256 caractères.'), { status:400 });
  const profileName = setup ? String(input.profileName || 'Personnel').trim().slice(0, 80) : '';
  if (setup && !profileName) throw Object.assign(new Error('Nom de profil invalide.'), { status:400 });
  return { username, password, profileName, profileId:typeof input.profileId === 'string' ? input.profileId : '' };
}

async function passwordHash(password, salt = randomBytes(16)) {
  const derived = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return { salt:salt.toString('base64'), hash:Buffer.from(derived).toString('base64') };
}

async function passwordMatches(password, user, kind = 'password') {
  const expected = Buffer.from(user[`${kind}Hash`], 'base64');
  const actual = Buffer.from(await scrypt(password, Buffer.from(user[`${kind}Salt`], 'base64'), expected.length, SCRYPT_OPTIONS));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function storageMasterKey() {
  if (!storageKeyPromise) storageKeyPromise = (async () => {
    try {
      const key = await readFile(storageKeyFile);
      if (key.length !== 32) throw new Error('invalid storage key');
      return key;
    } catch (error) {
      if (error.code !== 'ENOENT') throw Object.assign(new Error('La clé de stockage locale est illisible.'), { status:500 });
      await mkdir(dataDir, { recursive:true });
      const key = randomBytes(32);
      try { await writeFile(storageKeyFile, key, { flag:'wx', mode:0o600 }); return key; }
      catch (writeError) {
        if (writeError.code !== 'EEXIST') throw writeError;
        const existing = await readFile(storageKeyFile);
        if (existing.length !== 32) throw new Error('invalid storage key');
        return existing;
      }
    }
  })();
  return storageKeyPromise;
}

async function conversationKey(profileId) {
  return Buffer.from(hkdfSync('sha256', await storageMasterKey(), Buffer.from(profileId), Buffer.from('aster-conversation-v1'), 32));
}

async function encryptConversation(conversation) {
  const iv = randomBytes(12); const key = await conversationKey(conversation.profileId);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`${conversation.id}:${conversation.profileId}`));
  const payload = Buffer.from(JSON.stringify({ title:conversation.title, messages:conversation.messages, model:conversation.model }), 'utf8');
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return { id:conversation.id, profileId:conversation.profileId, createdAt:conversation.createdAt, updatedAt:conversation.updatedAt, encrypted:{ version:1, iv:iv.toString('base64'), tag:cipher.getAuthTag().toString('base64'), data:encrypted.toString('base64') } };
}

async function decryptConversation(record) {
  if (!record.encrypted) return record;
  try {
    const key = await conversationKey(record.profileId); const iv = Buffer.from(record.encrypted.iv, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(`${record.id}:${record.profileId}`));
    decipher.setAuthTag(Buffer.from(record.encrypted.tag, 'base64'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(record.encrypted.data, 'base64')), decipher.final()]);
    const payload = JSON.parse(decrypted.toString('utf8'));
    return { id:record.id, profileId:record.profileId, ...payload, createdAt:record.createdAt, updatedAt:record.updatedAt };
  } catch {
    throw Object.assign(new Error('Une conversation chiffrée est illisible ou a été modifiée.'), { status:500 });
  }
}

function startSession(res, user, profileId) {
  const token = randomBytes(32).toString('base64url');
  const session = { userId:user.id, role:user.role, profileId, expiresAt:Date.now() + SESSION_MS };
  sessions.set(token, session);
  res.setHeader('set-cookie', sessionCookie(token));
  return session;
}

async function body(req, limit = 2_000_000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('JSON invalide.'), { status:400 }); }
}

async function loadConversations() {
  try {
    const value = JSON.parse(await readFile(conversationFile, 'utf8'));
    if (!Array.isArray(value)) throw new Error('invalid store');
    return Promise.all(value.map(decryptConversation));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw Object.assign(new Error('Le stockage des conversations est illisible.'), { status:500 });
  }
}

async function saveConversations(conversations) {
  await mkdir(dirname(conversationFile), { recursive:true });
  const temporary = `${conversationFile}.${process.pid}.${randomUUID()}.tmp`;
  const encrypted = await Promise.all(conversations.map(encryptConversation));
  await writeFile(temporary, `${JSON.stringify(encrypted, null, 2)}\n`, { encoding:'utf8', flag:'wx', mode:0o600 });
  await rename(temporary, conversationFile);
}

function validateConversation(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Conversation invalide.'), { status:400 });
  const output = {};
  if (!partial || 'title' in input) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200) throw Object.assign(new Error('Le titre doit contenir entre 1 et 200 caractères.'), { status:400 });
    output.title = input.title.trim();
  }
  if (!partial || 'messages' in input) {
    if (!Array.isArray(input.messages) || input.messages.length > MAX_MESSAGES) throw Object.assign(new Error(`Maximum ${MAX_MESSAGES} messages.`), { status:400 });
    output.messages = input.messages.map((message) => {
      if (!message || !['system','user','assistant','tool'].includes(message.role) || typeof message.content !== 'string' || message.content.length > MAX_CONTENT) throw Object.assign(new Error('Message invalide.'), { status:400 });
      return { role:message.role, content:message.content };
    });
  }
  if ('model' in input) {
    if (typeof input.model !== 'string' || input.model.length > 120) throw Object.assign(new Error('Modèle invalide.'), { status:400 });
    output.model = input.model;
  }
  if (partial && !Object.keys(output).length) throw Object.assign(new Error('Aucun champ modifiable fourni.'), { status:400 });
  return output;
}

function validatePolicy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Politique invalide.'), { status:400 });
  const allowedModels = Array.isArray(input.allowedModels) ? [...new Set(input.allowedModels.map(value => String(value).trim()).filter(Boolean))] : [];
  const allowedSkills = Array.isArray(input.allowedSkills) ? [...new Set(input.allowedSkills.map(value => String(value).trim()).filter(Boolean))] : [];
  const rules = String(input.rules || '').trim(); const parallelRequests = Number(input.parallelRequests || 1);
  if (allowedModels.length > 20 || allowedModels.some(value => value.length > 120)) throw Object.assign(new Error('Liste de modèles invalide.'), { status:400 });
  if (allowedSkills.length > 30 || allowedSkills.some(value => !/^[a-z0-9._-]{1,64}$/i.test(value))) throw Object.assign(new Error('Liste de skills invalide.'), { status:400 });
  if (rules.length > 10_000) throw Object.assign(new Error('Les règles dépassent 10 000 caractères.'), { status:400 });
  if (!Number.isInteger(parallelRequests) || parallelRequests < 1 || parallelRequests > 8) throw Object.assign(new Error('Limite parallèle invalide.'), { status:400 });
  return { allowedModels, allowedSkills, rules, parallelRequests };
}

function mutateConversations(operation) {
  const next = mutation.then(async () => {
    const conversations = await loadConversations();
    const result = await operation(conversations);
    await saveConversations(conversations);
    return result;
  });
  mutation = next.catch(() => {});
  return next;
}

async function api(req, res, url) {
  if (url.pathname === '/api/auth/setup' && req.method === 'POST') {
    if (!isLoopback(req)) return json(res, 403, { error:'Configuration administrateur autorisée uniquement en local.' });
    const input = validateCredentials(await body(req), true);
    const password = await passwordHash(input.password);
    const profile = { id:randomUUID(), name:input.profileName };
    const user = { id:randomUUID(), username:input.username, role:'admin', passwordSalt:password.salt, passwordHash:password.hash, profiles:[profile], createdAt:new Date().toISOString() };
    await mutateAuth((auth) => {
      if (auth.users.length) throw Object.assign(new Error('Un administrateur existe déjà.'), { status:409 });
      auth.users.push(user);
    });
    startSession(res, user, null);
    return json(res, 201, { user:publicUser(user), profiles:user.profiles.map(publicProfile), profile:null });
  }
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    checkLoginRate(req);
    const input = validateCredentials(await body(req));
    const auth = await loadAuth();
    const user = auth.users.find(item => item.username === input.username);
    if (!user || !(await passwordMatches(input.password, user))) return json(res, 401, { error:'Identifiants incorrects.' });
    if (user.suspended) return json(res, 403, { error:'Compte suspendu par l’administrateur.' });
    loginAttempts.delete(req.socket.remoteAddress || 'unknown');
    startSession(res, user, null);
    return json(res, 200, { user:publicUser(user), profiles:user.profiles.map(publicProfile), profile:null });
  }
  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    sessions.delete(cookie(req, 'aster_session')); res.setHeader('set-cookie', sessionCookie('', 0));
    return json(res, 200, { ok:true });
  }
  if (url.pathname === '/api/auth/status' && req.method === 'GET') {
    const auth = await loadAuth(); const session = sessionFor(req);
    if (!session) return json(res, 200, { configured:auth.users.length > 0, authenticated:false });
    if (session.userId === 'remote') return json(res, 200, { configured:auth.users.length > 0, authenticated:true, remote:true, profile:{ id:'remote', name:'Remote' } });
    const user = auth.users.find(item => item.id === session.userId); const profile = user?.profiles.find(item => item.id === session.profileId);
    if (!user) return json(res, 200, { configured:auth.users.length > 0, authenticated:false });
    return json(res, 200, { configured:true, installationConfigured:!!auth.installationMode, authenticated:true, user:publicUser(user), profiles:user.profiles.map(publicProfile), profile:publicProfile(profile) });
  }
  let session = sessionFor(req);
  if (!session) return json(res, 401, { error:'Authentification requise.' });
  if (url.pathname === '/api/auth/profile' && req.method === 'POST') {
    if (session.userId === 'remote') return json(res, 400, { error:'Profil distant fixe.' });
    const auth = await loadAuth(); const user = auth.users.find(item => item.id === session.userId);
    const profileInput = await body(req);
    const profile = user?.profiles.find(item => item.id === String(profileInput.profileId || ''));
    if (!profile) return json(res, 404, { error:'Profil introuvable.' });
    if (profile.pinHash) {
      const attemptKey = checkPinRate(session, profile.id);
      const pin = String(profileInput.pin || '');
      if (!(await passwordMatches(pin, profile, 'pin'))) return json(res, 401, { error:'PIN incorrect.' });
      pinAttempts.delete(attemptKey);
    }
    session.profileId = profile.id;
    return json(res, 200, { profile:publicProfile(profile) });
  }
  if (url.pathname === '/api/admin/profiles' && req.method === 'POST') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); const name = String(input.name || '').trim();
    if (!name || name.length > 40) return json(res, 400, { error:'Nom de profil invalide.' });
    const result = await mutateAuth((auth) => {
      const user = auth.users.find(item => item.id === session.userId);
      if (!user || user.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      if (user.profiles.length >= 4) throw Object.assign(new Error('Limite de quatre profils atteinte.'), { status:409 });
      const profile = { id:randomUUID(), name }; user.profiles.push(profile);
      return { profile:publicProfile(profile), profiles:user.profiles.map(publicProfile) };
    });
    return json(res, 201, result);
  }
  if (url.pathname === '/api/admin/overview' && req.method === 'GET') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const auth = await loadAuth(); const administrator = auth.users.find(item => item.id === session.userId);
    if (!administrator || administrator.role !== 'admin') return json(res, 403, { error:'Droits administrateur requis.' });
    return json(res, 200, { installationMode:auth.installationMode, maxUsers:auth.installationMode === 'solo' ? 1 : 3, users:auth.users.map(user => publicUser(user, true)) });
  }
  if (url.pathname === '/api/admin/config' && req.method === 'POST') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); const installationMode = String(input.installationMode || '');
    if (!['solo','family','custom'].includes(installationMode)) return json(res, 400, { error:'Configuration invalide.' });
    await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      if (installationMode === 'solo' && auth.users.length > 1) throw Object.assign(new Error('Supprimez les comptes supplémentaires avant de choisir Personnel.'), { status:409 });
      auth.installationMode = installationMode;
    });
    return json(res, 200, { installationMode, maxUsers:installationMode === 'solo' ? 1 : 3 });
  }
  if (url.pathname === '/api/admin/users' && req.method === 'POST') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = validateCredentials(await body(req), true);
    const password = await passwordHash(input.password); const profile = { id:randomUUID(), name:input.profileName };
    const user = { id:randomUUID(), username:input.username, role:'user', passwordSalt:password.salt, passwordHash:password.hash, profiles:[profile], createdAt:new Date().toISOString() };
    await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      if (!auth.installationMode) throw Object.assign(new Error('Terminez d’abord la configuration administrateur.'), { status:409 });
      const maxUsers = auth.installationMode === 'solo' ? 1 : 3;
      if (auth.users.length >= maxUsers) throw Object.assign(new Error(`Limite de ${maxUsers} compte(s) atteinte.`), { status:409 });
      if (auth.users.some(item => item.username === input.username)) throw Object.assign(new Error('Cet identifiant existe déjà.'), { status:409 });
      auth.users.push(user);
    });
    return json(res, 201, { user:publicUser(user, true) });
  }
  const adminProfileMatch = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/profiles$/i);
  if (adminProfileMatch && req.method === 'POST') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); const name = String(input.name || '').trim();
    if (!name || name.length > 40) return json(res, 400, { error:'Nom de profil invalide.' });
    const result = await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      const user = auth.users.find(item => item.id === adminProfileMatch[1]);
      if (!user) throw Object.assign(new Error('Compte introuvable.'), { status:404 });
      if (user.profiles.length >= 4) throw Object.assign(new Error('Limite de quatre profils atteinte.'), { status:409 });
      const profile = { id:randomUUID(), name }; user.profiles.push(profile);
      return { profile:publicProfile(profile), profiles:user.profiles.map(publicProfile) };
    });
    return json(res, 201, result);
  }
  const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})$/i);
  if (adminUserMatch && req.method === 'PATCH') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); const suspended = input.suspended;
    if (typeof suspended !== 'boolean') return json(res, 400, { error:'État de suspension invalide.' });
    const updated = await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      const user = auth.users.find(item => item.id === adminUserMatch[1]);
      if (!user) throw Object.assign(new Error('Compte introuvable.'), { status:404 });
      if (user.role === 'admin' || user.id === session.userId) throw Object.assign(new Error('Le compte administrateur principal ne peut pas être suspendu.'), { status:409 });
      user.suspended = suspended;
      return publicUser(user, true);
    });
    if (suspended) revokeUserSessions(updated.id);
    return json(res, 200, { user:updated });
  }
  if (adminUserMatch && req.method === 'DELETE') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); let deleted;
    await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      const index = auth.users.findIndex(item => item.id === adminUserMatch[1]); const user = auth.users[index];
      if (!user) throw Object.assign(new Error('Compte introuvable.'), { status:404 });
      if (user.role === 'admin' || user.id === session.userId) throw Object.assign(new Error('Le compte administrateur principal ne peut pas être supprimé.'), { status:409 });
      if (String(input.username || '') !== user.username) throw Object.assign(new Error('Confirmez la suppression avec l’identifiant exact.'), { status:400 });
      deleted = { id:user.id, profileIds:user.profiles.map(profile => profile.id) }; auth.users.splice(index, 1);
    });
    revokeUserSessions(deleted.id);
    await mutateConversations((conversations) => conversations.filter(item => !deleted.profileIds.includes(item.profileId)));
    return json(res, 200, { ok:true });
  }
  const adminDeleteProfileMatch = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/profiles\/([0-9a-f-]{36})$/i);
  if (adminDeleteProfileMatch && req.method === 'DELETE') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); let deleted;
    await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      const user = auth.users.find(item => item.id === adminDeleteProfileMatch[1]);
      const index = user?.profiles.findIndex(item => item.id === adminDeleteProfileMatch[2]) ?? -1; const profile = user?.profiles[index];
      if (!profile) throw Object.assign(new Error('Profil introuvable.'), { status:404 });
      if (user.profiles.length <= 1) throw Object.assign(new Error('Un compte doit conserver au moins un profil.'), { status:409 });
      if (String(input.name || '') !== profile.name) throw Object.assign(new Error('Confirmez la suppression avec le nom exact du profil.'), { status:400 });
      deleted = { userId:user.id, profileId:profile.id }; user.profiles.splice(index, 1);
    });
    revokeUserSessions(deleted.userId, deleted.profileId);
    await mutateConversations((conversations) => conversations.filter(item => item.profileId !== deleted.profileId));
    return json(res, 200, { ok:true });
  }
  const adminPinMatch = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/profiles\/([0-9a-f-]{36})\/pin$/i);
  if (adminPinMatch && req.method === 'POST') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); const pin = String(input.pin || '');
    if (pin && !/^\d{4,8}$/.test(pin)) return json(res, 400, { error:'Le PIN doit contenir entre 4 et 8 chiffres.' });
    const pinSecret = pin ? await passwordHash(pin) : null;
    const result = await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      const user = auth.users.find(item => item.id === adminPinMatch[1]); const profile = user?.profiles.find(item => item.id === adminPinMatch[2]);
      if (!profile) throw Object.assign(new Error('Profil introuvable.'), { status:404 });
      if (pinSecret) { profile.pinSalt = pinSecret.salt; profile.pinHash = pinSecret.hash; }
      else { delete profile.pinSalt; delete profile.pinHash; }
      return publicProfile(profile);
    });
    return json(res, 200, { profile:result });
  }
  if (url.pathname === '/api/admin/policy' && req.method === 'GET') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const auth = await loadAuth(); const administrator = auth.users.find(item => item.id === session.userId);
    if (!administrator || administrator.role !== 'admin') return json(res, 403, { error:'Droits administrateur requis.' });
    const targetUser = auth.users.find(item => item.id === (url.searchParams.get('userId') || session.userId));
    const profile = targetUser?.profiles.find(item => item.id === (url.searchParams.get('profileId') || session.profileId));
    if (!profile) return json(res, 409, { error:'Sélectionnez le profil à configurer.' });
    return json(res, 200, { policy:profile.policy || { allowedModels:[], allowedSkills:[], rules:'', parallelRequests:1 } });
  }
  if (url.pathname === '/api/admin/policy' && req.method === 'PUT') {
    if (!isLoopback(req)) return json(res, 403, { error:'Administration autorisée uniquement en local.' });
    const input = await body(req); const policy = validatePolicy(input);
    const saved = await mutateAuth((auth) => {
      const administrator = auth.users.find(item => item.id === session.userId);
      if (!administrator || administrator.role !== 'admin') throw Object.assign(new Error('Droits administrateur requis.'), { status:403 });
      const targetUser = auth.users.find(item => item.id === (String(input.userId || '') || session.userId));
      const profile = targetUser?.profiles.find(item => item.id === (String(input.profileId || '') || session.profileId));
      if (!profile) throw Object.assign(new Error('Sélectionnez le profil à configurer.'), { status:409 });
      profile.policy = policy; return policy;
    });
    return json(res, 200, { policy:saved });
  }
  if (session.userId !== 'remote' && !session.profileId) return json(res, 403, { error:'Sélectionnez un profil.' });
  const conversationMatch = url.pathname.match(/^\/api\/conversations\/([0-9a-f-]{36})$/i);
  if (url.pathname === '/api/conversations' && req.method === 'GET') {
    const conversations = (await loadConversations()).filter(item => item.profileId === session.profileId);
    return json(res, 200, { conversations:conversations.map(({ messages, ...item }) => ({ ...item, messageCount:messages.length })) });
  }
  if (url.pathname === '/api/conversations' && req.method === 'POST') {
    const input = validateConversation(await body(req));
    const conversation = await mutateConversations((conversations) => {
      if (conversations.filter(item => item.profileId === session.profileId).length >= MAX_CONVERSATIONS) throw Object.assign(new Error(`Maximum ${MAX_CONVERSATIONS} conversations.`), { status:409 });
      const now = new Date().toISOString();
      const created = { id:randomUUID(), profileId:session.profileId, ...input, model:input.model || 'gemma4:12b', createdAt:now, updatedAt:now };
      conversations.unshift(created);
      return created;
    });
    return json(res, 201, conversation);
  }
  if (conversationMatch && req.method === 'GET') {
    const conversation = (await loadConversations()).find(item => item.id === conversationMatch[1] && item.profileId === session.profileId);
    return conversation ? json(res, 200, conversation) : json(res, 404, { error:'Conversation introuvable.' });
  }
  if (conversationMatch && (req.method === 'PATCH' || req.method === 'PUT')) {
    const input = validateConversation(await body(req), req.method === 'PATCH');
    const conversation = await mutateConversations((conversations) => {
      const index = conversations.findIndex(item => item.id === conversationMatch[1] && item.profileId === session.profileId);
      if (index < 0) throw Object.assign(new Error('Conversation introuvable.'), { status:404 });
      conversations[index] = { ...conversations[index], ...input, updatedAt:new Date().toISOString() };
      return conversations[index];
    });
    return json(res, 200, conversation);
  }
  if (conversationMatch && req.method === 'DELETE') {
    await mutateConversations((conversations) => {
      const index = conversations.findIndex(item => item.id === conversationMatch[1] && item.profileId === session.profileId);
      if (index < 0) throw Object.assign(new Error('Conversation introuvable.'), { status:404 });
      conversations.splice(index, 1);
    });
    res.writeHead(204, { 'cache-control':'no-store' }); res.end(); return;
  }
  if (url.pathname === '/api/health') {
    try {
      const r = await fetch(`${ollama}/api/tags`, { signal: AbortSignal.timeout(1800) });
      return json(res, 200, { ok:true, ollama:r.ok, local: host === '127.0.0.1' || host === 'localhost' });
    } catch { return json(res, 200, { ok:true, ollama:false, local:true }); }
  }
  if (url.pathname === '/api/models') {
    try {
      const r = await fetch(`${ollama}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error('Ollama unavailable');
      const data = await r.json();
      return json(res, 200, { models:(data.models || []).map(m => ({ name:m.name, size:m.size })) });
    } catch { return json(res, 503, { error:'Ollama est hors ligne.', models:[] }); }
  }
  if (url.pathname === '/api/inference/status' && req.method === 'GET') {
    const state = inferenceQueues.get(session.profileId) || { active:0, queue:[] };
    return json(res, 200, { active:state.active, queued:state.queue.length });
  }
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    const input = await body(req);
    const model = String(input.model || 'gemma4:12b').slice(0, 120);
    let policy = null;
    if (session.userId !== 'remote') {
      const auth = await loadAuth(); const user = auth.users.find(item => item.id === session.userId); const profile = user?.profiles.find(item => item.id === session.profileId);
      policy = profile?.policy || null;
      if (policy?.allowedModels?.length && !policy.allowedModels.includes(model)) return json(res, 403, { error:'Ce modèle n’est pas autorisé pour ce profil.' });
    }
    const messages = Array.isArray(input.messages) ? input.messages.slice(-80).filter(m => m && ['user','assistant','tool'].includes(m.role)).map(m => ({ role:m.role, content:String(m.content || '').slice(0, 100_000) })) : [];
    if (policy?.rules) messages.unshift({ role:'system', content:policy.rules });
    const controller = new AbortController(); res.once('close', () => { if (!res.writableEnded) controller.abort(); });
    const queuedAt = Date.now(); const limit = policy?.parallelRequests || 1;
    const release = await acquireInference(session.profileId, limit, controller.signal);
    try {
      const upstream = await fetch(`${ollama}/api/chat`, {
        method:'POST', headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ model, messages, stream:true }), signal:controller.signal
      });
      if (!upstream.ok || !upstream.body) return json(res, upstream.status, { error:await upstream.text() });
      res.writeHead(200, { ...securityHeaders(), 'content-type':'application/x-ndjson', 'cache-control':'no-store', 'x-aster-queue-wait-ms':String(Date.now()-queuedAt) });
      const reader = upstream.body.getReader();
      try { while (true) { const {done,value}=await reader.read(); if(done) break; if(!res.write(value)) await new Promise(r => res.once('drain',r)); } }
      finally { reader.releaseLock(); res.end(); }
    } finally { release(); }
    return;
  }
  json(res, 404, { error:'Route inconnue.' });
}

async function staticFile(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const path = join(root, safe);
  if (!path.startsWith(root)) return json(res, 403, { error:'Accès refusé.' });
  try {
    if (!(await stat(path)).isFile()) throw new Error('not file');
    const data = await readFile(path);
    res.writeHead(200, { ...securityHeaders(), 'content-type':types[extname(path)] || 'application/octet-stream', 'cache-control':extname(path)==='.html'?'no-cache':'public, max-age=3600' });
    res.end(data);
  } catch { json(res, 404, { error:'Introuvable.' }); }
}

const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (!['GET','HEAD','OPTIONS'].includes(req.method || 'GET') && req.headers.origin) {
      const origin = new URL(req.headers.origin); const expected = String(req.headers.host || '');
      if (origin.host !== expected) return json(res, 403, { error:'Origine refusée.' });
    }
    if (url.pathname.startsWith('/api/')) await api(req,res,url); else await staticFile(req,res,url);
  } catch (e) { if (!res.headersSent) json(res, e.status || 500, { error:e.message || 'Erreur interne.' }); else res.end(); }
});
server.listen(port, host, () => console.log(`Aster Local → http://${host}:${port}`));
