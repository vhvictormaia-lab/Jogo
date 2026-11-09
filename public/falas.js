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

// ======================= ABISMO: Palhaço do Abismo + Serpente das Trevas =======================
// Cada fala é uma lista de partes { quem: 'palhaco' | 'serpente', texto, acao }.
// acao: acenar, rir, dancar, voar, girar, cantar, susto, comemorar, pular, bote, sibilar
const P = (texto, acao) => ({ quem: 'palhaco', texto, acao });
const SE = (texto, acao) => ({ quem: 'serpente', texto, acao });
const CANTORIAS = [
  (n) => `${n} mandou presente, a serpente tá contente, o palhaço dá risada, e a live tá animada!`,
  (n) => `Lá no fundo do abismo, tem palhaço e tem serpente. ${n} mandou presente, e alegrou a gente!`,
  (n) => `Pula, pula, pipoca, o palhaço não para! ${n} é o campeão, e a serpente se prepara!`,
  (n) => `Ô ${n}, ô ${n}, você é sensacional! No abismo da alegria, sua rosa é especial!`,
  (n) => `Bate palma, bate o pé, quem mandou foi ${n}! O palhaço tá dançando, e o abismo tá contente!`,
];
const CANTORIAS_SOLTAS = [
  'Lá no fundo do abismo, mora um palhaço feliz. Manda rosa, manda curtida, que ele dança e pede bis!',
  'Sssserpente das Trevas, rainha do salão. Quem curtir a live ganha o meu coração!',
  'Um, dois, três, quem chegou agora? Segue o perfil e não vai embora!',
];
const ABISMO = {
  presente(user, giftName, count, diamonds, bomba) {
    const n = nomeFalado(user), p = presente(giftName), total = Math.max(1, diamonds) * Math.max(1, count);
    const pl = count > 1 ? plural(p) : p, g = count > 1 ? `${count} ${pl.nome}` : p.nome, pg = `${pelo(pl.art)} ${g}`;
    if (bomba) return [SE(rnd([`Aaaai! Meu rabo! ${n} mandou ${p.nome}!`, `Ssssocorro! ${n} me explodiu!`]), 'susto'), P(rnd(['Rá rá rá rá rá! Essa foi boa!', 'Kkkkkk! Bem feito, serpente!']), 'rir')];
    if (total >= 100) return [P(rnd([`Uau! ${n}, que presentão! Segura que eu vou voar!`, `Meu Deus do céu! Valeu ${pg}, ${n}! Lá vou eu!`]), 'voar'), P(F_rnd(CANTORIAS)(n), 'cantar')];
    if (total >= 30) return [P(rnd([`Que presentão, ${n}! Olha o giro!`, `Valeu ${pg}, ${n}! Gira, gira, gira!`]), 'girar'), SE(rnd([`Ssssensacional, ${n}!`, `Ssssó gente chique nesse abismo!`]), 'bote')];
    if (total >= 5) return [rnd([P(`Valeu ${pg}, ${n}! Bora dançar!`, 'dancar'), SE(`Ssssobe o som! Valeu, ${n}!`, 'dancar')])];
    return [rnd([P(`Valeu ${pg}, ${n}!`, 'acenar'), P(`Rá rá! Obrigado ${pg}, ${n}!`, 'rir'), SE(`Ssss, obrigada ${pg}, ${n}!`, 'sibilar'), P(`Olha só, ${n} mandou ${g}! Valeu!`, 'pular')])];
  },
  seguiu(user) { const n = nomeFalado(user); return [rnd([P(`Uhuul! ${n} seguiu! Bem-vindo ao abismo!`, 'comemorar'), P(`${n} agora faz parte da família do abismo!`, 'comemorar'), SE(`Ssssseja bem-vindo, ${n}! Agora você é da família!`, 'bote')])]; },
  compartilhou(user) { const n = nomeFalado(user); return [P(rnd([`Valeu por compartilhar, ${n}! Chama a galera pro abismo!`, `${n} compartilhou! Mais gente no circo!`]), 'pular')]; },
  entrou(user) { const n = nomeFalado(user); return [rnd([P(`Olha quem chegou! Oi, ${n}!`, 'acenar'), SE(`Ssss... ${n} entrou no abismo!`, 'sibilar'), P(`Seja bem-vindo, ${n}! Senta que o show vai começar!`, 'acenar'), P(`Opa, ${n}! Chegou na hora certa!`, 'pular')])]; },
  marco(total) { return [P(`Chegamos a ${total} curtidas! Uhuul! Continua curtindo!`, 'comemorar')]; },
  comentario(user, t, respostaIA) {
    const n = nomeFalado(user);
    // quem foi chamado responde; senão, sorteia
    const quem = /serpente|cobra|snake|ssss/i.test(t) ? 'serpente' : /palha[cç]o|clown/i.test(t) ? 'palhaco' : (Math.random() < 0.6 ? 'palhaco' : 'serpente');
    const leitor = Math.random() < 0.7 ? quem : (quem === 'palhaco' ? 'serpente' : 'palhaco');
    const r = respostaIA || responderAbismo(t, n, quem);
    const riso = /(kk+|haha+|rsrs+|hehe+)/i.test(t);
    return [{ quem: leitor, texto: textoLido(n, t), acao: null }, { quem, texto: r, acao: riso ? 'rir' : null }];
  },
  solta() {
    const r = Math.random();
    if (r < 0.2) return [P(F_rnd(CANTORIAS_SOLTAS), 'cantar')];
    if (r < 0.55) return F_rnd(DIALOGOS)();
    return [F_rnd(PEDIDOS)()];
  },
};
const PEDIDOS = [
  () => P('Ô galera! Manda uma rosa que eu danço!', 'dancar'), () => P('Quem curtir agora ganha um sorriso do palhaço!', 'acenar'),
  () => SE('Sssegue o perfil que eu falo o ssseu nome!', 'sibilar'), () => P('Toca na tela! Curtida é o combustível do abismo!', 'pular'),
  () => SE('Um presentinho e eu dou o bote mais lindo da live!', 'bote'), () => P('Escreve no chat que a gente lê tudo!', 'acenar'),
  () => P('Olha o ranking aí em cima! Quem vai ser o número um?', 'girar'), () => SE('Compartilha a live com os amigos... ssse tiver coragem!', 'sibilar'),
];
const DIALOGOS = [
  () => [P('Ô Serpente, tá com fome?', 'acenar'), SE('Ssssempre! Manda rosa aí, galera!', 'sibilar')],
  () => [SE('Palhaço, por que você é tão engraçado?', null), P('Porque eu moro no abismo da alegria! Rá rá rá!', 'rir')],
  () => [P('Serpente, bora dançar?', 'dancar'), SE('Sssó se a galera curtir a live!', 'dancar')],
  () => [SE('Tá muito quieto aqui...', 'sibilar'), P('Calma, Serpente! Daqui a pouco chega presente!', 'pular')],
  () => [P('Serpente, você tem medo de quê?', null), SE('De GG! Explode o meu rabo!', 'susto'), P('Rá rá rá rá!', 'rir')],
  () => [SE('Palhaço, você sabe voar?', null), P('Só quando chega presentão! Rá rá!', 'rir')],
];
const RESPOSTAS_ABISMO = [
  [/\b(oi+|ol[aá]|e a[ií]|eae|salve|opa|fala|hey)\b/i, { palhaco: ['Oi, {n}! Bem-vindo ao abismo!', 'Salve, {n}! Chega mais no circo!'], serpente: ['Sssalve, {n}!', 'Olá, {n}... ssss!'] }],
  [/\bbo(m|a) (dia|tarde|noite)\b/i, { palhaco: ['Boa pra você também, {n}!'], serpente: ['Ssss, pra você também, {n}!'] }],
  [/\b(palha[cç]o)\b/i, { palhaco: ['Me chamou, {n}? Rá rá!', 'Tô aqui, {n}! Pronto pro show!'], serpente: ['O palhaço tá aqui do lado, {n}! Ssss!'] }],
  [/\b(cobra|cobrinha|serpente|snake)\b/i, { palhaco: ['A Serpente tá de olho em você, {n}! Rá rá!'], serpente: ['Me chamou, {n}? Ssss!', 'Ssssou eu, {n}! A Serpente das Trevas!'] }],
  [/\b(medo|assust|terror|sinistro)\b/i, { palhaco: ['Medo de quê, {n}? Eu sou um amor! Rá rá rá!'], serpente: ['Ssss... medo é pouco, {n}!'] }],
  [/\b(te amo|amo voc[eê]|lind[ao]|fofa|fofo)\b/i, { palhaco: ['Ownt, também te amo, {n}!'], serpente: ['Ssss, que fofo, {n}!'] }],
  [/\b(dan[cç]a|dan[cç]ar)\b/i, { palhaco: ['Manda uma rosa que eu danço, {n}!'], serpente: ['Eu danço ssse você curtir, {n}!'] }],
  [/\b(canta|cantar|m[uú]sica)\b/i, { palhaco: ['Presentão eu canto, {n}! Rá rá!'], serpente: ['Ssssó canto com presente, {n}!'] }],
  [/(kk+|haha+|rsrs+|hehe+)/i, { palhaco: ['Rá rá rá! Riu junto, {n}!', 'Kkkk, você é dos meus, {n}!'], serpente: ['Ssss ssss ssss! Rindo junto, {n}!'] }],
  [/\b(como|qual|quando|onde|por ?que|pq|quem)\b|\?/, { palhaco: ['Boa pergunta, {n}! Fica no abismo que você descobre!'], serpente: ['Ssss... isso é ssssegredo, {n}!'] }],
  [/\b(tchau|fui|vou dormir|flw|falou)\b/i, { palhaco: ['Tchau, {n}! Volta pro abismo!'], serpente: ['Ssss, até mais, {n}!'] }],
];
const RESPOSTAS_ABISMO_W = RESPOSTAS_ABISMO.map(([re, o]) => [W(re), o]);
const GENERICAS_ABISMO = { palhaco: ['Valeu pelo comentário, {n}!', 'Rá rá! Boa, {n}!', 'É isso aí, {n}!', 'Tô lendo tudo, {n}!'], serpente: ['Ssss, interessante, {n}!', 'Ssssei, {n}!', 'Boa, {n}! Ssss!'] };
function responderAbismo(texto, n, quem) {
  for (const [re, o] of RESPOSTAS_ABISMO_W) if (re.test(texto)) return rnd(o[quem]).replace('{n}', n);
  return rnd(GENERICAS_ABISMO[quem]).replace('{n}', n);
}
const F_rnd = (a) => a[Math.floor(Math.random() * a.length)];

return { W, PALAVROES, semAcento, setExtraProibido, proibido, limparFala, nomeFalado, podeLer, rnd, presente, plural, slug, slugsPresente, pelo,
  responder, FALAS_DA_COBRA, textoPresente, textoSeguiu, textoCompartilhou, textoEntrou, textoLido, ABISMO, responderAbismo };
});
