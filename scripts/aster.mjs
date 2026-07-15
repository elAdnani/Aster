const command = process.argv[2] || 'start';
const jsonOutput = process.argv.includes('--json');

function publicEndpoint(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch { return 'adresse invalide'; }
}

async function probe(url, timeout = 1500) {
  try {
    const response = await fetch(url, { signal:AbortSignal.timeout(timeout) });
    if (!response.ok) return { available:false, status:response.status };
    return { available:true, data:await response.json() };
  } catch { return { available:false }; }
}

async function doctor() {
  const major = Number(process.versions.node.split('.')[0]);
  const port = Number(process.env.PORT || 4317);
  const host = process.env.HOST || '127.0.0.1';
  const ollama = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const [aster, engine] = await Promise.all([
    probe(`http://${host}:${port}/api/auth/status`),
    probe(`${ollama}/api/tags`)
  ]);
  const report = {
    node:{ version:process.versions.node, supported:major >= 20 },
    aster:{ available:aster.available, endpoint:`http://${host}:${port}`, configured:!!aster.data?.configured },
    ollama:{ available:engine.available, endpoint:publicEndpoint(ollama), models:(engine.data?.models || []).map(item => String(item.name || '')).filter(Boolean).slice(0, 50) },
    ready:major >= 20 && engine.available && (engine.data?.models || []).length > 0
  };
  if (jsonOutput) console.log(JSON.stringify(report));
  else {
    console.log(`Node.js ${report.node.version} — ${report.node.supported ? 'compatible' : 'version 20+ requise'}`);
    console.log(`Aster ${report.aster.available ? 'déjà lancé' : 'arrêté'} — ${report.aster.endpoint}`);
    console.log(`Ollama ${report.ollama.available ? 'disponible' : 'indisponible'} — ${report.ollama.endpoint}`);
    console.log(report.ollama.models.length ? `Modèles : ${report.ollama.models.join(', ')}` : 'Aucun modèle local détecté.');
    console.log(report.ready ? 'Diagnostic prêt : Aster peut utiliser le moteur local.' : 'Diagnostic incomplet : consultez docs/installation.md.');
  }
  if (!report.node.supported) process.exitCode = 1;
}

if (command === 'start') await import('../server/index.js');
else if (command === 'doctor') await doctor();
else {
  console.error('Usage : node scripts/aster.mjs [start|doctor] [--json]');
  process.exitCode = 1;
}
