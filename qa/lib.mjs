// QA harness core: system Chrome via puppeteer-core (no bundled browser), a tiny static server that mounts a
// build folder under /rustam-portfolio/ (like Pages), and the helpers every scenario shares.
// CHROME_PATH overrides the default Chrome location.
import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

export const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = '/rustam-portfolio/';
export const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

/** Serve `dir` under BASE. Resolves to { url, port, close }. url ends with BASE. */
export function serve(dir = path.join(siteRoot, 'dist'), port = 0) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!p.startsWith(BASE)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('outside base');
    }
    let file = path.join(root, p.slice(BASE.length));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      const nf = path.join(root, '404.html');
      res.writeHead(404, { 'content-type': MIME['.html'] });
      return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found');
    }
    const st = fs.statSync(file);
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Number(m[2]) : st.size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    // Pages gzips text assets; do the same so QA and Lighthouse see realistic transfer sizes
    const gz = /^text\/|json|xml|svg|javascript/.test(type) && String(req.headers['accept-encoding'] || '').includes('gzip');
    if (gz) {
      res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', vary: 'accept-encoding' });
      return fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    }
    res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const { port: p } = server.address();
      resolve({ url: `http://127.0.0.1:${p}${BASE}`, port: p, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

export function fileUrl(rel, dir = path.join(siteRoot, 'dist-file')) {
  return pathToFileURL(path.join(dir, rel)).href;
}

export async function launch(opts = {}) {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`);
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files'].filter((a) => opts.fileAccess || !a.includes('allow-file')),
    defaultViewport: opts.viewport || { width: 1440, height: 900 },
  });
}

/** Collect console errors, page errors and failed requests on a page. */
export function watch(page) {
  const log = { errors: [], failed: [] };
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); });
  page.on('pageerror', (e) => log.errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => log.failed.push(r.url() + ' ' + (r.failure()?.errorText || '')));
  page.on('response', (r) => { if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url()}`); });
  return log;
}

/** Lenis breaks Playwright/puppeteer stability checks: park it first, then keep the real click. */
export async function parkLenis(page, y) {
  await page.evaluate((yy) => { if (window.__lenis) window.__lenis.scrollTo(yy, { immediate: true }); else window.scrollTo(0, yy); }, y);
  await new Promise((r) => setTimeout(r, 120));
}

/** A REAL dispatched click (page.mouse), never el.click(). Scrolls the element into view first. */
export async function realClick(page, selector) {
  const el = await page.$(selector);
  if (!el) throw new Error('realClick: no element ' + selector);
  await el.evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await new Promise((r) => setTimeout(r, 150));
  const box = await el.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

export async function shot(page, file, opts = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, ...opts });
  return file;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
