const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const PORT = Number(process.argv[2] || process.env.PORT || 8090);
const TTYD_HOST = '127.0.0.1';
const TTYD_PORT = 7681;
const TTYD_PATH = '/opencode';
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 600;
const hits = new Map();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
};

// Urutan = prioritas. Folder pertama yang punya video mp4 that'll dipakai.
// Lets source diubah cukup dengan menaruh file baru di folder paling depan.
const VIDEO_SOURCE_DIRS = [
  '\\\\192.168.136.1\\Methodist-11 Document\\#YONATHAN\\Video Souce\\New folder',
  'D:\\Methodist-11 Document\\#YONATHAN\\Video Souce\\New folder',
  'D:\\Methodist-11 Document\\#YONATHAN\\video soure 2',
  'D:\\Methodist-11 Document\\#YONATHAN\\Video Souce',
  '\\\\192.168.136.1\\Methodist-11 Document\\#YONATHAN\\Video Souce',
];

// Video TERBARU (mtime paling baru) di dalam satu folder.
// Dipakai supaya nama file bebas: Untitled.mp4, Untitled-2.mp4, dll.
function newestVideoIn(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let best = null;
    let bestTime = -1;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (path.extname(entry.name).toLowerCase() !== '.mp4') continue;
      const full = path.join(dir, entry.name);
      const mtime = fs.statSync(full).mtimeMs;
      if (mtime > bestTime) {
        bestTime = mtime;
        best = full;
      }
    }
    return best;
  } catch (err) {
    return null;
  }
}

function resolveVideoFile(fileName) {
  for (const dir of VIDEO_SOURCE_DIRS) {
    const target = path.join(dir, fileName);
    if (fs.existsSync(target)) return target;
    const newest = newestVideoIn(dir);
    if (newest) return newest;
  }
  return path.join(VIDEO_SOURCE_DIRS[0], fileName);
}

function streamVideoFile(filePath, req, res, cacheControl) {
  const cacheHeader = { 'Cache-Control': cacheControl || 'public, max-age=14400' };
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Video Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'video/mp4';
    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        ...cacheHeader,
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        ...cacheHeader,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

function isTermPath(p) {
  return p === TTYD_PATH || p.startsWith(TTYD_PATH + '/');
}

function proxyHttp(req, res) {
  const proxyReq = http.request({
    host: TTYD_HOST,
    port: TTYD_PORT,
    path: req.url,
    method: req.method,
    headers: Object.assign({}, req.headers, { host: TTYD_HOST + ':' + TTYD_PORT }),
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('502 Bad Gateway - terminal offline');
    } else {
      res.end();
    }
  });
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const ip = req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  const now = Date.now();
  const rec = hits.get(ip);
  if (rec) {
    if (now - rec.start >= RATE_WINDOW) {
      rec.start = now;
      rec.count = 1;
    } else {
      rec.count++;
    }
    if (rec.count > RATE_MAX) {
      res.writeHead(429, { 'Retry-After': Math.ceil((rec.start + RATE_WINDOW - now) / 1000) });
      res.end('429 Too Many Requests - coba lagi nanti');
      return;
    }
  } else {
    hits.set(ip, { start: now, count: 1 });
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now - v.start >= RATE_WINDOW) hits.delete(k);
    }
  }
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { p = req.url.split('?')[0]; }
  if (isTermPath(p)) {
    proxyHttp(req, res);
    return;
  }
  if (p.startsWith('/video-source/')) {
    const rawName = p.substring('/video-source/'.length);
    const fileName = path.basename(rawName);
    streamVideoFile(resolveVideoFile(fileName), req, res, 'no-store, no-cache, must-revalidate');
    return;
  }
  if (p === '/') p = '/index.html';
  let file = path.join(ROOT, p);
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    const ext = path.extname(file).toLowerCase();
    if (ext === '.mp4' || ext === '.webm' || ext === '.ogg') {
      streamVideoFile(file, req, res);
      return;
    }
    fs.readFile(file, (e, data) => {
      if (e) { res.writeHead(404); res.end('404 Not Found'); return; }
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
      if (ext === '.html' || ext === '.css' || ext === '.js') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });
});

server.on('upgrade', (req, socket, head) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { p = req.url.split('?')[0]; }
  if (!isTermPath(p)) { socket.destroy(); return; }
  const upstream = net.connect(TTYD_PORT, TTYD_HOST, () => {
    const headers = Object.assign({}, req.headers, { host: TTYD_HOST + ':' + TTYD_PORT });
    let headStr = req.method + ' ' + req.url + ' HTTP/1.1\r\n';
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === 'host') continue;
      headStr += k + ': ' + headers[k] + '\r\n';
    }
    headStr += 'host: ' + TTYD_HOST + ':' + TTYD_PORT + '\r\n\r\n';
    upstream.write(headStr);
    if (head && head.length) upstream.write(head);
  });
  upstream.on('error', () => { socket.destroy(); });
  socket.on('error', () => { upstream.destroy(); });
  upstream.pipe(socket);
  socket.pipe(upstream);
});

server.listen(PORT, '0.0.0.0', () => console.log(`Serving ${ROOT} on port ${PORT} (+ terminal ${TTYD_PATH} -> ${TTYD_HOST}:${TTYD_PORT})`));