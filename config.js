// Configurações salvas pelo painel (pasta "privado", que nunca vai para o GitHub).
// Token do GitHub e usuário ficam só neste computador.
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(__dirname, 'privado');
const ARQ = path.join(DIR, 'config.json');
const ARQ_USUARIO = path.join(os.homedir(), '.tiktok-snake-user'); // o mesmo arquivo que o iniciar.bat usa

const PADRAO = {
  usuario: '',
  musica: { ligada: true, volume: 40 },          // 0 a 100
  baile: { duracao: 5, maximo: 30 },             // minutos de cada baile · pessoas na roda
  atualizacao: { repo: 'vhvictormaia-lab/Jogo', token: '', instalado: '' },
  comediante: { ligado: true, intervalo: 3, voz: true, chave: '', chaves: [], modelo: '' }, // DJ que responde um comentário a cada X minutos
};

function mesclar(base, novo) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(novo || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && !Array.isArray(base[k])) out[k] = mesclar(base[k], v);
    else if (v !== undefined) out[k] = v;
  }
  return out;
}

let cfg = mesclar(PADRAO, {});
try { cfg = mesclar(PADRAO, JSON.parse(fs.readFileSync(ARQ, 'utf8'))); } catch {}
// uma vez só: o baile passa a ter 5 minutos e 30 pessoas (se depois você mudar no painel, fica o seu)
if (!cfg.baileV3) { cfg.baile.maximo = 30; cfg.baileV3 = true; setTimeout(() => salvar(), 0); }
if (!cfg.baileV2) { cfg.baile.duracao = 5; cfg.baile.maximo = 30; cfg.musica.volume = Math.max(40, cfg.musica.volume || 0); cfg.baileV2 = true; setTimeout(() => salvar(), 0); }
// limpa o que era dos jogos antigos
for (const k of ['modo', 'openai', 'vozes', 'vozEspectador', 'falaSolta', 'quiz', 'vozesV2']) delete cfg[k];
if (!cfg.usuario) { try { cfg.usuario = fs.readFileSync(ARQ_USUARIO, 'utf8').trim().replace(/^@/, ''); } catch {} }

function salvar() {
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(ARQ, JSON.stringify(cfg, null, 2)); } catch (e) { console.error('Não consegui salvar as configurações:', e.message); }
  if (cfg.usuario) { try { fs.writeFileSync(ARQ_USUARIO, cfg.usuario); } catch {} }
}
function atualizar(parcial) { cfg = mesclar(cfg, parcial); salvar(); return cfg; }
// versão para mostrar no painel: esconde a chave e o token
function publico() {
  const c = JSON.parse(JSON.stringify(cfg));
  c.atualizacao.temToken = !!cfg.atualizacao.token; c.atualizacao.token = '';
  const ks = [...(cfg.comediante.chaves || []), cfg.comediante.chave].filter(Boolean);
  c.comediante.temChave = ks.length > 0; c.comediante.nChaves = new Set(ks).size; c.comediante.chave = ''; c.comediante.chaves = [];
  return c;
}

module.exports = { get: () => cfg, atualizar, salvar, publico, DIR };
