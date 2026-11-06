// Static endpoint: the six routes with xhtml:link alternates. Absolute public URLs (never the file build's base).
import { absUrl, routePath } from '../lib/paths';

// legal is noindex, so it stays out of the sitemap
const PATHS = ['', 'cv/'];

export function GET() {
  const urls = PATHS.flatMap((p) =>
    (['en', 'de'] as const).map((lang) => {
      const loc = absUrl(routePath(lang, p));
      const alt = (['en', 'de'] as const)
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${absUrl(routePath(l, p))}"/>`)
        .join('\n');
      return `  <url>\n    <loc>${loc}</loc>\n${alt}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${absUrl(routePath('en', p))}"/>\n  </url>`;
    }),
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
