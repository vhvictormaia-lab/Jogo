// Motor do Baile do Abismo: quem comenta entra na roda e dança.
// Roda no servidor (server.js) e também no navegador, no modo demonstração.
// Regras:
//  - 35 pessoas na roda (muda no painel). Lotou: a tela pede "continue comentando" e quem comentar quando abrir vaga (no próximo baile) entra.
//  - Cada baile dura 5 minutos (muda no painel). No fim tem o casamento e começa outro.
//  - Comentou ou compartilhou: entra na roda. Presente: aparece mais na tela (30 ou mais também toca na banda).
//  - Todo presente soma moedas: quem mais mandou no baile vira o NOIVO (bonecos masculinos) ou a NOIVA (femininos).
//  - Noivo e noiva que ainda estiverem na live (deram sinal nos últimos 10 minutos) entram direto no próximo baile.
//  - Comentar "menina" ou "menino" troca o tipo de boneco da pessoa.
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.BaileMotor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MUSICAS = ['Funk do Abismo', 'Forró da Roda', 'Disco Assombrado', 'Pagodinho do Palhaço'];
  const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // palpite pelo apelido (a pessoa corrige comentando "menina" ou "menino")
  const FEM = new Set(['carol', 'raquel', 'isabel', 'beatriz', 'alice', 'gabi', 'lari', 'mari', 'manu', 'yasmin', 'jasmin', 'helen', 'ellen', 'ester', 'rute', 'liz', 'lis', 'thais', 'tais',
    'ingrid', 'miriam', 'sarah', 'nicole', 'michele', 'kelly', 'jenifer', 'jennifer', 'karen', 'luiza', 'lu', 'dani', 'fe', 'ju', 'bel', 'nat', 'cris', 'evelyn', 'kauane', 'ketlyn', 'kemily', 'sofie', 'rafaela', 'raissa', 'emily', 'emilly', 'agnes', 'ines', 'mel', 'rayane', 'rayssa', 'ane', 'jaqueline', 'aline', 'denise', 'elaine', 'eliane', 'simone', 'viviane', 'tatiane', 'cristiane', 'daiane', 'gisele', 'adriele', 'caroline', 'stefany', 'tiffany', 'mirele', 'mirelly', 'kailane', 'kamille', 'camille', 'heloise', 'heloisa', 'clarice', 'debora', 'rose', 'sue', 'joyce', 'grace', 'leticia']);
  const MASC_A = new Set(['luca', 'joshua', 'nikita', 'juca', 'bira', 'jota', 'kaka', 'jonata', 'garcia', 'costa', 'souza', 'sousa', 'silva', 'rocha', 'mota', 'moura', 'ota', 'zeca', 'tica', 'naldinha']);
  function palpiteSexo(nome) {
    const p = semAcento(nome).replace(/[^a-z ]+/g, ' ').trim().split(/\s+/)[0] || '';
    if (!p) return Math.random() < 0.5 ? 'f' : 'm';
    if (FEM.has(p)) return 'f';
    if (/a$/.test(p) && !MASC_A.has(p)) return 'f';
    return 'm';
  }
  const RE_F = /^(eu\s+)?(sou\s+)?(uma\s+)?(menina|mulher|garota|feminino|feminina|noiva)(\s*!*)$/;
  const RE_M = /^(eu\s+)?(sou\s+)?(um\s+)?(menino|homem|garoto|masculino|noivo|rapaz)(\s*!*)$/;
  function comandoSexo(texto) {
    const t = semAcento(texto).replace(/[^a-z\s!]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 25) return null;
    if (RE_F.test(t)) return 'f';
    if (RE_M.test(t)) return 'm';
    return null;
  }

  function criar(opc) {
    const T = opc.texto || null;
    const emitir = (m) => { try { opc.emitir({ type: 'baile', ...m }); } catch (e) {} };
    const agora = opc.agora || (() => Date.now());
    const cfg = Object.assign({ maximo: 30, duracao: 5, ativoMin: 10, intervalo: 12, vipExtra: 10 }, opc.cfg || {});
    const roda = new Map();     // id -> dançarino
    const moedas = new Map();   // id -> moedas mandadas neste baile
    const sexo = new Map();     // id -> 'm' | 'f' (vale para os próximos bailes)
    const visto = new Map();    // id -> último sinal de vida (comentou, curtiu, presente...)
    const pessoas = new Map();  // id -> {id, name, avatar} mais recente
    let noivo = null, noiva = null, fimEm = 0, timer = null, musica = 0, pausaAte = 0, casalAnterior = [];
    let sementeN = 1, curtidas = 0, proxFesta = 500;
    const semente = () => (((Math.random() * 1e9) >>> 0) ^ ((sementeN++ * 2654435761) >>> 0)) >>> 0;
    const limparNome = (u) => (T ? T.limparFala(u.name).slice(0, 24) || 'amigo' : String(u.name || 'amigo').slice(0, 24));

    function sinal(u) {
      if (!u || !u.id) return;
      visto.set(u.id, agora());
      const p = pessoas.get(u.id) || { id: u.id };
      p.name = u.name || p.name; if (u.avatar) p.avatar = u.avatar; pessoas.set(u.id, p);
      const d = roda.get(u.id); if (d) { d.ultimo = agora(); if (u.avatar) d.avatar = u.avatar; }
    }
    const sexoDe = (u) => { if (!sexo.has(u.id)) sexo.set(u.id, palpiteSexo(u.name)); return sexo.get(u.id); };
    const ativo = (id) => agora() - (visto.get(id) || 0) <= cfg.ativoMin * 60000;
    function publicoD(d) {
      return { id: d.id, name: d.name, avatar: d.avatar || null, roupa: d.roupa, modelo: d.modelo, sexo: sexo.get(d.id) || 'm',
        par: d.id === noivo ? 'noivo' : d.id === noiva ? 'noiva' : null, moedas: moedas.get(d.id) || 0, fala: d.fala || null };
    }
    const lotado = (vip) => roda.size >= cfg.maximo + (vip ? cfg.vipExtra : 0);
    // roda cheia (ou casamento acontecendo): avisa a tela "continue comentando" — sem fila
    let ultLotado = 0;
    function lotou(u, motivo) {
      if (agora() - ultLotado > 4000) { ultLotado = agora(); emitir({ ev: 'lotado', motivo, user: { id: u.id, name: u.name, avatar: u.avatar || null } }); }
      return null;
    }
    function entrar(u, motivo = 'comentou', vip = false, fala = null) {
      if (!u || !u.id) return null;
      const ja = roda.get(u.id); if (ja) return ja;
      if (pausaAte) return lotou(u, 'intervalo');
      if (lotado(vip)) return lotou(u, 'lotou');
      sexoDe(u);
      const d = { id: u.id, name: u.name, avatar: u.avatar || null, roupa: semente(), modelo: Math.floor(Math.random() * 1000), entrou: agora(), ultimo: agora(), fala };
      roda.set(u.id, d);
      emitir({ ev: 'entrou', d: publicoD(d), total: roda.size, max: cfg.maximo, motivo });
      return d;
    }

    function chat(u, texto) {
      sinal(u);
      const s = comandoSexo(texto);
      if (s && sexo.get(u.id) !== s) {
        sexo.set(u.id, s);
        const d = roda.get(u.id);
        if (d) { d.modelo = Math.floor(Math.random() * 1000); emitir({ ev: 'sexo', d: publicoD(d) }); verNoivos(); return; }
      }
      // o comentário aparece em cima do boneco no lugar do nome (só o que passa no filtro)
      const t0 = T ? T.podeLer(texto) : String(texto).slice(0, 60); const t = t0 ? t0.slice(0, 60) : null;
      const ja = roda.has(u.id); const d = entrar(u, 'comentou', false, t);
      if (ja && d && t) { d.fala = t; emitir({ ev: 'fala', id: u.id, texto: t }); }
    }
    function trocarRoupa(d) { d.roupa = semente(); d.modelo = Math.floor(Math.random() * 1000); emitir({ ev: 'roupa', d: publicoD(d) }); }
    function presente(u, giftName, diamonds, count) {
      sinal(u);
      const coins = Math.max(1, Number(diamonds) || 1) * Math.max(1, Number(count) || 1);
      moedas.set(u.id, (moedas.get(u.id) || 0) + coins);
      const d = entrar(u, 'presente', true); // presente entra mesmo com a roda cheia (até 10 a mais)
      const user = { id: u.id, name: u.name, avatar: u.avatar || null };
      // presente = aparece mais na tela (quanto mais moedas, mais tempo e mais vezes). 30 ou mais também toca na banda.
      if (d && coins >= 30) { musica = (musica + 1) % MUSICAS.length; emitir({ ev: 'banda', musica, nomeMusica: MUSICAS[musica], user, coins, d: publicoD(d) }); }
      emitir({ ev: 'presente', user, giftName, coins, total: moedas.get(u.id), naRoda: !!d, d: d ? publicoD(d) : null });
      // (troca de roupa e noivo/noiva desligados por enquanto)
    }
    // noivo = quem mais mandou presente entre os bonecos masculinos; noiva = entre os femininos
    function verNoivos() {
      let m = null, f = null, mm = 0, mf = 0;
      for (const d of roda.values()) {
        const c = moedas.get(d.id) || 0; if (!c) continue;
        if ((sexo.get(d.id) || 'm') === 'f') { if (c > mf) { mf = c; f = d.id; } } else if (c > mm) { mm = c; m = d.id; }
      }
      if (m === noivo && f === noiva) { emitirPlacar(); return; }
      const novoNoivo = m !== noivo ? m : null, novaNoiva = f !== noiva ? f : null;
      noivo = m; noiva = f;
      emitir({ ev: 'noivos', noivo: noivo ? publicoD(roda.get(noivo)) : null, noiva: noiva ? publicoD(roda.get(noiva)) : null, novoNoivo, novaNoiva });
    }
    let ultPlacar = 0;
    function emitirPlacar() { if (agora() - ultPlacar < 1500) return; ultPlacar = agora();
      emitir({ ev: 'placar', noivo: noivo ? publicoD(roda.get(noivo)) : null, noiva: noiva ? publicoD(roda.get(noiva)) : null }); }
    function seguiu(u) { sinal(u); const d = entrar(u, 'seguiu'); emitir({ ev: 'seguiu', id: u.id, user: u, naRoda: !!d }); }
    function compartilhou(u) { sinal(u); const d = entrar(u, 'compartilhou'); emitir({ ev: 'compartilhou', id: u.id, user: u, naRoda: !!d }); }
    function entrouLive(u) { sinal(u); emitir({ ev: 'chegou', user: u }); }
    function curtir(u, n) {
      if (u) sinal(u);
      curtidas += Math.max(0, Number(n) || 0);
      if (u && u.id && roda.has(u.id)) emitir({ ev: 'curtiu', id: u.id });
      if (curtidas >= proxFesta) { const q = proxFesta; proxFesta = (Math.floor(curtidas / 500) + 1) * 500; emitir({ ev: 'festa', curtidas: q }); }
    }

    function tick() {
      const t = agora();
      if (pausaAte) { if (t >= pausaAte) novoBaile(); return; }
      if (fimEm - t <= 0) fimDoBaile();
    }
    function fimDoBaile() {
      if (pausaAte) return;
      const n = noivo && roda.get(noivo), a = noiva && roda.get(noiva);
      casalAnterior = [n, a].filter(Boolean).map((d) => ({ id: d.id, name: d.name, avatar: d.avatar }));
      emitir({ ev: 'fim', noivo: n ? publicoD(n) : null, noiva: a ? publicoD(a) : null, intervalo: cfg.intervalo });
      pausaAte = agora() + cfg.intervalo * 1000;
    }
    function novoBaile() {
      pausaAte = 0;
      roda.clear(); moedas.clear(); noivo = null; noiva = null;
      fimEm = agora() + cfg.duracao * 60000;
      emitir({ ev: 'novo', fim: cfg.duracao * 60 });
      // o casal do baile anterior (se ainda estiver na live) já entra; o resto entra comentando
      const voltaram = [];
      for (const c of casalAnterior) if (ativo(c.id)) { const p = pessoas.get(c.id) || c; if (entrar(p, 'noivos')) voltaram.push({ id: p.id, name: p.name, avatar: p.avatar || null }); }
      if (voltaram.length) emitir({ ev: 'voltaram', quem: voltaram });
      casalAnterior = [];
    }
    function iniciar() { if (timer) return; fimEm = agora() + cfg.duracao * 60000; timer = setInterval(tick, 1000); }
    function parar() { clearInterval(timer); timer = null; }
    function config(c = {}) {
      if (c.duracao) { cfg.duracao = Math.max(1, Math.min(60, Number(c.duracao) || 5)); if (!pausaAte) { fimEm = agora() + cfg.duracao * 60000; emitir({ ev: 'tempo', resta: cfg.duracao * 60 }); } }
      if (c.maximo) cfg.maximo = Math.max(5, Math.min(80, Number(c.maximo) || 30));
      return { ...cfg };
    }
    function limpar() { roda.clear(); moedas.clear(); noivo = null; noiva = null; emitir({ ev: 'limpou' }); }
    function estado() {
      return { roda: [...roda.values()].map(publicoD),
        resta: pausaAte ? 0 : Math.max(0, Math.round((fimEm - agora()) / 1000)), intervalo: !!pausaAte, musica, nomeMusica: MUSICAS[musica],
        noivo: noivo && roda.get(noivo) ? publicoD(roda.get(noivo)) : null, noiva: noiva && roda.get(noiva) ? publicoD(roda.get(noiva)) : null, cfg: { ...cfg } };
    }
    return { iniciar, parar, config, limpar, estado, chat, presente, seguiu, compartilhou, entrou: entrouLive, curtidas: curtir, fimDoBaile,
      get rodando() { return !!timer; }, get tamanho() { return roda.size; } };
  }
  return { criar, MUSICAS, palpiteSexo, comandoSexo };
});
