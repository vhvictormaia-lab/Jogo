// Falas da cobrinha: frases, filtro de palavras e nomes dos presentes em português.
// Usado pelo servidor (voz.js) e também pela página no modo demonstração (sem servidor).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Falas = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
// \b do JavaScript não entende acentos ("maçã", "você"): troca por limite de palavra Unicode
const W = (re) => new RegExp(re.source.replace(/\\b/g, '(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))'), re.flags.includes('u') ? re.flags : re.flags + 'u');
const PALAVROES = W(/\b(porra|caralho|merda|puta|puto|fdp|vsf|vtnc|pqp|buceta|cu|cuzao|cuzão|arrombad\w*|viad\w*|bicha|corno|piroca|pau|rola|foder|fode|fodase|foda|desgraça\w*|desgraca\w*|otario\w*|otário\w*|idiota|imbecil|retardad\w*|macac\w*|nazi\w*|estupr\w*|matar|morre|suicid\w*|sexo|nude\w*|nudes|pelad\w*|gostos\w*|safad\w*|tes[aã]o|pinto|xota|xoxota|bct|krl|crl|prr)\b/i);
const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// filtro extra (no servidor: palavras-proibidas.txt). Padrão: nada.
let extraProibido = () => false;
function setExtraProibido(fn) { extraProibido = typeof fn === 'function' ? fn : () => false; }
function proibido(t) { return PALAVROES.test(t) || !!extraProibido(t); }

function limparFala(s) {
  return String(s || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/@/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[_*~^`|<>{}\[\]\\#$%]/g, ' ')
    .replace(/(.)\1{3,}/g, '$1$1$1') // kkkkkkkk -> kkk
    .replace(/\s+/g, ' ')
    .trim();
}
function nomeFalado(u) {
  let n = limparFala(u && u.name).replace(/[0-9]{3,}/g, '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim();
  if (!n || n.length < 2 || proibido(n)) n = 'amigo';
  return n.slice(0, 22);
}
function podeLer(texto) {
  if (/https?:\/\/|www\.|\.com\b/i.test(String(texto || ''))) return null; // links: não lê
  const t = limparFala(texto);
  if (t.length < 2 || t.length > 90) return null;
  if (proibido(t)) return null;
  if (/\d{6,}/.test(t)) return null; // telefones, códigos
  return t;
}
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------- nomes dos presentes em português ----------------
const PRESENTES = {
  'rose': ['a', 'Rosa'], 'tiktok': ['o', 'TikTok'], 'gg': ['o', 'GG'], 'heart me': ['o', 'Coração'], 'finger heart': ['o', 'Coraçãozinho'],
  'heart': ['o', 'Coração'], 'hand hearts': ['as', 'Mãos de coração'], 'ice cream cone': ['o', 'Sorvete'], 'doughnut': ['a', 'Rosquinha'],
  'donut': ['a', 'Rosquinha'], 'perfume': ['o', 'Perfume'], 'galaxy': ['a', 'Galáxia'], 'lion': ['o', 'Leão'], 'universe': ['o', 'Universo'],
  'rocket': ['o', 'Foguete'], 'fireworks': ['os', 'Fogos'], 'boxing gloves': ['as', 'Luvas de boxe'], 'corgi': ['o', 'Corgi'],
  'money gun': ['a', 'Arma de dinheiro'], 'sunglasses': ['os', 'Óculos'], 'cap': ['o', 'Boné'], 'confetti': ['o', 'Confete'],
  'hat and mustache': ['o', 'Chapéu e bigode'], 'friendship necklace': ['o', 'Colar da amizade'], 'love you': ['o', 'Te amo'],
  'thumbs up': ['o', 'Joinha'], 'weights': ['os', 'Pesos'], 'mic': ['o', 'Microfone'], 'coffee': ['o', 'Café'], 'gamepad': ['o', 'Controle'],
  'cake': ['o', 'Bolo'], 'swan': ['o', 'Cisne'], 'train': ['o', 'Trem'], 'whale diving': ['a', 'Baleia'], 'motorcycle': ['a', 'Moto'],
  'sports car': ['o', 'Carro esportivo'], 'private jet': ['o', 'Jatinho'], 'interstellar': ['o', 'Interestelar'], 'tiny diny': ['o', 'Dininho'],
  'paper crane': ['o', 'Tsuru'], 'little crown': ['a', 'Coroinha'], 'rosa': ['a', 'Rosa'], 'game controller': ['o', 'Controle'],
};
function presente(nome) {
  const k = String(nome || '').toLowerCase().trim();
  const p = PRESENTES[k];
  if (p) return { art: p[0], nome: p[1], conhecido: true };
  if (!k || k === 'gift') return { art: 'o', nome: 'presente' };
  return { art: 'o', nome: String(nome) };
}
// plural simples: Rosa -> Rosas, Coração -> Corações, Colar -> Colares
function plural(p) {
  if (!p.conhecido || p.art === 'as' || p.art === 'os') return p; // nome desconhecido (inglês): deixa como está
  const [w, ...resto] = p.nome.split(' ');
  let pw = w;
  if (/ão$/i.test(w)) pw = w.replace(/ão$/i, 'ões');
  else if (/[rz]$/i.test(w)) pw = w + 'es';
  else if (/[aeiouáéíóú]$/i.test(w)) pw = w + 's';
  else pw = w + 's';
  return { art: p.art === 'a' ? 'as' : 'os', nome: [pw, ...resto].join(' ') };
}
// nomes de arquivo possíveis para a cantoria de um presente: em inglês (como o TikTok manda) e em português
const slug = (t) => semAcento(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function slugsPresente(nome) { const p = presente(nome); return [...new Set([slug(nome), p.conhecido ? slug(p.nome) : ''].filter(Boolean))]; }
const pelo = (art) => ({ a: 'pela', o: 'pelo', as: 'pelas', os: 'pelos' }[art] || 'pelo');

// ---------------- respostas prontas aos comentários ----------------
const RESPOSTAS = [
  [/\b(oi+|ol[aá]|e a[ií]|eae|salve|opa|fala|hey|hello|hi)\b/i, ['Oi, {n}! Seja muito bem-vindo!', 'Salve, {n}! Chega mais!', 'Opa, {n}! Que bom te ver aqui!', 'Olá, {n}! Senta aí e aproveita a live!']],
  [/\bbo(m|a) (dia|tarde|noite)\b/i, ['Boa, {n}! Pra você também!', 'Opa, {n}! Tudo de bom pra você também!']],
  [/\b(te amo|amo voc[eê]|amo essa|amo a|amo o|amei|lind[ao]|fofa|fofo|perfeit[ao])\b/i, ['Ownt, também te amo, {n}!', 'Que fofo, {n}! Você é demais!', 'Para, {n}, que eu fico vermelha!']],
  [/\b(ma[cç][aã]|fruta|comida|fome|come|comer)\b/i, ['Tô com fome, {n}! Manda uma rosa que vira fruta!', 'Cada presente vira fruta pra mim, {n}!', 'Hmm, fruta! Manda mais, {n}!']],
  [/\b(cobra|cobrinha|snake|serpente)\b/i, ['Tô aqui, {n}! Sou eu a cobrinha!', 'Me chamou, {n}? Tô de olho em você!', 'Sou a cobra mais faminta da live, {n}!']],
  [/\b(grande|tamanho|cresce|crescer|gigante|enorme)\b/i, ['Quanto mais presente, mais eu cresço, {n}!', 'Vou ficar gigante, {n}! Ajuda aí!']],
  [/\b(bomba|explode|explodir|gg)\b/i, ['Nem pensa em mandar GG, {n}! Meu rabo explode!', 'Bomba não, {n}! Por favor!']],
  [/\b(kk+|haha+|rsrs+|kkk|hehe+|lol)\b/i, ['Kkkk, {n}, você é demais!', 'Hahaha, também achei, {n}!', 'Kkkk, rindo junto com você, {n}!']],
  [/\b(como|qual|quando|onde|por ?que|pq|quem)\b|\?/, ['Boa pergunta, {n}! Fica na live que você descobre!', 'Hmm, deixa eu pensar, {n}... Manda um presente que eu respondo!', 'Pergunta difícil, {n}! Mas segue que tem mais!']],
  [/\b(segui|seguindo|sigo|seguir)\b/i, ['Valeu demais, {n}! Já faz parte da família!', 'Obrigada por seguir, {n}!']],
  [/\b(tchau|fui|vou dormir|boa noite pra|at[eé] mais|flw|falou)\b/i, ['Tchau, {n}! Volta logo!', 'Até mais, {n}! Valeu por ter vindo!']],
  [/\b(top|demais|incr[ií]vel|show|massa|brabo|braba|legal|daora|da hora)\b/i, ['Valeu, {n}! Você que é top!', 'Né, {n}? Tá demais hoje!']],
];
const GENERICAS = ['Valeu pelo comentário, {n}!', 'Tô lendo tudo, {n}!', 'Fica aí, {n}, que vem fruta!', 'É isso aí, {n}!', 'Boa, {n}!', 'Hmm, interessante, {n}!'];
const RESPOSTAS_W = RESPOSTAS.map(([re, o]) => [W(re), o]);
function responder(texto, n) {
  for (const [re, opts] of RESPOSTAS_W) if (re.test(texto)) return rnd(opts).replace('{n}', n);
  return rnd(GENERICAS).replace('{n}', n);
}

const FALAS_DA_COBRA = [
  'Tô com fome! Manda uma rosa que vira fruta!', 'Curte a live que cai fruta pra mim!', 'Ninguém me segura hoje!',
  'Quem vai ser o campeão de curtidas dessa rodada?', 'Segue o perfil que eu agradeço pelo nome!', 'Cada diamante é uma fruta! Bora!',
  'Escreve no chat que eu leio tudo!', 'GG explode o meu rabo! Não faz isso comigo!', 'Olha o ranking aí em cima! Quem vai ser o primeiro?',
  'Ssssss... tô de olho em vocês!', 'Toca na tela e manda curtida pra eu crescer!',
  'Alguém aí? Escreve oi no chat!', 'Quem mandar a primeira rosa vai pro topo do ranking!', 'Tô ficando com fome de novo...',
  'Compartilha a live com um amigo!', 'Hoje eu quero ficar gigante!', 'Cadê a galera? Chama todo mundo!',
  'Cada curtida conta ponto no ranking!', 'Será que alguém consegue me fazer crescer até o fim da rodada?',
  'Eu leio todos os comentários, pode mandar!', 'Segue aí que eu falo o seu nome!', 'Que silêncio... alguém me dá uma fruta?',
  'Essa fruta tá com uma cara ótima!', 'Rosa vira fruta, fruta vira cobra grande!', 'Vem pro top 6! Tá fácil hoje!',
];

// ---------------- textos prontos para cada evento ----------------
function textoPresente(user, giftName, count, diamonds, bomba) {
  const n = nomeFalado(user); const p = presente(giftName);
  if (bomba) return rnd([`Aaai, meu rabo! ${n} mandou ${p.nome}!`, `Socorro! ${n} explodiu meu rabo com ${p.nome}!`, `Não, ${n}! ${p.nome} não! Aaai!`]);
  if (diamonds * count >= 100) return rnd([`Uau! Muito obrigada ${pelo(p.art)} ${p.nome}, ${n}! Você é incrível!`, `Meu Deus, ${n}! Que presentão! Valeu demais!`]);
  if (count > 1) { const pl = plural(p); return rnd([`Valeu ${pelo(pl.art)} ${count} ${pl.nome}, ${n}!`, `${count} ${pl.nome} de uma vez! Valeu, ${n}!`]); }
  return rnd([`Valeu ${pelo(p.art)} ${p.nome}, ${n}!`, `Obrigada ${pelo(p.art)} ${p.nome}, ${n}!`, `Hmm, fruta! Valeu, ${n}!`]);
}
const textoSeguiu = (user) => { const n = nomeFalado(user); return rnd([`Valeu pelo follow, ${n}!`, `${n} seguiu! Bem-vindo à família!`, `Obrigada por seguir, ${n}!`]); };
const textoCompartilhou = (user) => { const n = nomeFalado(user); return rnd([`Valeu por compartilhar a live, ${n}!`, `${n} compartilhou! Chama todo mundo, obrigada!`, `Obrigada por divulgar, ${n}!`]); };
const textoEntrou = (user) => { const n = nomeFalado(user); return rnd([`Bem-vindo, ${n}!`, `Chegou ${n}! Seja bem-vindo!`]); };
const textoLido = (n, t) => `${n} disse: ${t}${/[.!?]$/.test(t) ? '' : '.'}`;

return { W, PALAVROES, semAcento, setExtraProibido, proibido, limparFala, nomeFalado, podeLer, rnd, presente, plural, slug, slugsPresente, pelo,
  responder, FALAS_DA_COBRA, textoPresente, textoSeguiu, textoCompartilhou, textoEntrou, textoLido };
});
