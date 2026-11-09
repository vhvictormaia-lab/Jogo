// Motor do Quiz do Abismo (adivinhe pelo emoji).
// Roda no servidor (server.js) e também no navegador, no modo demonstração.
// Cuida de: rodadas, dicas, quem acertou, sequência, presentes (dica / dobro / bônus), placar do dia/semana/geral e as falas.
// Inspirado no Emoji Quiz Live (github.com/sonlamdev/emoji-quiz-tiktok-live, licença MIT).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.QuizMotor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const semAc = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const norm = (s) => semAc(s).replace(/[^a-z0-9]/g, '');
  const ARTIGO = /^(o|a|os|as|um|uma) /;
  const ehLetra = (c) => /[\p{L}\p{N}]/u.test(c);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const embaralhar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function preparar(q) {
    if (q._v) return q;
    const v = new Set();
    for (const t of [q.a, ...(q.alt || [])]) {
      const base = semAc(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      v.add(norm(base)); v.add(norm(base.replace(ARTIGO, '')));
    }
    q._v = [...v].filter(Boolean);
    q._chars = [...q.a];
    q._letras = q._chars.map((c, i) => (ehLetra(c) ? i : -1)).filter((i) => i >= 0);
    return q;
  }
  function acertou(texto, q) {
    const t = norm(texto); if (!t) return false;
    return q._v.some((n) => t === n || (n.length >= 5 && t.includes(n)));
  }

  const diaDe = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const semanaDe = (d = new Date()) => { const m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return diaDe(m); };

  function criar(opc) {
    const F = opc.falas;                         // falas.js (nomes falados, presentes em português)
    const emitir = (m) => { try { opc.emitir({ type: 'quiz', ...m }); } catch (e) {} };
    const falar = (partes, extra = {}) => { try { opc.falar && opc.falar(partes, extra); } catch (e) {} };
    const agora = opc.agora || (() => Date.now());
    const cfg = Object.assign({ tempo: 30, revelar: 7, maxAcertos: 3, pts: [10, 6, 4], seqMin: 3, cats: null, placar: 'dia' }, opc.cfg || {});
    const perguntas = (opc.perguntas || []).map(preparar);
    let db = Object.assign({ geral: {}, dias: {}, semanas: {} }, opc.placar || {});
    const jog = new Map();                      // id -> { seq, ult, dobro }
    const st = { fase: 'parado', n: 0, q: null, ini: 0, fim: 0, fecharEm: 0, acertos: [], abertos: new Set(), bonus: 1, bonusDe: null, proxBonus: null, deck: [], ultSeg: -1, dicaTempo: 0 };
    let top1 = null, ultTop1Fala = 0, timer = null, ultFalaPresente = 0, ultBoasVindas = 0, ctaIdx = 0;
    const nome = (u) => (F ? F.nomeFalado(u) : String(u.name || 'amigo'));
    const pres = (g, n) => { if (!F) return { art: 'o', nome: g }; const p = F.presente(g); return n > 1 ? F.plural(p) : p; };
    const jogador = (u) => { let j = jog.get(u.id); if (!j) { j = { seq: 0, ult: -9, dobro: 0 }; jog.set(u.id, j); } return j; };

    // ---------- placar (dia / semana / geral) ----------
    function balde(modo) {
      if (modo === 'geral') return db.geral;
      if (modo === 'semana') return (db.semanas[semanaDe()] ||= {});
      return (db.dias[diaDe()] ||= {});
    }
    function top(modo = cfg.placar, n = 7) {
      return Object.entries(balde(modo)).sort((a, b) => b[1].pts - a[1].pts).slice(0, n)
        .map(([id, s]) => ({ id, name: s.name, avatar: s.avatar || null, pts: s.pts, seq: (jog.get(id) || {}).seq || 0, ult: (jog.get(id) || {}).ult || -9 }));
    }
    function limparVelhos() { // guarda só os últimos 14 dias e 8 semanas
      const d = Object.keys(db.dias).sort(); while (d.length > 14) delete db.dias[d.shift()];
      const s = Object.keys(db.semanas).sort(); while (s.length > 8) delete db.semanas[s.shift()];
    }
    function somar(u, ganho, falarTop = false) {
      if (!(ganho > 0) || !u || !u.id) return;
      for (const b of [db.geral, balde('semana'), balde('dia')]) {
        const s = (b[u.id] ||= { name: u.name, avatar: null, pts: 0 });
        s.name = u.name || s.name; if (u.avatar) s.avatar = u.avatar; s.pts += ganho;
      }
      limparVelhos(); opc.salvar && opc.salvar(db);
      const t = top();
      emitir({ ev: 'placar', modo: cfg.placar, top: t, bump: u.id, n: st.n });
      if (t[0] && t[0].id !== top1) {
        const antes = top1; top1 = t[0].id;
        if (antes && t[0].pts >= 20 && agora() - ultTop1Fala > 30000) { ultTop1Fala = agora(); emitir({ ev: 'top1', user: t[0] }); if (falarTop) falar([{ quem: 'palhaco', acao: 'comemorar', texto: rnd([`Rá rá rá! ${nome(t[0])} agora é o número um do abismo!`, `Temos um novo rei do abismo: ${nome(t[0])}!`]) }], { pri: 2, kind: 'quiz-top' }); }
      }
    }

    // ---------- letras abertas (dicas) ----------
    function mascara() {
      const q = st.q; if (!q) return [];
      const palavras = []; let atual = [];
      q._chars.forEach((c, i) => {
        if (/\s/.test(c)) { if (atual.length) palavras.push(atual); atual = []; return; }
        atual.push(!ehLetra(c) || st.abertos.has(i) || st.fase === 'revelar' ? c.toUpperCase() : '');
      });
      if (atual.length) palavras.push(atual);
      return palavras;
    }
    const fechadas = () => st.q._letras.filter((i) => !st.abertos.has(i));
    function abrir(qtd, primeiras = false) {
      const q = st.q; if (!q) return 0;
      const limite = Math.max(1, Math.ceil(q._letras.length * 0.3)); // sempre sobra pelo menos 30% escondido
      let n = 0;
      if (primeiras) q._chars.forEach((c, i) => { if (ehLetra(c) && (i === 0 || /\s/.test(q._chars[i - 1])) && fechadas().length > limite) { st.abertos.add(i); n++; } });
      while (n < qtd && fechadas().length > limite) { st.abertos.add(rnd(fechadas())); n++; }
      return n;
    }

    // ---------- rodada ----------
    function sortear() {
      if (!st.deck.length) {
        const ok = perguntas.filter((q) => !cfg.cats || !cfg.cats.length || cfg.cats.includes(q.c));
        st.deck = embaralhar((ok.length ? ok : perguntas).slice());
      }
      return st.deck.pop();
    }
    function proxima() {
      st.q = sortear(); st.n++; st.fase = 'pergunta'; st.acertos = []; st.abertos = new Set(); st.fecharEm = 0; st.dicaTempo = 0;
      st.bonus = st.proxBonus ? 3 : 1; st.bonusDe = st.proxBonus; st.proxBonus = null;
      st.ini = agora(); st.fim = st.ini + cfg.tempo * 1000; st.ultSeg = -1;
      emitir({ ev: 'pergunta', ...publico() });
      const cat = st.q.c.toLowerCase();
      const linhas = st.bonus > 1
        ? [{ quem: 'palhaco', acao: 'rir', texto: `Pergunta bônus${st.bonusDe ? ' do ' + nome(st.bonusDe) : ''}! Vale o triplo! ${st.q.c}!` }]
        : [rnd([
          { quem: 'palhaco', acao: 'acenar', texto: rnd([`Pergunta ${st.n}! ${st.q.c}!`, `Lá vem a pergunta ${st.n}! Categoria ${cat}!`, `Que ${singular(cat)} é esse? Escreve no chat!`]) },
          { quem: 'serpente', acao: 'sibilar', texto: rnd([`Ssss... pergunta ${st.n}. ${st.q.c}.`, `Ssss... adivinha esse, se for capaz. ${st.q.c}!`]) },
        ])];
      falar(linhas, { pri: 3, kind: 'quiz-pergunta', limpar: true });
    }
    const singular = (c) => ({ filmes: 'filme', 'séries e novelas': 'série', músicas: 'música', ditados: 'ditado', expressões: 'expressão', comidas: 'comida', lugares: 'lugar', futebol: 'time' }[c] || 'coisa');
    function revelar() {
      st.fase = 'revelar'; st.fim = agora() + cfg.revelar * 1000;
      emitir({ ev: 'revelar', ...publico(), resposta: st.q.a });
      if (!st.acertos.length) falar([{ quem: 'serpente', acao: 'bote', texto: rnd([`Ssss... ninguém acertou! Era ${st.q.a}.`, `Ninguém? Ssss... a resposta era ${st.q.a}.`, `Que vergonha, ssss... era ${st.q.a}!`]) }], { pri: 3, kind: 'quiz-revelar', limpar: true });
      else if (st.n % 3 === 0) cta();
    }
    // chamada pra presente/seguir (a cada 3 perguntas)
    const CTAS = [
      { quem: 'palhaco', acao: 'rir', texto: 'Tá difícil? Manda uma rosa que eu abro uma letra pra todo mundo! Rá rá rá!' },
      { quem: 'serpente', acao: 'sibilar', texto: 'Ssss... quem mandar uma rosquinha ganha pontos em dobro nas próximas três!' },
      { quem: 'palhaco', acao: 'comemorar', texto: 'Um presentão de cem moedas libera a pergunta bônus valendo o triplo!' },
      { quem: 'serpente', acao: 'sibilar', texto: 'Ssss... segue o perfil pra jogar com a gente todo dia no abismo.' },
      { quem: 'palhaco', acao: 'acenar', texto: 'Acertou três seguidas? Seus pontos dobram! Não erra, hein!' },
    ];
    function cta() { falar([CTAS[ctaIdx++ % CTAS.length]], { pri: 1, kind: 'quiz-cta' }); }

    function tick() {
      const t = agora();
      if (st.fase === 'pergunta') {
        if (st.fecharEm && t >= st.fecharEm) return revelar();
        const restante = Math.max(0, Math.ceil((st.fim - t) / 1000));
        const passou = (t - st.ini) / (cfg.tempo * 1000);
        if (st.dicaTempo < 1 && passou >= 0.4) { st.dicaTempo = 1; if (abrir(0, true)) emitir({ ev: 'dica', mascara: mascara(), motivo: null }); }
        if (st.dicaTempo < 2 && passou >= 0.7) { st.dicaTempo = 2; if (abrir(Math.ceil(st.q._letras.length * 0.2))) emitir({ ev: 'dica', mascara: mascara(), motivo: null }); }
        if (restante !== st.ultSeg) { st.ultSeg = restante; emitir({ ev: 'tick', fase: 'pergunta', restante, tempo: cfg.tempo }); }
        if (t >= st.fim) revelar();
      } else if (st.fase === 'revelar' && t >= st.fim) proxima();
    }

    function publico() {
      return { fase: st.fase, n: st.n, cat: st.q ? st.q.c : '', e: st.q ? st.q.e : '', mascara: mascara(), tempo: cfg.tempo,
        restante: Math.max(0, Math.ceil((st.fim - agora()) / 1000)), bonus: st.bonus, bonusDe: st.bonusDe,
        acertos: st.acertos, resposta: st.fase === 'revelar' && st.q ? st.q.a : null };
    }

    // ---------- eventos da live ----------
    function chat(u, texto) {
      if (st.fase !== 'pergunta' || !st.q) { emitir({ ev: 'chat', user: u, texto: String(texto).slice(0, 80), ok: false }); return false; }
      if (st.acertos.some((a) => a.id === u.id)) return true;
      if (!acertou(texto, st.q)) { emitir({ ev: 'chat', user: u, texto: String(texto).slice(0, 80), ok: false }); return false; }
      const pos = st.acertos.length; if (pos >= cfg.maxAcertos) return true;
      const j = jogador(u);
      j.seq = j.ult === st.n - 1 ? j.seq + 1 : 1; j.ult = st.n;
      const fogo = j.seq >= cfg.seqMin, dobro = j.dobro > 0; if (dobro) j.dobro--;
      const mult = (fogo ? 2 : 1) * (dobro ? 2 : 1) * st.bonus;
      const ganho = cfg.pts[pos] * mult;
      const rapido = agora() - st.ini <= 4000;
      const a = { id: u.id, name: u.name, avatar: u.avatar || null, ganho, pos, seq: j.seq, mult, rapido, dobro };
      st.acertos.push(a);
      emitir({ ev: 'chat', user: u, texto: '✅ acertou!', ok: true });
      emitir({ ev: 'acerto', ...a, user: u });
      const n = nome(u);
      if (j.seq >= cfg.seqMin && (j.seq === cfg.seqMin || j.seq === 5 || j.seq % 5 === 0))
        falar([{ quem: 'serpente', acao: 'sibilar', texto: rnd([`Ssss... ${n} está pegando fogo! ${j.seq} seguidas! Pontos em dobro!`, `${n} não erra uma! ${j.seq} seguidas! Ssss...`]) }], { pri: 2, kind: 'quiz-fogo', user: u });
      else if (pos === 0) falar([{ quem: 'palhaco', acao: rapido ? 'pular' : 'rir', texto: rapido ? rnd([`Rápido demais! ${n} acertou!`, `Que velocidade, ${n}!`]) : rnd([`Rá rá rá! ${n} acertou primeiro!`, `${n} matou a charada!`, `Boa, ${n}! Era isso mesmo!`]) }], { pri: 2, kind: 'quiz-acerto', user: u });
      somar(u, ganho, true);
      if (st.acertos.length >= cfg.maxAcertos) st.fecharEm = agora() + 900;
      return true;
    }

    function presente(u, giftName, diamonds, count) {
      const coins = Math.max(1, Number(diamonds) || 1) * Math.max(1, Number(count) || 1);
      try { return presente_(u, giftName, coins, count); } finally { somar(u, coins * 2); }
    }
    function presente_(u, giftName, coins, count) {
      const n = nome(u), p = pres(giftName, count), pn = p.nome;
      const j = jogador(u);
      if (coins >= 99) {
        st.proxBonus = u;
        emitir({ ev: 'presente', tipo: 'bonus', user: u, giftName, coins, pts: coins * 2 });
        return falar([{ quem: 'palhaco', acao: 'voar', texto: `Rá rá rá! ${n} mandou ${p.art} ${pn}! A próxima pergunta vale o triplo!` },
          { quem: 'serpente', acao: 'comemorar', texto: `Ssss... que presentão!` }], { pri: 3, kind: 'quiz-presente', user: u });
      }
      if (coins >= 30) {
        j.dobro = 3;
        emitir({ ev: 'presente', tipo: 'dobro', user: u, giftName, coins, pts: coins * 2 });
        return falar([{ quem: 'serpente', acao: 'comemorar', texto: `Ssss... ${n} mandou ${p.art} ${pn} e ganhou pontos em dobro nas próximas três!` }], { pri: 3, kind: 'quiz-presente', user: u });
      }
      // presentes pequenos (Rosa etc.): abre letras da resposta
      const abriu = st.fase === 'pergunta' && !st.fecharEm ? abrir(Math.min(2, Math.max(1, Math.floor(count) || 1))) : 0;
      emitir({ ev: 'presente', tipo: abriu ? 'dica' : 'pontos', user: u, giftName, coins, pts: coins * 2 });
      if (abriu) emitir({ ev: 'dica', mascara: mascara(), motivo: { user: u, giftName } });
      if (agora() - ultFalaPresente < 5000) return; ultFalaPresente = agora();
      falar([{ quem: 'palhaco', acao: abriu ? 'rir' : 'acenar', texto: abriu ? rnd([`${n} mandou ${p.art} ${pn}! Lá vai uma dica!`, `Valeu, ${n}! Abri uma letra pra galera!`]) : `Valeu ${F ? F.pelo(p.art) : 'pelo'} ${pn}, ${n}!` }], { pri: 2, kind: 'quiz-presente', user: u });
    }
    function seguiu(u) {
      somar(u, 5); emitir({ ev: 'seguiu', user: u });
      falar([{ quem: rnd(['palhaco', 'serpente']), acao: 'comemorar', texto: rnd([`Valeu por seguir, ${nome(u)}! Mais cinco pontos!`, `${nome(u)} agora faz parte do abismo!`]) }], { pri: 2, kind: 'quiz-seguiu', user: u });
    }
    function compartilhou(u) { somar(u, 5); emitir({ ev: 'compartilhou', user: u }); }
    function entrou(u) {
      emitir({ ev: 'entrou', user: u });
      if (agora() - ultBoasVindas < 25000) return; ultBoasVindas = agora();
      falar([{ quem: rnd(['palhaco', 'serpente']), acao: 'acenar', texto: rnd([`Bem-vindo ao abismo, ${nome(u)}! Responde no chat!`, `${nome(u)} chegou! Escreve a resposta no chat pra pontuar!`]) }], { pri: 1, kind: 'quiz-entrou', user: u });
    }

    // ---------- controle ----------
    function iniciar() { if (timer) return; if (st.fase === 'parado') proxima(); timer = setInterval(tick, 200); const t = top(); top1 = t[0] ? t[0].id : null; }
    function parar() { clearInterval(timer); timer = null; st.fase = 'parado'; emitir({ ev: 'parado' }); }
    function pular() { if (st.fase === 'pergunta') revelar(); else if (st.fase === 'revelar') proxima(); }
    function config(c = {}) {
      if (c.tempo) cfg.tempo = Math.max(10, Math.min(90, Number(c.tempo) || 30));
      if ('cats' in c) { cfg.cats = Array.isArray(c.cats) && c.cats.length ? c.cats : null; st.deck = []; }
      if (c.placar && ['dia', 'semana', 'geral'].includes(c.placar)) { cfg.placar = c.placar; const t = top(); top1 = t[0] ? t[0].id : null; emitir({ ev: 'placar', modo: cfg.placar, top: t }); }
      return { ...cfg };
    }
    function zerar(modo = cfg.placar) {
      if (modo === 'geral') db.geral = {}; else if (modo === 'semana') db.semanas[semanaDe()] = {}; else db.dias[diaDe()] = {};
      jog.clear(); top1 = null; opc.salvar && opc.salvar(db); emitir({ ev: 'placar', modo: cfg.placar, top: top() });
    }
    function campeao(modo = cfg.placar) {
      const t = top(modo, 3); emitir({ ev: 'campeao', modo, top: t });
      if (t[0]) falar([{ quem: 'palhaco', acao: 'voar', texto: `O campeão ${modo === 'geral' ? 'de todos os tempos' : modo === 'semana' ? 'da semana' : 'de hoje'} é ${nome(t[0])}, com ${t[0].pts} pontos! Rá rá rá!` }], { pri: 3, kind: 'quiz-campeao' });
      return t;
    }
    function estado() { return { ...publico(), placar: { modo: cfg.placar, top: top() }, cfg: { ...cfg }, categorias: [...new Set(perguntas.map((q) => q.c))] }; }
    const respostaAtual = () => (st.fase === 'pergunta' && st.q ? st.q.a : null);

    return { iniciar, parar, pular, config, zerar, campeao, estado, chat, presente, seguiu, compartilhou, entrou, respostaAtual, top,
      get rodando() { return !!timer; } };
  }

  return { criar, acertou: (t, q) => acertou(t, preparar(q)), norm };
});
