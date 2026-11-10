// Passos de dança do Baile do Abismo (poses): pular, agachar até o chão, deitar, cambalhota, requebrar, passinho...
// Cada passo diz, batida a batida, como ficam quadril, pernas, braços, tronco e cabeça. As caveiras (esqueletos.js) somam isso por cima das animações delas.
// ======================= PASSOS DE DANÇA =======================
// pose: quadris/joelhos (qE,jE,aE / qD,jD,aD), braços (eX,eZ,eC / dX,dZ,dC), tronco (tx,ty,tz), pelve (py,pz), cabeça (cx,cy,cz),
// corpo inteiro (y = pulo, rx/ry/rz = deitar, cambalhota, giro), ag = agachar (0 a 1), onda = quanto a cobrinha balança
export function poseVazia(P = {}) {
  for (const k of ['qE', 'jE', 'aE', 'qD', 'jD', 'aD', 'eX', 'eZ', 'eC', 'dX', 'dZ', 'dC', 'tx', 'ty', 'tz', 'py', 'pz', 'cx', 'cy', 'cz', 'y', 'rx', 'ry', 'rz', 'ag']) P[k] = 0;
  P.eZ = P.dZ = 0.15; P.eC = P.dC = 0.3; P.onda = 0.25; return P;
}
const s = Math.sin, PI = Math.PI, abs = Math.abs;
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), ease = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
export const PASSOS = {
  balanco: { dur: 8, f(b, P) { const o = s(PI * b); P.ag = 0.12 + 0.18 * (1 - abs(o)); P.eX = -0.4 + 0.5 * o; P.dX = -0.4 - 0.5 * o; P.eC = P.dC = 0.8; P.tz = 0.12 * o; P.cz = 0.15 * s(PI * b + 0.6); P.pz = 0.18 * o; P.onda = 0.3; } },
  pula: { dur: 4, f(b, P) { const ph = b % 1, up = s(PI * ph); P.y = up * 0.8; P.ag = ph < 0.12 || ph > 0.88 ? 0.35 : 0; P.qE = P.qD = -0.6 * up; P.jE = P.jD = 1.1 * up; P.eX = P.dX = -2.7 * up - 0.2; P.eZ = P.dZ = 0.5; P.eC = P.dC = 0.2; P.cx = -0.2 * up; P.onda = 0.15; } },
  agacha: { dur: 8, f(b, P) { const a = Math.min(1, 1.35 * s(PI * cl(b / 8))); P.ag = 0.05 + 0.92 * a; P.eX = P.dX = -2.3 + 0.35 * s(2 * PI * b); P.eZ = P.dZ = 0.4; P.pz = 0.25 * s(2 * PI * b) * a; P.tx = 0.1 * a; P.cz = 0.2 * s(PI * b); P.onda = 0.35; } },
  deita: { dur: 8, f(b, P) { const L = ease(b / 1.4) * (1 - ease((b - 6.6) / 1.4)); P.rx = (-PI / 2) * L; P.y = -0.78 * L;
    P.qE = -1.2 * L + 0.7 * s(2 * PI * b) * L; P.jE = (1.1 + 0.7 * s(2 * PI * b)) * L; P.qD = -1.2 * L - 0.7 * s(2 * PI * b) * L; P.jD = (1.1 - 0.7 * s(2 * PI * b)) * L;
    P.eX = P.dX = -2.8 * L + 0.4 * s(2 * PI * b); P.eZ = P.dZ = 0.6; P.cx = -0.3 * L; P.onda = 0.5; } },
  cambalhota: { dur: 2, f(b, P) { const k = cl(b / 2), m = s(PI * k); P.rx = 2 * PI * ease(k); P.y = m * 1.4; P.qE = P.qD = -1.7 * m; P.jE = P.jD = 2.3 * m; P.eX = P.dX = -1.3 * m; P.eC = P.dC = 1.2 * m; P.cx = 0.5 * m; P.onda = 0.1; } },
  requebra: { dur: 8, f(b, P) { const o = s(2 * PI * b); P.ag = 0.32; P.pz = 0.45 * o; P.py = 0.35 * s(2 * PI * b + 1); P.eX = P.dX = 0.25; P.eZ = P.dZ = 0.95; P.eC = P.dC = 1.9; P.tz = -0.2 * o; P.cz = 0.2 * o; P.onda = 0.75; } },
  passinho: { dur: 8, f(b, P) { const lado = Math.floor(b) % 2, ph = b % 1, k = s(PI * ph);
    if (lado) { P.qE = -1.0 * k; P.jE = 0.25; P.aE = 0.25 * k; } else { P.qD = -1.0 * k; P.jD = 0.25; P.aD = 0.25 * k; }
    P.y = 0.14 * k; P.ry = 0.4 * (lado ? 1 : -1) * ease(ph * 3); P.eX = lado ? -1.3 * k : 0.2; P.dX = lado ? 0.2 : -1.3 * k; P.eC = P.dC = 1.4; P.onda = 0.45; } },
  gira: { dur: 4, f(b, P) { P.ry = 4 * PI * ease(b / 4); P.eZ = P.dZ = 1.4; P.eC = P.dC = 0.1; P.ag = 0.1; P.y = 0.12 * abs(s(PI * b)); P.onda = 0.35; } },
  bracos: { dur: 8, f(b, P) { const o = s(PI * b); P.eX = P.dX = -2.9; P.eZ = 0.35 + 0.35 * o; P.dZ = 0.35 - 0.35 * o; P.eC = P.dC = 0.1; P.tz = 0.2 * o; P.ag = 0.15 * abs(o); P.cz = -0.15 * o; P.onda = 0.5; } },
  robo: { dur: 8, f(b, P) { const q = Math.floor(b * 2) % 4, h = Math.floor(b) % 2;
    P.eX = [-1.57, 0, -1.57, -3][q]; P.dX = [0, -1.57, -3, -1.57][q]; P.eC = [1.57, 0, 0, 1.57][q]; P.dC = [0, 1.57, 1.57, 0][q]; P.cy = h ? 0.6 : -0.6; P.ry = h ? 0.3 : -0.3; P.ag = q % 2 ? 0.2 : 0; P.onda = 0.08; } },
  corre: { dur: 8, f(b, P) { const ph = 2 * PI * b * 2, o = s(ph); P.qE = -1.0 * o; P.qD = 1.0 * o; P.jE = 1.2 * Math.max(0, -o) + 0.2; P.jD = 1.2 * Math.max(0, o) + 0.2; P.eX = 0.9 * o; P.dX = -0.9 * o; P.eC = P.dC = 1.5; P.y = 0.14 * abs(o); P.tx = 0.22; P.onda = 0.55; } },
  aviaozinho: { dur: 8, f(b, P) { P.eZ = P.dZ = 1.55; P.eC = P.dC = 0; P.rz = 0.35 * s((PI * b) / 2); P.ry = (PI * b) / 4; P.ag = 0.15; P.qE = -0.4 * abs(s(PI * b)); P.onda = 0.4; } },
  bateCabeca: { dur: 8, f(b, P) { const o = abs(s(PI * b)); P.cx = 0.55 * o - 0.1; P.tx = 0.3 * o; P.eX = -1.3; P.eZ = 0.5; P.eC = 0.4; P.dX = -0.7 + 0.35 * s(4 * PI * b); P.dC = 1.3; P.ag = 0.25; P.onda = 0.6; } },
  estrela: { dur: 4, f(b, P) { const k = cl((b % 2) / 2); P.rz = -2 * PI * ease(k); P.y = 0.3 * s(PI * k); P.eZ = P.dZ = 2.7; P.eC = P.dC = 0; P.aE = P.aD = 0.55; P.onda = 0.2; } },
  polichinelo: { dur: 4, f(b, P) { const a = abs(s(PI * b)); P.eZ = P.dZ = 0.2 + 2.6 * a; P.eC = P.dC = 0.1; P.aE = P.aD = 0.45 * a; P.y = 0.28 * a; P.onda = 0.3; } },
  treme: { dur: 4, f(b, P) { const o = s(8 * PI * b); P.pz = 0.15 * o; P.tz = -0.12 * o; P.eX = -1.6 + 0.3 * o; P.dX = -1.6 - 0.3 * o; P.eZ = P.dZ = 0.6; P.eC = P.dC = 0.6; P.cz = 0.2 * o; P.ag = 0.25; P.onda = 0.9; } },
  acena: { dur: 4, f(b, P) { P.dX = -2.7; P.dZ = 0.3 + 0.35 * s(3 * PI * b); P.dC = 0.3; P.eX = -0.3; P.cz = 0.2; P.ag = 0.1 * abs(s(PI * b)); P.onda = 0.3; } },
};
// passos que todo mundo consegue fazer junto (o "coreógrafo" do baile escolhe um e a roda inteira faz)
export const JUNTOS = ['pula', 'agacha', 'requebra', 'passinho', 'bracos', 'gira', 'polichinelo', 'bateCabeca', 'aviaozinho', 'treme', 'cambalhota', 'deita'];
// passos de destaque (solo / dupla)
export const SOLOS = ['cambalhota', 'estrela', 'deita', 'agacha', 'gira', 'treme', 'requebra'];
// andar e correr (fase em radianos, avança com o tempo)
export function poseAndar(fase, correndo, P) {
  poseVazia(P); const o = s(fase), a = correndo ? 1.1 : 0.55;
  P.qE = -a * o; P.qD = a * o; P.jE = (correndo ? 1.3 : 0.6) * Math.max(0, -o) + 0.1; P.jD = (correndo ? 1.3 : 0.6) * Math.max(0, o) + 0.1;
  P.eX = a * 0.9 * o; P.dX = -a * 0.9 * o; P.eC = P.dC = correndo ? 1.5 : 0.4; P.y = (correndo ? 0.14 : 0.05) * abs(o); P.tx = correndo ? 0.25 : 0.05; P.onda = correndo ? 0.5 : 0.25;
  return P;
}

// GINGA: o "molho" por cima de qualquer passo, para não ficar robótico.
// Joelho dobra na batida, quadril desenha um 8, ombro vai para o lado contrário, cabeça e braços vêm atrasados.
// k = quanto de ginga (cada caveira tem a sua), fase = atraso próprio (ninguém fica igualzinho ao vizinho)
export function ginga(b, P, k = 1, fase = 0) {
  const t = b + fase, o = s(PI * t), d = s(PI * t - 0.55), pulso = Math.pow(abs(s(PI * t)), 0.6), pulsoAtras = Math.pow(abs(s(PI * t - 0.4)), 0.6);
  P.ag += 0.11 * k * (1 - pulso);
  P.pz += 0.13 * k * o; P.py += 0.09 * k * s(PI * t + 1.2);
  P.tz -= 0.08 * k * o; P.ty += 0.07 * k * d; P.tx += 0.04 * k * (1 - pulso);
  P.cx += 0.12 * k * (1 - pulsoAtras); P.cz += 0.1 * k * d; P.cy += 0.06 * k * s(PI * t * 0.5);
  P.eX += 0.2 * k * d; P.dX -= 0.2 * k * d; P.eC += 0.25 * k * abs(d); P.dC += 0.25 * k * abs(o);
  P.eZ += 0.06 * k * (1 - pulso); P.dZ += 0.06 * k * (1 - pulso);
  P.onda += 0.1 * k;
}
