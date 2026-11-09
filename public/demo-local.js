// Modo demonstração sem servidor (ex.: página hospedada para mostrar o jogo).
// Faz no navegador o que o server.js faria: pontos do TOP 6, bombas, falas da cobra
// (com a voz do próprio celular/computador) e frases soltas quando está tudo parado.
// No PC, com o server.js rodando, este arquivo não faz nada.
(function () {
  'use strict';
  const F = window.Falas;
  if (!F) return;

  const PTS = { diamante: 100, seguir: 500, curtida: 10, comentario: 20, compartilhar: 200 };
  const BOMBAS = ['gg', 'fireworks', 'boxing gloves', 'rocket'];
  const pontos = new Map();
  const cooldown = new Map();
  let entregar = null, seq = 0, ultimaFala = Date.now(), ultimaResposta = 0;
  const recentes = [];

  function top6() { return [...pontos.values()].sort((a, b) => b.pts - a.pts).slice(0, 6); }
  function somar(user, pts) {
    const cur = pontos.get(user.id) || { id: user.id, name: user.name, avatar: user.avatar || null, pts: 0 };
    cur.pts += pts; cur.name = user.name; if (user.avatar) cur.avatar = user.avatar;
    pontos.set(user.id, cur);
    entregar({ type: 'rank', top: top6() });
  }
  const abismo = () => window.__demoLocal && window.__demoLocal.modo === 'abismo';
  // texto simples (cobrinha) ou lista de partes { quem, texto, acao } (abismo)
  function falar(texto, user, kind) {
    if (!texto || !entregar) return;
    ultimaFala = Date.now();
    const partes = Array.isArray(texto) ? texto.map((p) => ({ ...p, url: null })) : null;
    const txt = partes ? partes.map((p) => p.texto).join(' ') : texto;
    entregar({ type: 'say', id: ++seq, text: txt, url: null, urls: null, partes, user: user || null, kind: kind || 'fala', ms: Math.min(14000, 900 + txt.length * 70) });
  }
  const pode = (chave, ms) => { const a = Date.now(); if (a - (cooldown.get(chave) || 0) < ms) return false; cooldown.set(chave, a); return true; };

  function processar(ev, handle) {
    entregar = handle;
    const u = ev.user;
    switch (ev.type) {
      case 'gift':
      case 'bomb': {
        const diamonds = Math.max(1, ev.diamonds || 1), count = Math.max(1, ev.count || 1), coins = diamonds * count;
        const bomba = BOMBAS.includes(String(ev.giftName || '').toLowerCase());
        if (bomba) handle({ type: 'bomb', user: u, giftName: ev.giftName, diamonds, count, coins, power: coins });
        else handle({ type: 'gift', user: u, giftName: ev.giftName, diamonds, count, coins, apples: coins, cantoria: null });
        somar(u, coins * PTS.diamante);
        falar(abismo() ? F.ABISMO.presente(u, ev.giftName, count, diamonds, bomba) : F.textoPresente(u, ev.giftName, count, diamonds, bomba), u, bomba ? 'bomba' : 'presente');
        break;
      }
      case 'follow':
        handle({ type: 'follow', user: u, apples: 1 });
        somar(u, PTS.seguir);
        falar(abismo() ? F.ABISMO.seguiu(u) : F.textoSeguiu(u), u, 'seguiu');
        break;
      case 'share':
        handle({ type: 'share', user: u });
        if (pode('share:' + u.id, 60000)) { somar(u, PTS.compartilhar); falar(abismo() ? F.ABISMO.compartilhou(u) : F.textoCompartilhou(u), u, 'seguiu'); }
        break;
      case 'like':
        handle({ type: 'like', user: u, likes: ev.likes || 1 });
        somar(u, (ev.likes || 1) * PTS.curtida);
        break;
      case 'chat': {
        handle({ type: 'chat', user: u, text: ev.text });
        if (pode('chatpts:' + u.id, 10000)) somar(u, PTS.comentario);
        const t = F.podeLer(ev.text);
        // responde no máximo 1 comentário a cada 8 s e a mesma pessoa a cada 25 s
        if (t && Date.now() - ultimaResposta > 8000 && pode('chat:' + u.id, 25000)) {
          ultimaResposta = Date.now();
          const n = F.nomeFalado(u);
          falar(abismo() ? F.ABISMO.comentario(u, t) : F.textoLido(n, t) + ' ' + F.responder(t, n), u, 'comentario');
        }
        break;
      }
      case 'join':
        handle({ type: 'join', user: u });
        if (abismo() && Date.now() - ultimaFala > 6000 && pode('join:' + u.id, 600000)) falar(F.ABISMO.entrou(u), u, 'entrou');
        break;
      default: handle(ev);
    }
  }

  // frase solta da cobra quando está tudo quieto (a cada 20 a 30 s)
  let proxima = 20000 + Math.random() * 10000;
  setInterval(() => {
    if (!entregar || Date.now() - ultimaFala < proxima) return;
    if (abismo()) { proxima = 14000 + Math.random() * 10000; return falar(F.ABISMO.solta(), null, 'solta'); }
    const ops = F.FALAS_DA_COBRA.filter((f) => !recentes.includes(f));
    const f = F.rnd(ops); recentes.push(f); if (recentes.length > 8) recentes.shift();
    proxima = 20000 + Math.random() * 10000;
    falar(f, null, 'cobra');
  }, 2000);

  // foto de perfil desenhada na hora (a página hospedada não pode carregar imagens de outros sites)
  const CORES = ['#ff7a59', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff5e8a', '#8bd450', '#f9a03f'];
  const fotos = new Map();
  function foto(nome) {
    if (fotos.has(nome)) return fotos.get(nome);
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
    let h = 0; for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    g.fillStyle = CORES[h % CORES.length]; g.fillRect(0, 0, 96, 96);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(48, 112, 44, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 50px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(nome.replace(/[^A-Za-z\u00C0-\u00FA]/g, '').slice(0, 1).toUpperCase() || '?', 48, 50);
    const url = c.toDataURL('image/png'); fotos.set(nome, url); return url;
  }

  window.__demoLocal = { ativo: false, processar, foto };
})();
