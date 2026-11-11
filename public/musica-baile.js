// Música do Baile do Abismo.
// - Se houver MP3 na pasta "musicas-baile", toca eles em sequência (o presente "Toque na banda" pula para a próxima).
// - Se não houver, o próprio jogo cria a música (sem direitos autorais): funk, forró, disco e pagode.
// Abaixa sozinha quando alguém está falando.
export function criarMusicaBaile({ falando = () => false } = {}) {
  let ac = null, out = null, duck = null, ok = false, cfg = null, rodando = false;
  let lista = [], faixa = 0, audio = null, fonteAudio = null, estilo = 0, passo = 0, proxT = 0, energia = 0.4;
  const vol = () => (cfg ? (cfg.ligada === false ? 0 : Math.max(0, Math.min(1, (cfg.volume ?? 22) / 100))) : 0.22);
  function init() {
    if (ac) return ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    duck = ac.createGain(); out = ac.createGain(); out.gain.value = vol(); duck.connect(out); out.connect(ac.destination); ok = true; return ac;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function nota(m, t, dur, tipo, v, dest = duck, vib = 0) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = tipo; o.frequency.value = hz(m);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  let rb = null; const ruido = () => { if (rb) return rb; rb = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate); const d = rb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return rb; };
  function perc(t, v, f, q, len, tipo = 'highpass') { const s = ac.createBufferSource(); s.buffer = ruido(); const fl = ac.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); s.connect(fl); fl.connect(g); g.connect(duck); s.start(t); s.stop(t + len + 0.02); }
  function bumbo(t, v, de = 150, ate = 40, len = 0.25) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(de, t); o.frequency.exponentialRampToValueAtTime(ate, t + len * 0.6);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.connect(g); g.connect(duck); o.start(t); o.stop(t + len + 0.02); }
  const caixa = (t, v) => { perc(t, v, 1800, 0.7, 0.16, 'bandpass'); bumbo(t, v * 0.4, 260, 180, 0.08); };
  const chimbal = (t, v, aberto) => perc(t, v, 8000, 1, aberto ? 0.18 : 0.04);
  const palma = (t, v) => { for (let i = 0; i < 3; i++) perc(t + i * 0.012, v, 1400, 1.2, 0.09, 'bandpass'); };

  // cada estilo: bpm e uma função que toca o passo p (16 por compasso, 4 compassos = 64)
  const T = 57; // tom (Lá)
  const ESTILOS = [
    { nome: 'funk', bpm: 130, toca(p, t, col) { // tamborzão
      const s = p % 16, c = Math.floor(p / 16) % 4;
      if ([0, 3, 6, 10, 12].includes(s)) bumbo(t, 0.9, 120, 35, 0.32);
      if ([4, 12].includes(s)) palma(t, 0.5);
      if (s % 2 === 1) chimbal(t, 0.05);
      if ([2, 7, 9, 14].includes(s)) perc(t, 0.12, 900, 2, 0.06, 'bandpass'); // atabaque
      const acordes = [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]][c];
      if ([0, 6, 10].includes(s)) for (const n of acordes) nota(T + 12 + n, t, col * 1.5, 'sawtooth', 0.035);
      const mel = [12, null, 15, 12, null, 10, 12, null, 7, null, 10, null, 12, 15, 17, null];
      if (energia > 0.45 && mel[s] != null && c % 2 === 1) nota(T + 12 + mel[s], t, col * 1.2, 'square', 0.05);
      if ([0, 3, 6].includes(s)) nota(T - 24 + acordes[0], t, col * 2.5, 'sine', 0.5);
    } },
    { nome: 'forró', bpm: 120, toca(p, t, col) { // baião: zabumba, triângulo e sanfona
      const s = p % 16, c = Math.floor(p / 16) % 4;
      if ([0, 6, 8, 14].includes(s)) bumbo(t, s % 8 === 0 ? 0.75 : 0.55, 110, 50, 0.22);
      if ([4, 12].includes(s)) perc(t, 0.18, 2500, 1, 0.05, 'bandpass'); // bacalhau
      chimbal(t, s % 4 === 2 ? 0.09 : 0.04, s % 4 === 2); // triângulo
      const base = [0, 5, 7, 5][c];
      if (s % 4 === 0) nota(T - 12 + base, t, col * 3, 'triangle', 0.35);
      const mel = [[12, 14, 16, 14, 12, null, 9, 10, 12, null, 16, 14, 12, 10, 9, null], [17, 16, 14, 12, 14, null, 12, 10, 9, null, 10, 12, 14, null, 12, null]][c % 2];
      if (mel[s] != null) nota(T + mel[s] + base * (c === 1 ? 1 : 0) / 5, t, col * 1.8, 'sawtooth', 0.045, duck, 4);
      if (s % 8 === 4) for (const n of [0, 4, 7]) nota(T + base + n, t, col * 1.5, 'square', 0.025);
    } },
    { nome: 'disco', bpm: 118, toca(p, t, col) {
      const s = p % 16, c = Math.floor(p / 16) % 4;
      if (s % 4 === 0) bumbo(t, 0.8);
      if (s % 4 === 2) chimbal(t, 0.12, true); else if (s % 2 === 1) chimbal(t, 0.04);
      if ([4, 12].includes(s)) caixa(t, 0.4);
      const raiz = [0, -3, -5, -7][c];
      if (s % 2 === 0) nota(T - 12 + raiz + (s % 4 === 2 ? 12 : 0), t, col * 0.9, 'square', 0.12);
      if ([2, 6, 10, 14].includes(s)) for (const n of [12, 15, 19]) nota(T + raiz + n, t, col * 0.8, 'triangle', 0.04);
      const mel = [24, null, 22, 24, 27, null, 24, null, 22, 19, null, 17, 19, null, null, null];
      if (energia > 0.35 && mel[s] != null && c >= 2) nota(T + raiz + mel[s] - 12, t, col * 1.3, 'sawtooth', 0.04);
    } },
    { nome: 'pagode', bpm: 100, toca(p, t, col) { // surdo, pandeiro e cavaquinho
      const s = p % 16, c = Math.floor(p / 16) % 4;
      if (s === 8) bumbo(t, 0.85, 90, 45, 0.4); else if (s === 0) bumbo(t, 0.4, 100, 60, 0.2);
      chimbal(t, [0, 4, 8, 12].includes(s) ? 0.1 : 0.04); if ([6, 14].includes(s)) perc(t, 0.2, 400, 1, 0.08, 'lowpass');
      const ac2 = [[0, 4, 7, 11], [2, 5, 9, 12], [-1, 2, 5, 9], [0, 4, 7, 9]][c];
      if ([0, 3, 6, 10, 12, 14].includes(s)) for (const n of ac2) nota(T + 12 + n, t, col * 0.6, 'triangle', 0.035);
      if (s % 8 === 0) nota(T - 12 + ac2[0], t, col * 4, 'sine', 0.4);
      const mel = [16, null, 14, 12, null, 14, 16, null, 19, null, 16, null, 14, 12, null, null];
      if (energia > 0.4 && mel[s] != null && c % 2 === 0) nota(T + mel[s], t, col * 1.4, 'sine', 0.08);
    } },
  ];
  let cantoria = false;
  function agenda() {
    if (audio && !audio.__mixer) { const v = vol(); audio.volume = Math.max(0, Math.min(1, falando() ? v * 0.35 : v)); const ag = performance.now(); if (audio.paused && !audio.ended && ag - (audio.__tentou || 0) > 2000) { audio.__tentou = ag; audio.play().catch(() => {}); } }
    if (!ok || ac.state !== 'running') return;
    duck.gain.setTargetAtTime(falando() ? 0.35 : 1, ac.currentTime, 0.15);
    if (audio) { if (audio.__mixer) audio.volume = 1; return; }
    const E = ESTILOS[estilo], col = 60 / (E.bpm + energia * 8) / 4;
    if (proxT < ac.currentTime) proxT = ac.currentTime + 0.05;
    while (proxT < ac.currentTime + 0.2) { E.toca(passo % 64, proxT, col); proxT += col; passo++; }
  }
  // uma música por vez: a anterior é desligada por completo antes de começar a próxima
  // (antes, o "erro" da música desligada apagava a atual e o som do jogo tocava junto = som sobreposto)
  function pararMp3() {
    const a = audio; audio = null; if (!a) return;
    a.onended = a.onerror = null;
    try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {}
    try { if (fonteAudio) fonteAudio.disconnect(); } catch (e) {} fonteAudio = null;
  }
  function tocarMp3(i, mesmoSeIgual = true) {
    if (!lista.length) return;
    const n = ((i % lista.length) + lista.length) % lista.length;
    if (!mesmoSeIgual && audio && n === faixa && !audio.ended) return; // já está tocando esta
    pararMp3(); faixa = n;
    const a = new Audio(lista[faixa]); audio = a;
    // só passa pelo mixer do jogo se ele estiver rodando; senão toca direto (antes: mixer parado = música muda)
    if (ac && ac.state === 'running') { try { a.crossOrigin = 'anonymous'; fonteAudio = ac.createMediaElementSource(a); fonteAudio.connect(duck); a.__mixer = true; } catch (e) {} }
    if (!a.__mixer) a.volume = vol();
    a.onended = () => { if (audio === a) tocarMp3(faixa + 1); };
    a.onerror = () => { if (audio !== a) return; pararMp3(); lista.splice(faixa, 1); if (lista.length) tocarMp3(faixa); };
    a.play().catch(() => { setTimeout(() => { if (audio === a && a.paused) a.play().catch(() => {}); }, 1500); });
  }
  return {
    config(m) { if (!m) return; cfg = m; if (out) out.gain.value = vol(); },
    ligar() { init(); if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); if (ac && !this._tenta) this._tenta = setInterval(() => { if (ac.state === 'suspended') ac.resume().catch(() => {}); }, 2000); if (rodando) { if (audio && audio.paused && !audio.ended) audio.play().catch(() => {}); return; } rodando = true; setInterval(agenda, 25); if (lista.length && !audio) tocarMp3(0); },
    // lista de MP3 (urls); vazia = músicas do jogo
    playlist(urls) { lista = (urls || []).slice(); if (rodando && lista.length && !audio) tocarMp3(0); },
    // "toque na banda": próxima música (MP3 ou estilo do jogo)
    tocar(i) { if (lista.length && rodando) tocarMp3(i, false); else { estilo = ((i % ESTILOS.length) + ESTILOS.length) % ESTILOS.length; passo = 0; } },
    proxima() { if (lista.length && rodando) tocarMp3(faixa + 1); else { estilo = (estilo + 1) % ESTILOS.length; passo = 0; } },
    get tocando() { return !!ac && ac.state === 'running' && !(cfg && cfg.ligada === false); },
    get estilo() { return lista.length ? 'mp3' : ESTILOS[estilo].nome; },
    esquentar(x) { energia = Math.min(1, energia + x); },
    esfriar() { energia = Math.max(0.3, energia * 0.995); },
    vinheta(notas) { if (!ok) return; const t0 = ac.currentTime + 0.02; notas.forEach((m, i) => nota(m, t0 + i * 0.08, 0.25, 'triangle', 0.18, out)); },
    batida() { const b = (lista.length ? 120 : ESTILOS[estilo].bpm) / 60; return { porSeg: b, fase: ok ? (ac.currentTime * b) % 1 : (performance.now() / 1000 * b) % 1, energia }; },
  };
}
