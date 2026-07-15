import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 4399;
let child;
let dataDir;
const auth = { authorization:'Bearer test-token' };

test.before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'aster-test-'));
  child = spawn(process.execPath, ['server/index.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT:String(port), HOST:'127.0.0.1', ASTER_REMOTE_TOKEN:'test-token', OLLAMA_URL:'http://127.0.0.1:59999', ASTER_DATA_DIR:dataDir },
    stdio:'ignore'
  });
  for (let i=0;i<30;i++) {
    try { await fetch(`http://127.0.0.1:${port}/`, { signal:AbortSignal.timeout(200) }); return; }
    catch { await new Promise(r=>setTimeout(r,50)); }
  }
  throw new Error('Server did not start');
});

test.after(async () => { child?.kill(); await rm(dataDir, { recursive:true, force:true }); });

test('serves the application shell', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Aster Local/);
});

test('protects API routes when a token is configured', async () => {
  const denied = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(denied.status, 401);
  const allowed = await fetch(`http://127.0.0.1:${port}/api/health`, { headers:{ authorization:'Bearer test-token' } });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).local, true);
});

test('does not expose paths outside the web root', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/..%2Fpackage.json`);
  assert.notEqual(response.status, 200);
});

test('persists conversations through the REST lifecycle', async () => {
  const createdResponse = await fetch(`http://127.0.0.1:${port}/api/conversations`, {
    method:'POST', headers:{ ...auth, 'content-type':'application/json' },
    body:JSON.stringify({ title:'Premier échange', messages:[{ role:'user', content:'Bonjour' }] })
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.match(created.id, /^[0-9a-f-]{36}$/);

  const list = await fetch(`http://127.0.0.1:${port}/api/conversations`, { headers:auth });
  assert.deepEqual((await list.json()).conversations[0].messageCount, 1);

  const updated = await fetch(`http://127.0.0.1:${port}/api/conversations/${created.id}`, {
    method:'PATCH', headers:{ ...auth, 'content-type':'application/json' }, body:JSON.stringify({ title:'Titre modifié' })
  });
  assert.equal((await updated.json()).title, 'Titre modifié');
  const stored = JSON.parse(await readFile(join(dataDir, 'conversations.json'), 'utf8'));
  assert.equal(stored[0].title, 'Titre modifié');

  const fetched = await fetch(`http://127.0.0.1:${port}/api/conversations/${created.id}`, { headers:auth });
  assert.equal((await fetched.json()).messages[0].content, 'Bonjour');
  const deleted = await fetch(`http://127.0.0.1:${port}/api/conversations/${created.id}`, { method:'DELETE', headers:auth });
  assert.equal(deleted.status, 204);
});

test('rejects malformed and oversized conversation input', async () => {
  const malformed = await fetch(`http://127.0.0.1:${port}/api/conversations`, {
    method:'POST', headers:{ ...auth, 'content-type':'application/json' }, body:'{'
  });
  assert.equal(malformed.status, 400);
  const invalid = await fetch(`http://127.0.0.1:${port}/api/conversations`, {
    method:'POST', headers:{ ...auth, 'content-type':'application/json' }, body:JSON.stringify({ title:'', messages:[] })
  });
  assert.equal(invalid.status, 400);
  const missing = await fetch(`http://127.0.0.1:${port}/api/conversations/00000000-0000-4000-8000-000000000000`, { headers:auth });
  assert.equal(missing.status, 404);
});

test('sets up an admin and manages a secure cookie session', async () => {
  const setup = await fetch(`http://127.0.0.1:${port}/api/auth/setup`, {
    method:'POST', headers:{ 'content-type':'application/json' },
    body:JSON.stringify({ username:'admin', password:'a-strong-local-password', profileName:'Privé' })
  });
  assert.equal(setup.status, 201);
  const setupBody = await setup.json();
  const setCookie = setup.headers.get('set-cookie');
  assert.match(setCookie, /aster_session=.*HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  const cookie = setCookie.split(';')[0];

  const status = await fetch(`http://127.0.0.1:${port}/api/auth/status`, { headers:{ cookie } });
  const statusBody = await status.json();
  assert.equal(statusBody.authenticated, true);
  assert.equal(statusBody.profile.id, setupBody.profile.id);
  const authStore = await readFile(join(dataDir, 'auth.json'), 'utf8');
  assert.doesNotMatch(authStore, /a-strong-local-password/);
  assert.match(authStore, /passwordHash/);

  const duplicate = await fetch(`http://127.0.0.1:${port}/api/auth/setup`, {
    method:'POST', headers:{ 'content-type':'application/json' },
    body:JSON.stringify({ username:'other', password:'another-strong-password' })
  });
  assert.equal(duplicate.status, 409);

  const logout = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, { method:'POST', headers:{ cookie } });
  assert.equal(logout.status, 200);
  const afterLogout = await fetch(`http://127.0.0.1:${port}/api/auth/status`, { headers:{ cookie } });
  assert.equal((await afterLogout.json()).authenticated, false);
});

test('logs in locally and isolates conversations by profile', async () => {
  const denied = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ username:'admin', password:'wrong-password!' })
  });
  assert.equal(denied.status, 401);
  const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ username:'ADMIN', password:'a-strong-local-password' })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const loginBody = await login.json();
  const configured = await fetch(`http://127.0.0.1:${port}/api/admin/config`, {
    method:'POST', headers:{ cookie, 'content-type':'application/json' }, body:JSON.stringify({ installationMode:'family' })
  });
  assert.equal(configured.status, 200);
  const addedUser = await fetch(`http://127.0.0.1:${port}/api/admin/users`, {
    method:'POST', headers:{ cookie, 'content-type':'application/json' },
    body:JSON.stringify({ username:'membre', password:'another-strong-password', profileName:'Maison' })
  });
  assert.equal(addedUser.status, 201);
  const member = (await addedUser.json()).user;
  const addedProfile = await fetch(`http://127.0.0.1:${port}/api/admin/users/${member.id}/profiles`, {
    method:'POST', headers:{ cookie, 'content-type':'application/json' }, body:JSON.stringify({ name:'Travail' })
  });
  assert.equal(addedProfile.status, 201);
  assert.equal((await addedProfile.json()).profiles.length, 2);
  const overview = await fetch(`http://127.0.0.1:${port}/api/admin/overview`, { headers:{ cookie } });
  assert.equal((await overview.json()).users.length, 2);
  const concurrentUsers = await Promise.all(['membre2','membre3'].map(username => fetch(`http://127.0.0.1:${port}/api/admin/users`, {
    method:'POST', headers:{ cookie, 'content-type':'application/json' },
    body:JSON.stringify({ username, password:'concurrent-strong-password', profileName:'Personnel' })
  })));
  assert.deepEqual(concurrentUsers.map(response => response.status).sort(), [201, 409]);
  const concurrentProfiles = await Promise.all(['Loisirs','Études','Invité'].map(name => fetch(`http://127.0.0.1:${port}/api/admin/users/${member.id}/profiles`, {
    method:'POST', headers:{ cookie, 'content-type':'application/json' }, body:JSON.stringify({ name })
  })));
  assert.deepEqual(concurrentProfiles.map(response => response.status).sort(), [201, 201, 409]);
  const hardenedOverview = await fetch(`http://127.0.0.1:${port}/api/admin/overview`, { headers:{ cookie } });
  const hardenedBody = await hardenedOverview.json();
  assert.equal(hardenedBody.users.length, 3);
  assert.equal(hardenedBody.users.find(user => user.id === member.id).profiles.length, 4);
  const selected = await fetch(`http://127.0.0.1:${port}/api/auth/profile`, {
    method:'POST', headers:{ cookie, 'content-type':'application/json' }, body:JSON.stringify({ profileId:loginBody.profile.id })
  });
  assert.equal(selected.status, 200);
  const created = await fetch(`http://127.0.0.1:${port}/api/conversations`, {
    method:'POST', headers:{ cookie, 'content-type':'application/json' },
    body:JSON.stringify({ title:'Conversation locale', messages:[] })
  });
  assert.equal(created.status, 201);
  const localConversation = await created.json();

  const ownList = await fetch(`http://127.0.0.1:${port}/api/conversations`, { headers:{ cookie } });
  assert.equal((await ownList.json()).conversations.length, 1);
  const remoteList = await fetch(`http://127.0.0.1:${port}/api/conversations`, { headers:auth });
  assert.equal((await remoteList.json()).conversations.length, 0);
  const hidden = await fetch(`http://127.0.0.1:${port}/api/conversations/${localConversation.id}`, { headers:auth });
  assert.equal(hidden.status, 404);
});
