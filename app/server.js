const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT      = 3456;
const DATA_FILE = path.join(__dirname, 'timeline-data.json');
const HTML_FILE = path.join(__dirname, 'timeline.html');

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(HTML_FILE));
    return;
  }

  if (req.method === 'GET' && url === '/api/load') {
    if (fs.existsSync(DATA_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(DATA_FILE, 'utf8'));
    } else {
      res.writeHead(204);
      res.end();
    }
    return;
  }

  if (req.method === 'POST' && url === '/api/save') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        JSON.parse(body);
        fs.writeFileSync(DATA_FILE, body, 'utf8');
        res.writeHead(200);
        res.end('ok');
      } catch (e) {
        res.writeHead(400);
        res.end('invalid json');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`\n  Timeline running → ${url}\n`);

  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  // Wait 800ms to ensure server is fully ready before Chrome connects
  setTimeout(() => {
    if (fs.existsSync(chrome)) {
      // Use a dedicated profile so window size is independent of regular Chrome
      const profile = path.join(__dirname, '.chrome-profile');
      exec(`"${chrome}" --user-data-dir="${profile}" --app=${url} --window-size=1340,680 --window-position=60,60`);
    } else {
      exec(`open "${url}"`);
    }
  }, 800);
});
