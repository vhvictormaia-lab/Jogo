// Só aceita pedidos feitos neste computador, por este jogo.
// - o pedido tem que vir do próprio PC (127.0.0.1);
// - o endereço usado tem que ser localhost / 127.0.0.1 / localtest.me (bloqueia o truque de um site se passar por "localhost");
// - se veio de uma página, ela tem que ser deste jogo (um site qualquer aberto no navegador não consegue mexer no painel).
const HOST_OK = /^(localhost|127\.0\.0\.1|\[::1\]|localtest\.me)(:\d+)?$/i;
function hostDe(url) { try { return new URL(url).host; } catch { return null; } }
function deste(req) {
  const ip = String(req.socket.remoteAddress || '');
  if (!(ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1')) return false;
  if (!HOST_OK.test(String(req.headers.host || ''))) return false;
  const origem = req.headers.origin || (req.headers['sec-fetch-site'] === 'cross-site' ? 'x://fora' : null);
  if (origem && origem !== 'null' && !HOST_OK.test(hostDe(origem) || '')) return false;
  if (origem === 'null') return false;
  // pedidos que mudam algo precisam ser JSON (um formulário de outro site não consegue mandar JSON sem ser bloqueado)
  if (req.method === 'POST' && !/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return false;
  return true;
}
function soLocal(req, res, next) {
  if (deste(req)) return next();
  res.statusCode = 403; res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, erro: 'O painel só funciona no computador da live.' }));
}
module.exports = { deste, soLocal, HOST_OK };
