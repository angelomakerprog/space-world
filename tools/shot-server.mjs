/**
 * Tiny local sink for screenshots taken from the running page.
 * Dev-only helper: the app POSTs a data URL here and it lands on disk so the
 * frame can be inspected outside the browser.
 *   node tools/shot-server.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.SHOT_DIR || path.resolve('shots');
fs.mkdirSync(OUT, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405).end('post only'); return; }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const name = String(body.name || 'shot').replace(/[^a-z0-9_-]/gi, '') + '.png';
      const b64 = body.data.replace(/^data:image\/\w+;base64,/, '');
      const file = path.join(OUT, name);
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end(file);
      console.log('wrote', file, fs.statSync(file).size, 'bytes');
    } catch (e) {
      res.writeHead(400).end(String(e));
    }
  });
}).listen(5199, () => console.log('shot sink on http://localhost:5199'));
