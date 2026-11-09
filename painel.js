// API do painel de controle (http://localhost:3000/painel.html).
// Só responde a pedidos feitos neste computador: ninguém da rede consegue mexer na sua live ou ver sua chave.
const fs = require('fs');
const path = require('path');
const { execFile, exec } = require('child_process');

module.exports = function painel(ctx) {
  const { app, express, CFG, stats, registro, top6, voz, broadcast, PORT } = ctx;
  const RAIZ = __dirname;
  const CANT_DIR = path.join(RAIZ, 'cantorias');
  const ARQ_PALAVRAS = path.join(RAIZ, 'palavras-proibidas.txt');

  const local = (req, res, next) => {
    const ip = String(req.socket.remoteAddress || '');
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
    res.status(403).json({ ok: false, erro: 'O painel só funciona no computador da live.' });
  };
  app.use('/api/painel', local);

  const num = (v, min, max, padrao) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao; };
  const VOZES_OK = /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/;

  function estado() {
    return {
      ok: true, config: CFG.publico(), tiktok: ctx.tiktok(), stats: { ...stats, minutos: Math.floor((Date.now() - stats.inicio) / 60000) },
      top: top6(), registro: registro.slice(-40).reverse(),
      links: { cobrinha: `http://localtest.me:${PORT}/`, cobrinhaAbismo: `http://localtest.me:${PORT}/?tema=abismo`, abismo: `http://localtest.me:${PORT}/abismo.html` },
    };
  }
  app.get('/api/painel/estado', (_req, res) => res.json(estado()));

  // ----- configurações -----
  app.post('/api/painel/config', (req, res) => {
    const b = req.body || {}, atual = CFG.get(), novo = {};
    if (typeof b.usuario === 'string') {
      const u = b.usuario.trim().replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 40);
      if (u !== atual.usuario) { novo.usuario = u; }
    }
    if (b.modo === 'abismo' || b.modo === 'cobrinha') novo.modo = b.modo;
    if (b.openai) {
      novo.openai = {};
      if (b.openai.remover) novo.openai.chave = '';
      else if (typeof b.openai.chave === 'string' && b.openai.chave.trim().startsWith('sk-')) novo.openai.chave = b.openai.chave.trim();
      if (typeof b.openai.modelo === 'string' && /^[A-Za-z0-9._-]{2,40}$/.test(b.openai.modelo)) novo.openai.modelo = b.openai.modelo;
    }
    if (b.vozes) {
      const v = b.vozes, nv = {};
      for (const k of ['cobra', 'narrador']) if (typeof v[k] === 'string' && VOZES_OK.test(v[k])) nv[k] = v[k];
      for (const k of ['palhaco', 'serpente']) if (v[k]) {
        nv[k] = {};
        if (typeof v[k].voz === 'string' && VOZES_OK.test(v[k].voz)) nv[k].voz = v[k].voz;
        if (v[k].tom !== undefined) nv[k].tom = num(v[k].tom, -50, 50, 0);
        if (v[k].vel !== undefined) nv[k].vel = num(v[k].vel, -40, 40, 0);
      }
      novo.vozes = nv;
    }
    if (b.musica) novo.musica = { ligada: b.musica.ligada !== undefined ? !!b.musica.ligada : atual.musica.ligada, volume: num(b.musica.volume ?? atual.musica.volume, 0, 100, 22) };
    if (b.vozEspectador !== undefined) novo.vozEspectador = !!b.vozEspectador;
    if (b.falaSolta) { const mi = num(b.falaSolta.min, 5, 600, 20), ma = num(b.falaSolta.max, 5, 600, 30); novo.falaSolta = { min: Math.min(mi, ma), max: Math.max(mi, ma) }; }
    if (b.atualizacao) {
      novo.atualizacao = {};
      if (typeof b.atualizacao.repo === 'string' && /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(b.atualizacao.repo)) novo.atualizacao.repo = b.atualizacao.repo;
      if (b.atualizacao.removerToken) novo.atualizacao.token = '';
      else if (typeof b.atualizacao.token === 'string' && b.atualizacao.token.trim().length > 10) novo.atualizacao.token = b.atualizacao.token.trim();
    }
    CFG.atualizar(novo);
    if (novo.modo) voz.setModo(novo.modo);
    if (novo.musica) broadcast({ type: 'config', musica: CFG.get().musica });
    if (novo.usuario !== undefined) { ctx.trocarUsuario(novo.usuario); ctx.conectar(); }
    res.json(estado());
  });

  // ----- TikTok -----
  app.post('/api/painel/tiktok', (req, res) => {
    if ((req.body || {}).acao === 'desconectar') ctx.desconectar(); else ctx.conectar();
    setTimeout(() => res.json(estado()), 300);
  });

  // ----- falas -----
  app.post('/api/painel/falar', (req, res) => {
    const b = req.body || {};
    const ok = voz.manual(['palhaco', 'serpente', 'cobra', 'narrador'].includes(b.quem) ? b.quem : 'cobra', String(b.texto || ''));
    res.json({ ok, erro: ok ? null : 'Escreva o que o personagem vai falar.' });
  });
  app.post('/api/painel/testar-voz', (req, res) => res.json({ ok: voz.testar(String((req.body || {}).quem || 'cobra')) }));

  // ----- eventos de teste -----
  app.post('/api/painel/teste', (req, res) => res.json({ ok: ctx.sim(req.body || {}) }));
  app.post('/api/painel/zerar', (_req, res) => { ctx.zerarRanking(); res.json(estado()); });

  // ----- palavras proibidas -----
  app.get('/api/painel/palavras', (_req, res) => { let t = ''; try { t = fs.readFileSync(ARQ_PALAVRAS, 'utf8'); } catch {} res.json({ ok: true, texto: t }); });
  app.post('/api/painel/palavras', (req, res) => {
    const t = String((req.body || {}).texto || '').slice(0, 50000);
    try { fs.writeFileSync(ARQ_PALAVRAS, t); res.json({ ok: true }); } catch (e) { res.json({ ok: false, erro: e.message }); }
  });

  // ----- cantorias (MP3 por presente) -----
  const nomeArq = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '');
  app.get('/api/painel/cantorias', (_req, res) => {
    let l = []; try { l = fs.readdirSync(CANT_DIR).filter((f) => /\.(mp3|ogg|wav|m4a)$/i.test(f)).map((f) => ({ nome: f, kb: Math.round(fs.statSync(path.join(CANT_DIR, f)).size / 1024) })); } catch {}
    res.json({ ok: true, lista: l });
  });
  app.post('/api/painel/cantorias', express.raw({ type: () => true, limit: '20mb' }), (req, res) => {
    const nome = nomeArq(req.query.nome);
    if (!/^[a-z0-9-]+\.(mp3|ogg|wav|m4a)$/.test(nome)) return res.json({ ok: false, erro: 'Use um arquivo MP3, OGG, WAV ou M4A com o nome do presente (ex.: rosa.mp3).' });
    if (!req.body || !req.body.length) return res.json({ ok: false, erro: 'Arquivo vazio.' });
    try { fs.mkdirSync(CANT_DIR, { recursive: true }); fs.writeFileSync(path.join(CANT_DIR, nome), req.body); res.json({ ok: true, nome }); }
    catch (e) { res.json({ ok: false, erro: e.message }); }
  });
  app.delete('/api/painel/cantorias', (req, res) => {
    const nome = nomeArq(req.query.nome);
    if (!/^[a-z0-9-]+\.(mp3|ogg|wav|m4a)$/.test(nome)) return res.json({ ok: false });
    try { fs.unlinkSync(path.join(CANT_DIR, nome)); res.json({ ok: true }); } catch (e) { res.json({ ok: false, erro: e.message }); }
  });

  // ----- atualização do sistema (pelo GitHub) -----
  const API = process.env.GITHUB_API || 'https://api.github.com';
  const GH = (url, cfg) => fetch(url.replace('https://api.github.com', API), { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'cobrinha-da-live-atualizador',
    ...(cfg.atualizacao.token ? { Authorization: 'Bearer ' + cfg.atualizacao.token } : {}) }, redirect: 'follow' });
  async function ultimaVersao() {
    const cfg = CFG.get();
    const r = await GH(`https://api.github.com/repos/${cfg.atualizacao.repo}/commits/main`, cfg);
    if (r.status === 404 || r.status === 401) throw new Error(cfg.atualizacao.token ? 'Não achei o repositório com esse token.' : 'Não achei o repositório. Se ele for privado, coloque um token do GitHub.');
    if (!r.ok) throw new Error('GitHub respondeu ' + r.status);
    const j = await r.json();
    return { sha: j.sha, data: j.commit?.author?.date || j.commit?.committer?.date, mensagem: String(j.commit?.message || '').split('\n')[0] };
  }
  app.get('/api/painel/atualizacao', async (_req, res) => {
    try {
      const v = await ultimaVersao(), instalado = CFG.get().atualizacao.instalado;
      res.json({ ok: true, ultima: v, instalado, temNova: !instalado || instalado !== v.sha });
    } catch (e) { res.json({ ok: false, erro: e.message === 'fetch failed' ? 'Sem internet ou o GitHub não respondeu. Tente de novo daqui a pouco.' : e.message }); }
  });
  let atualizando = false;
  app.post('/api/painel/atualizar', async (req, res) => {
    if (atualizando) return res.json({ ok: false, erro: 'Já estou atualizando.' });
    if (ctx.tiktok().connected && !(req.body || {}).mesmoAoVivo) return res.json({ ok: false, erro: 'A live está conectada. Atualize com a live parada.', aoVivo: true });
    atualizando = true;
    const tmp = path.join(CFG.DIR, 'atualizacao'); const zip = path.join(CFG.DIR, 'atualizacao.zip');
    try {
      const cfg = CFG.get(); const v = await ultimaVersao();
      const r = await GH(`https://api.github.com/repos/${cfg.atualizacao.repo}/zipball/${v.sha}`, cfg);
      if (!r.ok) throw new Error('Não consegui baixar a versão nova (' + r.status + ').');
      fs.mkdirSync(CFG.DIR, { recursive: true }); fs.rmSync(tmp, { recursive: true, force: true });
      fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
      await new Promise((ok, falha) => {
        const cb = (e) => (e ? falha(new Error('Não consegui extrair o ZIP: ' + e.message)) : ok());
        if (process.platform === 'win32') execFile('powershell.exe', ['-NoProfile', '-Command', 'Expand-Archive', '-LiteralPath', zip, '-DestinationPath', tmp, '-Force'], cb);
        else execFile('unzip', ['-q', '-o', zip, '-d', tmp], cb);
      });
      const pastas = fs.readdirSync(tmp); if (pastas.length !== 1) throw new Error('ZIP inesperado.');
      const novo = path.join(tmp, pastas[0]);
      if (!fs.existsSync(path.join(novo, 'server.js')) || !fs.existsSync(path.join(novo, 'public'))) throw new Error('Esse repositório não parece ser o jogo.');
      const pkgAntes = fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8');
      // mantém o que é seu: configurações, músicas das cantorias e a lista de palavras
      const manter = (rel) => /^(privado|node_modules|\.git)(\/|\\|$)/.test(rel) || rel === 'palavras-proibidas.txt' || (/^cantorias[\/\\]/.test(rel) && !/LEIA-ME\.txt$/i.test(rel));
      fs.cpSync(novo, RAIZ, { recursive: true, force: true, filter: (src) => { const rel = path.relative(novo, src); return !rel || !manter(rel); } });
      CFG.atualizar({ atualizacao: { instalado: v.sha } });
      fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(zip, { force: true });
      const precisaNpm = fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8') !== pkgAntes;
      if (precisaNpm) await new Promise((ok) => exec('npm install --silent', { cwd: RAIZ }, () => ok()));
      res.json({ ok: true, versao: v, reinicia: true });
      console.log('⬆️  Atualizado para ' + v.sha.slice(0, 7) + ' (' + v.mensagem + '). Reiniciando...');
      setTimeout(() => process.exit(42), 1200); // o iniciar.bat abre o jogo de novo
    } catch (e) {
      atualizando = false; try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
      res.json({ ok: false, erro: e.message });
    }
  });
};
