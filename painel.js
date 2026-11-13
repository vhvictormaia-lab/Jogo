// API do painel de controle (http://localhost:3000/painel.html).
// Só responde a pedidos feitos neste computador: ninguém da rede consegue mexer na sua live ou ver sua chave.
const fs = require('fs');
const path = require('path');
const { execFile, exec } = require('child_process');

module.exports = function painel(ctx) {
  const { app, CFG, stats, registro, broadcast, PORT, baile } = ctx;
  const RAIZ = __dirname;
  const ARQ_PALAVRAS = path.join(RAIZ, 'palavras-proibidas.txt');

  const local = (req, res, next) => {
    const ip = String(req.socket.remoteAddress || '');
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
    res.status(403).json({ ok: false, erro: 'O painel só funciona no computador da live.' });
  };
  app.use('/api/painel', local);

  const num = (v, min, max, padrao) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao; };

  function estado() {
    const e = baile.estado();
    return {
      ok: true, config: CFG.publico(), tiktok: ctx.tiktok(), stats: { ...stats, minutos: Math.floor((Date.now() - stats.inicio) / 60000) },
      registro: registro.slice(-40).reverse(),
      link: `http://localtest.me:${PORT}/baile.html`, telas: ctx.somTelas(),
      comediante: ctx.comediante ? ctx.comediante.estado() : null,
      baile: { naRoda: e.roda.length, resta: e.resta, intervalo: e.intervalo, noivo: e.noivo, noiva: e.noiva, duracao: e.cfg.duracao, maximo: e.cfg.maximo },
    };
  }
  app.get('/api/painel/estado', (_req, res) => res.json(estado()));

  // ----- configurações -----
  app.post('/api/painel/config', (req, res) => {
    const b = req.body || {}, atual = CFG.get(), novo = {};
    if (typeof b.usuario === 'string') {
      const u = b.usuario.trim().replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 40);
      if (u !== atual.usuario) novo.usuario = u;
    }
    if (b.musica) novo.musica = { ligada: b.musica.ligada !== undefined ? !!b.musica.ligada : atual.musica.ligada, volume: num(b.musica.volume ?? atual.musica.volume, 0, 100, 40) };
    if (b.atualizacao) {
      novo.atualizacao = {};
      if (typeof b.atualizacao.repo === 'string' && /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(b.atualizacao.repo)) novo.atualizacao.repo = b.atualizacao.repo;
      if (b.atualizacao.removerToken) novo.atualizacao.token = '';
      else if (typeof b.atualizacao.token === 'string' && b.atualizacao.token.trim().length > 10) novo.atualizacao.token = b.atualizacao.token.trim();
    }
    if (b.comediante) {
      const c = b.comediante, a = atual.comediante || {}; novo.comediante = {};
      if (c.ligado !== undefined) novo.comediante.ligado = !!c.ligado;
      if (c.voz !== undefined) novo.comediante.voz = !!c.voz;
      if (c.intervalo !== undefined) novo.comediante.intervalo = num(c.intervalo, 1, 30, a.intervalo || 3);
      if (c.removerChave) { novo.comediante.chave = ''; novo.comediante.chaves = []; }
      else if (typeof c.chave === 'string') {
        // uma ou várias chaves (separadas por espaço, vírgula ou linha): revezam uma por resposta
        const ks = [...new Set(c.chave.split(/[\s,;]+/).map((k) => k.trim()).filter((k) => k.length > 15 && k.length < 200))].slice(0, 10);
        if (ks.length) { novo.comediante.chaves = ks; novo.comediante.chave = ''; }
      }
    }
    CFG.atualizar(novo);
    if (novo.musica) broadcast({ type: 'config', musica: CFG.get().musica });
    if (novo.usuario !== undefined) { ctx.trocarUsuario(novo.usuario); ctx.conectar(); }
    res.json(estado());
  });

  // ----- baile -----
  app.post('/api/painel/baile', (req, res) => {
    const b = req.body || {};
    if (b.acao === 'limpar') baile.limpar();
    else if (b.acao === 'fim') baile.fimDoBaile();
    else if (b.acao === 'config') {
      const c = {}; if (b.duracao !== undefined) c.duracao = num(b.duracao, 1, 60, 5); if (b.maximo !== undefined) c.maximo = num(b.maximo, 5, 80, 30);
      const novo = baile.config(c); CFG.atualizar({ baile: { duracao: novo.duracao, maximo: novo.maximo } });
    }
    res.json(estado());
  });

  // ----- TikTok -----
  app.post('/api/painel/tiktok', (req, res) => {
    if ((req.body || {}).acao === 'desconectar') ctx.desconectar(); else ctx.conectar();
    setTimeout(() => res.json(estado()), 300);
  });

  // ----- DJ comediante: testar agora -----
  app.post('/api/painel/comediante', async (_req, res) => {
    try { res.json({ ...(await ctx.comediante.rodada(true)), estado: ctx.comediante.estado() }); } catch (e) { res.json({ ok: false, erro: e.message }); }
  });

  // ----- eventos de teste -----
  app.post('/api/painel/teste', (req, res) => res.json({ ok: ctx.sim(req.body || {}) }));

  // ----- palavras proibidas -----
  app.get('/api/painel/palavras', (_req, res) => { let t = ''; try { t = fs.readFileSync(ARQ_PALAVRAS, 'utf8'); } catch {} res.json({ ok: true, texto: t }); });
  app.post('/api/painel/palavras', (req, res) => {
    const t = String((req.body || {}).texto || '').slice(0, 50000);
    try { fs.writeFileSync(ARQ_PALAVRAS, t); res.json({ ok: true }); } catch (e) { res.json({ ok: false, erro: e.message }); }
  });

  // ----- atualização do sistema (pelo GitHub) -----
  const API = process.env.GITHUB_API || 'https://api.github.com';
  const GH = (url, cfg) => fetch(url.replace('https://api.github.com', API), { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'baile-do-abismo-atualizador',
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
  const ANTIGOS = ['iniciar-abismo.bat', 'iniciar-quiz.bat', 'voz.js', 'voz.ps1', 'edge-token.js', 'CREDITOS.txt', 'public/index.html', 'public/abismo.html',
    'public/quiz.html', 'public/quiz-motor.js', 'public/perguntas-quiz.js', 'public/musica-abismo.js', 'public/demo-local.js', 'public/falas.js', 'public/sounds', 'public/baile-teste'];
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
      // mantém o que é seu: configurações, personagens, músicas e a lista de palavras
      const manter = (rel) => /^(privado|node_modules|\.git)(\/|\\|$)/.test(rel) || rel === 'palavras-proibidas.txt' || (/^(baile-personagens|musicas-baile)[\/\\]/.test(rel) && !/LEIA-ME\.txt$/i.test(rel));
      fs.cpSync(novo, RAIZ, { recursive: true, force: true, filter: (src) => { const rel = path.relative(novo, src); return !rel || !manter(rel); } });
      // apaga os arquivos dos jogos antigos (Cobrinha, Abismo e Quiz), que não fazem mais parte
      for (const rel of ANTIGOS) { try { fs.rmSync(path.join(RAIZ, rel), { recursive: true, force: true }); } catch {} }
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
