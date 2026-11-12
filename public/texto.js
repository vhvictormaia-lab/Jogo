// Textos do Baile do Abismo: filtro de palavrões, nomes limpos e nomes dos presentes em português.
// Usado pelo servidor e pela página (modo demonstração).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Texto = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
// \b do JavaScript não entende acentos ("maçã", "você"): troca por limite de palavra Unicode
const W = (re) => new RegExp(re.source.replace(/\\b/g, '(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))'), re.flags.includes('u') ? re.flags : re.flags + 'u');
const LISTA = 'porra|porr\\w*|caralh\\w*|merda|puta|puto|putaria|putinha|fdp|vsf|vtnc|tnc|pqp|pnc|buceta|bucet\\w*|cu|cuzao|cuzão|arrombad\\w*|viad\\w*|bicha|corno|cornudo|piroca|pau|rola|foder|fode|fodase|foda|fodid\\w*|fud\\w*|desgraça\\w*|desgraca\\w*|otario\\w*|otário\\w*|idiota|imbecil|retardad\\w*|macac[oa]s?|nazi\\w*|estupr\\w*|matar|morre|suicid\\w*|sexo|sexy|nude\\w*|nudes|pelad\\w*|gostos\\w*|safad\\w*|tes[aã]o|pinto|xota|xoxota|bct|krl|crl|prr|cacet\\w*|bost\\w*|vagabund\\w*|piranh\\w*|prostitut\\w*|rapariga|quenga|punhet\\w*|siririca|boquete|chupa|chupad\\w*|penis|pênis|vagina|piru|pica|xereca|xana|babaca|cretin\\w*|escrot\\w*|nojent\\w*|lixo|fuck\\w*|shit|bitch|dick|pussy|nigg\\w*|sex';
const PALAVROES = W(new RegExp('\\b(' + LISTA + ')\\b', 'i'));
const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// mesma lista, mas com letras repetidas juntadas (porra -> pora), para pegar "porraaaa", "caaaralho"
const PALAVROES_1 = W(new RegExp('\\b(' + semAcento(LISTA).replace(/([a-z])\1+/g, '$1') + ')\\b', 'i'));
// troca truques comuns: p0rr4, c@ralho, p.o.r.r.a, p o r r a
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i' };
function variantes(t) {
  const a = semAcento(t);
  const b = a.replace(/[0134578@$!]/g, (c) => LEET[c]);
  const c = b.replace(/(^|\s)((?:[a-z][\s.\-_*]){1,}[a-z])(?=\s|$)/g, (m, ini, letras) => ini + letras.replace(/[\s.\-_*]/g, '')); // p o r r a -> porra
  const d = c.replace(/([a-z])[.\-_*]+(?=[a-z])/g, '$1'); // p.orr-a -> porra
  const e = a.replace(/[0-9_]+/g, ' '); // fdp123 -> fdp
  return [t, a, b, c, d, e];
}
// filtro extra (no servidor: palavras-proibidas.txt). Padrão: nada.
let extraProibido = () => false;
function setExtraProibido(fn) { extraProibido = typeof fn === 'function' ? fn : () => false; }
function proibido(t) {
  for (const v of variantes(t)) {
    if (PALAVROES.test(v) || PALAVROES_1.test(v.replace(/([a-z])\1+/g, '$1')) || extraProibido(v)) return true;
  }
  return false;
}
// nome que aparece na tela: sem palavrão, sem link, curto
function nomeTela(nome) {
  const n = String(nome || '').replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (!n || proibido(n) || proibido(String(nome || ''))) return 'amigo';
  return n.slice(0, 24);
}

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
  if (proibido(String(texto || ''))) return null; // testa antes de limpar (c@ralho)
  const t = limparFala(texto);
  if (t.length < 2 || t.length > 90) return null;
  if (proibido(t)) return null;
  if (/\d{6,}/.test(t)) return null; // telefones, códigos
  return t;
}
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

return { semAcento, setExtraProibido, proibido, nomeTela, limparFala, nomeFalado, podeLer, presente, plural };
});
