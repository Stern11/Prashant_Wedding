"""Generate the dated edition pages from wedding-site/index.html.

  wedding-site/23/index.html     -> Haldi, Mehandi, Mandha, Preetibhoj        (edition: main)
  wedding-site/24/index.html     -> Gurchadi, Baraat Prasthan, Shubh Vivah   (edition: wedding)
  wedding-site/23-24/index.html  -> all of the above                         (edition: full)

Each page reuses the shared css/js/assets via <base href="../">, so there is
only one source file to edit. Run locally with:  python3 tools/build_editions.py
(The GitHub Pages workflow runs it automatically before publishing.)
"""
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / 'wedding-site'
SRC = (SITE / 'index.html').read_text(encoding='utf-8')

EDITIONS = {
    '23': {
        'edition': 'main',
        'title': 'Shubham ✦ Vidisha — Mangalik Karyakram · 23 Nov',
        'desc': 'Haldi · Mehandi · Mandha · Preetibhoj — Monday, 23 November 2026 · Gram Rali Chauhan, Kila Road, Meerut',
    },
    '24': {
        'edition': 'wedding',
        'title': 'Shubham ✦ Vidisha — Shubh Vivah · 24 Nov',
        'desc': 'Gurchadi · Baraat Prasthan · Shubh Vivah — Tuesday, 24 November 2026 · 3rd Milestone, Meerut',
    },
    '23-24': {
        'edition': 'full',
        'title': 'Shubham ✦ Vidisha — Shubh Vivah · 20–24 Nov',
        'desc': 'Haldi, Mehandi, Mandha, Preetibhoj (20–23 Nov) and the wedding on Tuesday, 24 November 2026 · Meerut',
    },
}


OLD_TITLE = '<title>Shubham ✦ Vidisha — Shubh Vivah</title>'
OLD_OG_TITLE = '<meta property="og:title" content="Shubham ✦ Vidisha — Shubh Vivah" />'
HEAD = '<meta charset="UTF-8" />'


def build(folder, cfg):
    html = SRC
    for needle in (OLD_TITLE, OLD_OG_TITLE, HEAD):
        if needle not in html:
            raise SystemExit(f'build_editions: expected marker not found in index.html: {needle}')
    html = html.replace(HEAD, f'{HEAD}\n  <base href="../" />\n  <script>window.EDITION = "{cfg["edition"]}";</script>', 1)
    html = html.replace(OLD_TITLE, f'<title>{cfg["title"]}</title>', 1)
    html = html.replace(OLD_OG_TITLE, f'<meta property="og:title" content="{cfg["title"]}" />', 1)
    html = _replace_meta(html, 'name="description"', cfg['desc'])
    html = _replace_meta(html, 'property="og:description"', cfg['desc'])
    out = SITE / folder / 'index.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print(f'built {out.relative_to(SITE.parent)}  ({cfg["edition"]})')


def _replace_meta(html, attr, content):
    start = html.find(f'<meta {attr} content="')
    if start == -1:
        return html
    end = html.find('/>', start) + 2
    return html[:start] + f'<meta {attr} content="{content}" />' + html[end:]


if __name__ == '__main__':
    for folder, cfg in EDITIONS.items():
        build(folder, cfg)
