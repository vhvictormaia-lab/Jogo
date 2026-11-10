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
  modo: 'cobrinha',              // cobrinha | abismo | quiz | baile (muda as falas e as vozes)
  openai: { chave: '', modelo: 'gpt-4.1-mini' },
  vozes: {
    cobra: 'pt-BR-FranciscaNeural', narrador: 'pt-BR-AntonioNeural',
    palhaco: { voz: 'en-US-AndrewMultilingualNeural', tom: -4, vel: 6 },  // Andrew: rapaz jovem, brincalhão
    serpente: { voz: 'en-US-AvaMultilingualNeural', tom: -8, vel: 2 },     // Ava: moça jovem, debochada
  },
  vozEspectador: true,                    // cada espectador lê o próprio comentário com uma voz só dele
  musica: { ligada: true, volume: 22 },   // 0 a 100
  falaSolta: { min: 20, max: 30 },        // segundos entre as falas sozinhas
  quiz: { tempo: 30, cats: null, placar: 'dia' },
  baile: { duracao: 30, maximo: 60 },                // Baile do Abismo: minutos de cada baile, máximo de pessoas na roda // Quiz do Abismo: segundos por pergunta, categorias (null = todas), ranking mostrado
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
// quem ainda tem o tom antigo (mais lento e grave) passa para o novo, mais animado
{ const v = cfg.vozes;
  if (v.palhaco.tom === -14 && v.palhaco.vel === -6) { v.palhaco.tom = -8; v.palhaco.vel = 6; }
  if (v.serpente.tom === -28 && v.serpente.vel === -14) { v.serpente.tom = -16; v.serpente.vel = 0; }
  // uma vez só: troca as vozes padrão antigas (Antonio / Francisca) pelas novas (Andrew / Ava). Se depois você trocar no painel, fica a sua.
  if (!cfg.vozesV2) {
    if (v.palhaco.voz === 'pt-BR-AntonioNeural') Object.assign(v.palhaco, { voz: 'en-US-AndrewMultilingualNeural', tom: -4, vel: 6 });
    if (v.serpente.voz === 'pt-BR-FranciscaNeural') Object.assign(v.serpente, { voz: 'en-US-AvaMultilingualNeural', tom: -8, vel: 2 });
    cfg.vozesV2 = true; setTimeout(() => salvar(), 0);
  } }
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
