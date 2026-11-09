// Configurações salvas pelo painel (pasta "privado", que nunca vai para o GitHub).
// Chave da OpenAI, token do GitHub e usuário ficam só neste computador.
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(__dirname, 'privado');
const ARQ = path.join(DIR, 'config.json');
const ARQ_USUARIO = path.join(os.homedir(), '.tiktok-snake-user'); // o mesmo arquivo que o iniciar.bat usa

const PADRAO = {
  usuario: '',
  modo: 'cobrinha',              // cobrinha | abismo (muda as falas e as vozes)
  openai: { chave: '', modelo: 'gpt-4.1-mini' },
  vozes: {
    cobra: 'pt-BR-FranciscaNeural', narrador: 'pt-BR-AntonioNeural',
    palhaco: { voz: 'pt-BR-AntonioNeural', tom: -14, vel: -6 },
    serpente: { voz: 'pt-BR-FranciscaNeural', tom: -28, vel: -14 },
  },
  vozEspectador: true,                    // cada espectador lê o próprio comentário com uma voz só dele
  musica: { ligada: true, volume: 22 },   // 0 a 100
  falaSolta: { min: 20, max: 30 },        // segundos entre as falas sozinhas
  atualizacao: { repo: 'vhvictormaia-lab/Jogo', token: '', instalado: '' },
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
if (!cfg.usuario) { try { cfg.usuario = fs.readFileSync(ARQ_USUARIO, 'utf8').trim().replace(/^@/, ''); } catch {} }

function salvar() {
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(ARQ, JSON.stringify(cfg, null, 2)); } catch (e) { console.error('Não consegui salvar as configurações:', e.message); }
  if (cfg.usuario) { try { fs.writeFileSync(ARQ_USUARIO, cfg.usuario); } catch {} }
}
function atualizar(parcial) { cfg = mesclar(cfg, parcial); salvar(); return cfg; }
// versão para mostrar no painel: esconde a chave e o token
function publico() {
  const c = JSON.parse(JSON.stringify(cfg));
  c.openai.temChave = !!cfg.openai.chave; c.openai.chave = cfg.openai.chave ? '••••' + cfg.openai.chave.slice(-4) : '';
  c.atualizacao.temToken = !!cfg.atualizacao.token; c.atualizacao.token = '';
  return c;
}

module.exports = { get: () => cfg, atualizar, salvar, publico, DIR };
