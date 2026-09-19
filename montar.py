"""Junta as partes de src/ e gera todas as versões do app.

- meu-financeiro.html              -> publicada no Claude (sincroniza pela conta do Claude)
- meu-financeiro-compartilhar.html -> cópia pública no Claude (cada visitante salva no próprio navegador)
- index.html                       -> abre com dois cliques, direto do computador
- docs/                            -> site instalável (GitHub Pages): index.html, manifest, service worker

Rode de novo sempre que editar algo em src/:  python montar.py
"""
import hashlib
from pathlib import Path

base = Path(__file__).parent
partes = sorted((base / "src").glob("*.*"))
corpo = "\n".join(p.read_text(encoding="utf-8") for p in partes)
versao = hashlib.md5(corpo.encode("utf-8")).hexdigest()[:8]

# --- versões do Claude ---
(base / "meu-financeiro.html").write_text(corpo, encoding="utf-8")
compartilhar = corpo.replace("<title>MeuFinanceiro</title>", "<title>MeuFinanceiro Compartilhável</title>", 1)
(base / "meu-financeiro-compartilhar.html").write_text(compartilhar, encoding="utf-8")

# --- página completa (cabeça + corpo) ---
cabeca, _, resto = corpo.partition("</style>")


def pagina(extra_head="", extra_body=""):
    return (
        '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + cabeca + "</style>\n" + extra_head + "</head>\n<body>\n" + resto + extra_body + "\n</body>\n</html>\n"
    )


(base / "index.html").write_text(pagina(), encoding="utf-8")

# --- app instalável ---
docs = base / "docs"
docs.mkdir(exist_ok=True)
head_pwa = (
    '<link rel="manifest" href="manifest.webmanifest">\n'
    '<link rel="apple-touch-icon" href="icone-apple-180.png">\n'
    '<link rel="icon" href="icone-192.png">\n'
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
    '<meta name="apple-mobile-web-app-title" content="MeuFinanceiro">\n'
    '<meta name="description" content="Controle financeiro pessoal: gasto diário, cartões de crédito, metas e rendimento no CDI.">\n'
)
corpo_pwa = (
    '\n<script>\n'
    "if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));\n"
    '</script>\n'
)
(docs / "index.html").write_text(pagina(head_pwa, corpo_pwa), encoding="utf-8")

(docs / "manifest.webmanifest").write_text("""{
  "name": "MeuFinanceiro",
  "short_name": "MeuFinanceiro",
  "description": "Controle financeiro pessoal: gasto diário, cartões de crédito, metas e rendimento no CDI.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0A0B0E",
  "theme_color": "#0A0B0E",
  "lang": "pt-BR",
  "dir": "ltr",
  "icons": [
    { "src": "icone-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icone-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icone-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Anotar gasto", "short_name": "Gasto", "url": "./#/gastos" },
    { "name": "Carteira e cartões", "short_name": "Carteira", "url": "./#/carteira" }
  ]
}
""", encoding="utf-8")

(docs / "sw.js").write_text(f"""// Service worker do MeuFinanceiro — deixa o app abrir sem internet.
const CACHE = 'mf-{versao}';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png', './icone-apple-180.png', './icone-maskable-512.png'];

self.addEventListener('install', e => {{
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});

self.addEventListener('fetch', e => {{
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') || url.protocol === 'ws:' || url.protocol === 'wss:') return;
  if (req.mode === 'navigate') {{
    e.respondWith(fetch(req).then(r => {{ const c = r.clone(); caches.open(CACHE).then(k => k.put('./index.html', c)); return r; }})
      .catch(() => caches.match('./index.html')));
    return;
  }}
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {{
    if (r.ok || r.type === 'opaque') {{ const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); }}
    return r;
  }}).catch(() => hit)));
}});
""", encoding="utf-8")

(docs / ".nojekyll").write_text("", encoding="utf-8")
print(f"ok: {len(partes)} partes, {len(corpo) // 1024} KB, versão {versao}")
