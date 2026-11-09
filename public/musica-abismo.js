// Música do Abismo: marchinha de circo sombria, criada pelo próprio jogo (sem direitos autorais).
// Esquenta com a live (mais rápida e com mais instrumentos), abaixa quando alguém fala,
// e informa o ritmo (batida) para os palhaços dançarinos.
export function criarMusica({ volume = 0.22, falando = () => false } = {}) {
  let ac = null, out = null, duck = null, ok = false, rodando = false;
  function init() {
    if (ac) return ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    duck = ac.createGain(); out = ac.createGain(); out.gain.value = volume; duck.connect(out); out.connect(ac.destination); ok = true; return ac;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function nota(m, t, dur, tipo, vol, dest) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = tipo; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || duck); o.start(t); o.stop(t + dur + 0.05);
  }
  let ruidoBuf = null;
  const ruido = () => { if (ruidoBuf) return ruidoBuf; ruidoBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return ruidoBuf; };
  function perc(t, vol, f, q, len, tipo = 'highpass') { const s = ac.createBufferSource(); s.buffer = ruido(); const fl = ac.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); s.connect(fl); fl.connect(g); g.connect(duck); s.start(t); s.stop(t + len + 0.02); }
  function bumbo(t, vol) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g); g.connect(duck); o.start(t); o.stop(t + 0.22); }

  // marchinhas em tom menor (oom-pah no baixo, acorde no contratempo, melodia de circo cromática)
  const BASE = 50; // Ré
  const MUSICAS = [
    { baixo: [0, 7, 0, 7, 5, 0, 7, 0], acordes: [[12, 15, 19], [12, 15, 19], [10, 14, 17], [11, 14, 17]],
      mel: [24, 23, 24, 27, 26, 24, 22, null, 21, 22, 24, 22, 21, 19, 18, null, 19, 21, 22, 24, 26, 27, 26, 24, 23, 24, 27, 31, 30, null, null, null] },
    { baixo: [0, 7, 3, 7, 5, 0, 7, 5], acordes: [[12, 15, 19], [15, 19, 22], [10, 14, 17], [11, 14, 17]],
      mel: [19, null, 22, 24, 27, null, 26, 24, 22, null, 19, 18, 19, null, null, null, 24, null, 27, 26, 24, 22, 21, 19, 18, 19, 22, 18, 19, null, null, null] },
    { baixo: [0, 7, 0, 7, 3, 10, 5, 7], acordes: [[12, 15, 19], [12, 15, 19], [15, 19, 22], [11, 14, 17]],
      mel: [31, 30, 31, 27, 24, 27, 31, null, 29, 27, 26, 24, 23, 24, 26, null, 27, 26, 24, 22, 21, 22, 24, 27, 26, 24, 23, 21, 19, null, null, null] },
  ];
  let musica = 0, passo = 0, proxT = 0, energia = 0.2, cantando = false;
  const eventos = [];
  let calorExtra = 0;
  const bpm = () => 112 + energia * 38;
  function agenda() {
    if (!ok || ac.state !== 'running') return;
    const agora = performance.now(); while (eventos.length && agora - eventos[0][0] > 25000) eventos.shift();
    const alvo = Math.min(1, 0.2 + eventos.reduce((a, e) => a + e[1], 0) / 12 + calorExtra);
    energia += (alvo - energia) * 0.01; calorExtra *= 0.995;
    duck.gain.setTargetAtTime(cantando ? 0.15 : (falando() ? 0.33 : 1), ac.currentTime, 0.15);
    const M = MUSICAS[musica], col = 60 / bpm() / 2;
    if (proxT < ac.currentTime) proxT = ac.currentTime + 0.05;
    while (proxT < ac.currentTime + 0.2) {
      const p = passo % 32, comp = Math.floor(p / 8), t = proxT, nivel = energia < 0.25 ? 0 : energia < 0.5 ? 1 : energia < 0.75 ? 2 : 3;
      if (p % 2 === 0) nota(BASE - 12 + M.baixo[(p / 2) % 8], t, col * 1.5, 'triangle', 0.55);           // oom
      if (p % 4 === 2) for (const n of M.acordes[comp]) nota(BASE + n, t, col * 0.9, 'square', 0.045); // pah
      if (p % 4 === 0) bumbo(t, nivel >= 1 ? 0.6 : 0.35);
      if (nivel >= 1) perc(t, p % 2 ? 0.04 : 0.08, 7000, 1, 0.04);
      if (nivel >= 1 && p % 8 === 4) perc(t, 0.2, 1500, 0.8, 0.12, 'bandpass');
      if (M.mel[p] != null) nota(BASE + M.mel[p], t, col * 1.6, nivel >= 2 ? 'square' : 'triangle', nivel >= 2 ? 0.07 : 0.17);
      if (nivel >= 3 && M.mel[p] != null) nota(BASE + 12 + M.mel[p], t, col * 0.8, 'sine', 0.1);
      proxT += col; passo++;
    }
  }
  function vinheta(notas, tipo, vol, passoS) { if (!ok) return; const t0 = ac.currentTime + 0.02; notas.forEach((m, i) => { if (m != null) nota(m, t0 + i * passoS, passoS * 2.2, tipo, vol, out); }); }
  const VINHETAS = [[74, 77, 81, 86], [81, 80, 81, 77, 74, 77, 81], [69, 74, 69, 77, 69, 81], [86, 85, 83, 81, 83, 85, 86, 89]];
  const hash = (t) => { let h = 0; for (const c of String(t || '').toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  return {
    ligar() { if (!init()) return; if (ac.state === 'suspended') ac.resume().catch(() => {}); if (rodando) return; rodando = true; setInterval(agenda, 30); },
    proximaMusica() { musica = (musica + 1) % MUSICAS.length; passo = 0; },
    evento(tipo, valor = 1) {
      eventos.push([performance.now(), tipo === 'presente' ? Math.min(6, 1 + Math.log2(1 + valor)) : tipo === 'seguiu' ? 2 : tipo === 'bomba' ? 3 : tipo === 'comentario' ? 0.6 : 0.15]);
      if (!ok) return;
      if (tipo === 'presente' && valor >= 100) vinheta([74, 78, 81, 86, null, 81, 86, 90], 'square', 0.12, 0.09);
      else if (tipo === 'presente') { const v = VINHETAS[hash(arguments[2]) % VINHETAS.length]; vinheta(v, 'triangle', 0.22, 0.07); }
      else if (tipo === 'seguiu') vinheta([86, null, 93], 'sine', 0.3, 0.08);
      else if (tipo === 'bomba') vinheta([74, 70, 67, 62, 57], 'sawtooth', 0.08, 0.08);
    },
    esquentar(x) { calorExtra = Math.min(0.6, calorExtra + x); },
    cantoria(on) { cantando = !!on; },
    // ritmo atual para a dança: batidas por segundo e posição dentro da batida (0..1)
    batida() { const b = bpm() / 60; return { porSeg: b, fase: ok ? ((ac.currentTime * b) % 1) : ((performance.now() / 1000 * b) % 1), energia }; },
  };
}
