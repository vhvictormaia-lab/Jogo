// Motor do Baile do Abismo: quem comenta entra na roda e dança.
// Roda no servidor (server.js) e também no navegador, no modo demonstração.
// Presentes: pequeno (Rosa) = troca de roupa · 30+ moedas = toque na banda (muda a música e a dança) · 100+ moedas = vira noivos.
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.BaileMotor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const preencher = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : ''));
  const linha = (lista, v = {}) => { const [quem, acao, t] = rnd(lista); return { quem, acao, texto: preencher(t, v) }; };

  const FALAS = {
    entrou: [['palhaco', 'acenar', '{n} entrou no baile!'], ['palhaco', 'rir', 'Abre a roda que {n} chegou! Rá rá rá!'], ['serpente', 'sibilar', '{n} caiu na roda! Bora dançar!'],
      ['palhaco', 'acenar', 'Olha {n} chegando no baile! Que estilo!'], ['serpente', 'comemorar', 'Mais um na roda: {n}!']],
    varios: [['palhaco', 'comemorar', '{n} e mais {q} entraram no baile! Rá rá rá!'], ['serpente', 'comemorar', 'A roda tá enchendo! {n} e mais {q} chegaram!']],
    roupa: [['palhaco', 'rir', '{n} mandou {ap} e ganhou roupa nova!'], ['serpente', 'comemorar', 'Que chique, {n}! Roupa nova no baile!'], ['palhaco', 'acenar', 'Desfila, {n}! Roupa nova!']],
    banda: [['palhaco', 'pular', '{n} tocou na banda! Muda o ritmo, galera!'], ['serpente', 'comemorar', 'Ssss... {n} mandou trocar a música! Todo mundo dançando diferente!']],
    noivos: [['palhaco', 'voar', 'Temos noivos! {a} e {b} vão casar no abismo! Rá rá rá!'], ['serpente', 'comemorar', 'Ssss... {a} e {b}, agora são noivos! Beija, beija!']],
    seguiu: [['palhaco', 'comemorar', 'Valeu por seguir, {n}! Entrou pro baile!'], ['serpente', 'comemorar', '{n} seguiu! Agora é da família do abismo!']],
    compartilhou: [['serpente', 'comemorar', 'Valeu por compartilhar, {n}! Chama mais gente pra roda!'], ['palhaco', 'rir', '{n} compartilhou! Quanto mais gente, melhor o baile!']],
    convite: [['palhaco', 'acenar', '{n}, comenta qualquer coisa pra entrar na roda!'], ['serpente', 'sibilar', 'Oi, {n}! Escreve no chat pra dançar com a gente!']],
    chamar: [['palhaco', 'acenar', 'Comenta qualquer coisa pra entrar na roda! Rá rá rá!'], ['serpente', 'sibilar', 'Quem comentar, entra no baile! Bora!'],
      ['palhaco', 'rir', 'Manda uma rosa pra trocar de roupa! Rá rá rá!'], ['serpente', 'comemorar', 'Presente de trinta moedas toca na banda e muda a música!'],
      ['palhaco', 'voar', 'Um presentão de cem moedas e você vira noivo no altar do abismo!']],
    festa: [['palhaco', 'comemorar', '{q} curtidas! Festa no baile! Todo mundo pulando!'], ['serpente', 'comemorar', 'Ssss... {q} curtidas! Chuva de confete!']],
    rei: [['palhaco', 'voar', '{n} é o novo rei do baile! Ganhou a coroa!'], ['serpente', 'comemorar', 'Ssss... coroa nova pro {n}! Rei do baile!']],
    fimPerto: [['palhaco', 'acenar', 'Faltam cinco minutos pro fim do baile! Quem vai ser o rei?'], ['serpente', 'sibilar', 'Ssss... cinco minutos! Último chamado pra roda!']],
    fim: [['palhaco', 'voar', 'Fim do baile! O rei do baile foi {n}! Rá rá rá! Vai começar outro, comenta pra entrar!'], ['serpente', 'comemorar', 'Acabou o baile! Parabéns, {n}! Bora pro próximo, comenta pra entrar!']],
    fimSemRei: [['palhaco', 'acenar', 'Fim do baile! Já vai começar outro, comenta pra entrar na roda!']],
  };
  const MUSICAS = ['Funk do Abismo', 'Forró da Roda', 'Disco Assombrado', 'Pagodinho do Palhaço'];

  function criar(opc) {
    const F = opc.falas;
    const emitir = (m) => { try { opc.emitir({ type: 'baile', ...m }); } catch (e) {} };
    const falar = (partes, extra = {}) => { if (!cfg.falar) return; try { opc.falar && opc.falar(partes, extra); } catch (e) {} }; // baile: por padrão só música e dança
    const agora = opc.agora || (() => Date.now());
    const cfg = Object.assign({ maximo: 80, duracao: 30, noivosSeg: 50, falar: false }, opc.cfg || {});
    const nome = (u) => (F ? F.nomeFalado(u) : String(u.name || 'amigo'));
    const pres = (g, n) => { if (!F) return { art: 'o', nome: g }; const p = F.presente(g); return n > 1 ? F.plural(p) : p; };
    const roda = new Map();   // id -> dançarino
    const presentes = new Map(); // id -> moedas no baile (para o rei)
    let fimEm = 0, timer = null, musica = 0, noivos = null, rei = null, avisouFim = false, sementeN = 1;
    let ultEntrouFala = 0, filaEntrou = [], ultRoupaFala = 0, ultConvite = 0, ultChamar = 0, ultChat = 0, curtidas = 0, proxFesta = 500, ultCompart = 0;
    const semente = () => ((Math.random() * 1e9) >>> 0) ^ (sementeN++ * 2654435761 >>> 0);

    function publicoD(d) { return { id: d.id, name: d.name, avatar: d.avatar || null, roupa: d.roupa, modelo: d.modelo, rei: rei === d.id, noivo: !!(noivos && (noivos.a === d.id || noivos.b === d.id)) }; }
    function entrar(u, motivo = 'comentou') {
      if (!u || !u.id) return null;
      let d = roda.get(u.id);
      if (d) { d.ultimo = agora(); if (u.avatar) d.avatar = u.avatar; return d; }
      if (roda.size >= cfg.maximo) { // roda cheia: sai quem está parado há mais tempo (menos noivos e rei)
        let velho = null; for (const x of roda.values()) if (x.id !== rei && !(noivos && (noivos.a === x.id || noivos.b === x.id)) && (!velho || x.ultimo < velho.ultimo)) velho = x;
        if (velho) { roda.delete(velho.id); emitir({ ev: 'saiu', id: velho.id }); }
      }
      d = { id: u.id, name: u.name, avatar: u.avatar || null, roupa: semente(), modelo: Math.floor(Math.random() * 1000), entrou: agora(), ultimo: agora() };
      roda.set(u.id, d);
      emitir({ ev: 'entrou', d: publicoD(d), total: roda.size, motivo });
      filaEntrou.push(u);
      return d;
    }
    // falas de quem entrou: junta várias para não ficar repetindo
    function falarEntradas() {
      if (!filaEntrou.length || agora() - ultEntrouFala < 7000) return;
      ultEntrouFala = agora();
      const q = filaEntrou.length, u = filaEntrou[q - 1]; filaEntrou = [];
      if (q === 1) falar([linha(FALAS.entrou, { n: nome(u) })], { pri: 1, kind: 'baile-entrou', user: u });
      else falar([linha(FALAS.varios, { n: nome(u), q: q - 1 })], { pri: 1, kind: 'baile-entrou', user: u });
    }

    function chat(u, texto) {
      ultChat = agora();
      const ja = roda.has(u.id); const d = entrar(u);
      if (ja && d) { const t = F ? F.podeLer(texto) : String(texto).slice(0, 60); if (t) emitir({ ev: 'fala', id: u.id, texto: t.slice(0, 60) }); }
    }
    function trocarRoupa(d) { d.roupa = semente(); d.modelo = Math.floor(Math.random() * 1000); emitir({ ev: 'roupa', d: publicoD(d) }); }
    function presente(u, giftName, diamonds, count) {
      const coins = Math.max(1, Number(diamonds) || 1) * Math.max(1, Number(count) || 1);
      const d = entrar(u, 'presente'); if (!d) return;
      presentes.set(u.id, (presentes.get(u.id) || 0) + coins);
      verRei();
      const n = nome(u), p = pres(giftName, count), v = { n, ap: `${p.art} ${p.nome}` };
      if (coins >= 99) return virarNoivos(d, coins);
      if (coins >= 30) {
        musica = (musica + 1) % MUSICAS.length;
        emitir({ ev: 'banda', musica, nomeMusica: MUSICAS[musica], user: u, d: publicoD(d) });
        return falar([linha(FALAS.banda, v)], { pri: 3, kind: 'baile-banda', user: u });
      }
      trocarRoupa(d);
      emitir({ ev: 'presente', user: u, giftName, coins, d: publicoD(d) });
      if (agora() - ultRoupaFala > 6000) { ultRoupaFala = agora(); falar([linha(FALAS.roupa, v)], { pri: 2, kind: 'baile-roupa', user: u }); }
    }
    function virarNoivos(d, coins) {
      // par: quem comentou por último (que não seja a própria pessoa) ou alguém da roda
      let par = null; for (const x of roda.values()) if (x.id !== d.id && (!par || x.ultimo > par.ultimo)) par = x;
      if (!par) { trocarRoupa(d); return falar([{ quem: 'palhaco', acao: 'rir', texto: `${nome(d)}, cadê o par? Chama alguém pra roda que eu caso vocês! Rá rá rá!` }], { pri: 3, kind: 'baile-noivos' }); }
      noivos = { a: d.id, b: par.id, ate: agora() + cfg.noivosSeg * 1000 };
      emitir({ ev: 'noivos', a: publicoD(d), b: publicoD(par), seg: cfg.noivosSeg, coins });
      falar([linha(FALAS.noivos, { a: nome(d), b: nome(par) })], { pri: 3, kind: 'baile-noivos', user: d });
    }
    function verRei() {
      let melhor = null, m = 0; for (const [id, c] of presentes) if (roda.has(id) && c > m) { m = c; melhor = id; }
      if (melhor && melhor !== rei && m >= 10) {
        rei = melhor; const d = roda.get(melhor);
        emitir({ ev: 'rei', d: publicoD(d), moedas: m });
        falar([linha(FALAS.rei, { n: nome(d) })], { pri: 2, kind: 'baile-rei', user: d });
      }
    }
    function seguiu(u) { const d = entrar(u, 'seguiu'); emitir({ ev: 'seguiu', id: u.id, user: u }); falar([linha(FALAS.seguiu, { n: nome(u) })], { pri: 2, kind: 'baile-seguiu', user: u }); }
    function compartilhou(u) { entrar(u, 'compartilhou'); emitir({ ev: 'compartilhou', id: u.id, user: u });
      if (agora() - ultCompart > 15000) { ultCompart = agora(); falar([linha(FALAS.compartilhou, { n: nome(u) })], { pri: 2, kind: 'baile-compart', user: u }); } }
    function entrouLive(u) {
      emitir({ ev: 'chegou', user: u });
      if (!roda.has(u.id) && agora() - ultConvite > 20000) { ultConvite = agora(); falar([linha(FALAS.convite, { n: nome(u) })], { pri: 1, kind: 'baile-convite', user: u }); }
    }
    function curtir(u, n) {
      curtidas += Math.max(0, Number(n) || 0);
      if (u && u.id && roda.has(u.id)) emitir({ ev: 'curtiu', id: u.id });
      if (curtidas >= proxFesta) { const q = proxFesta; proxFesta = (Math.floor(curtidas / 500) + 1) * 500; emitir({ ev: 'festa', curtidas: q }); falar([linha(FALAS.festa, { q })], { pri: 2, kind: 'baile-festa' }); }
    }

    function tick() {
      const t = agora();
      falarEntradas();
      if (noivos && t >= noivos.ate) { emitir({ ev: 'fimNoivos', a: noivos.a, b: noivos.b }); noivos = null; }
      const resta = Math.max(0, fimEm - t);
      if (!avisouFim && resta <= 5 * 60000 && cfg.duracao > 6) { avisouFim = true; falar([linha(FALAS.fimPerto)], { pri: 2, kind: 'baile-fim' }); }
      if (resta <= 0) return fimDoBaile();
      if (t - ultChamar > 40000 && (roda.size < 8 || t - ultChat > 30000)) { ultChamar = t; falar([linha(FALAS.chamar)], { pri: 1, kind: 'baile-chamar' }); }
    }
    function fimDoBaile() {
      const d = rei && roda.get(rei);
      emitir({ ev: 'fim', rei: d ? publicoD(d) : null });
      falar([d ? linha(FALAS.fim, { n: nome(d) }) : linha(FALAS.fimSemRei)], { pri: 3, kind: 'baile-fim' });
      roda.clear(); presentes.clear(); noivos = null; rei = null; avisouFim = false;
      fimEm = agora() + cfg.duracao * 60000;
      emitir({ ev: 'novo', fim: cfg.duracao * 60 });
    }
    function iniciar() { if (timer) return; fimEm = agora() + cfg.duracao * 60000; timer = setInterval(tick, 1000); }
    function parar() { clearInterval(timer); timer = null; }
    function config(c = {}) {
      if (c.duracao) { cfg.duracao = Math.max(5, Math.min(180, Number(c.duracao) || 30)); fimEm = agora() + cfg.duracao * 60000; avisouFim = false; emitir({ ev: 'tempo', resta: cfg.duracao * 60 }); }
      if (c.falar !== undefined) cfg.falar = !!c.falar;
      if (c.maximo) cfg.maximo = Math.max(10, Math.min(150, Number(c.maximo) || 80));
      return { ...cfg };
    }
    function limpar() { roda.clear(); presentes.clear(); noivos = null; rei = null; emitir({ ev: 'limpou' }); }
    function estado() {
      return { roda: [...roda.values()].map(publicoD), resta: Math.max(0, Math.round((fimEm - agora()) / 1000)), musica, nomeMusica: MUSICAS[musica],
        noivos: noivos ? { a: noivos.a, b: noivos.b, seg: Math.max(0, Math.round((noivos.ate - agora()) / 1000)) } : null, rei, cfg: { ...cfg } };
    }
    return { iniciar, parar, config, limpar, estado, chat, presente, seguiu, compartilhou, entrou: entrouLive, curtidas: curtir, fimDoBaile,
      get rodando() { return !!timer; }, get tamanho() { return roda.size; } };
  }
  return { criar, MUSICAS };
});
