"""Generate the dated edition pages from wedding-site/index.html.

  wedding-site/23/index.html     -> Haldi, Mehandi, Mandha, Preetibhoj        (edition: main)
  wedding-site/24/index.html     -> Gurchadi, Baraat Prasthan, Shubh Vivah   (edition: wedding)
  wedding-site/23-24/index.html  -> all of the above                         (edition: full)
  wedding-site/vidisha/index.html -> the /24/ page from the bride's side      (edition: wedding, side: bride)
                                     (Vidisha first, her parents, Shubh Vivah only, no Rali Chauhan)

Each page reuses the shared css/js/assets via <base href="../">, so there is
only one source file to edit. Run locally with:  python3 tools/build_editions.py
(The GitHub Pages workflow runs it automatically before publishing.)
"""
import re
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
    'vidisha': {
        'edition': 'wedding',
        'side': 'bride',
        'title': 'Vidisha ✦ Shubham — Shubh Vivah · 24 Nov',
        'desc': 'शुभ विवाह — Dr. Vidisha & Shubham · Tuesday, 24 November 2026 · 3rd Milestone, Meerut',
    },
}

# Bride-side (Vidisha) rewrites, applied to index.html before the edition is built.
# Each (old, new) pair must match exactly once, so a change to index.html that
# breaks one fails the build loudly instead of shipping the groom's text.
BRIDE_SIDE = [
    # cover: names + figures (bride on the left; CSS below mirrors them to face each other)
    ('<img class="cover-fig fig-l" src="assets/art/groom-gold.png"', '<img class="cover-fig fig-l" src="assets/art/bride-gold.png"'),
    ('<img class="cover-fig fig-r" src="assets/art/bride-gold.png"', '<img class="cover-fig fig-r" src="assets/art/groom-gold.png"'),
    ('<h1 class="cover-names"><span>Shubham</span><i class="deva">संग</i><span>Vidisha</span></h1>',
     '<h1 class="cover-names"><span>Vidisha</span><i class="deva">संग</i><span>Shubham</span></h1>'),
    # hero
    ('<span class="name name-1">Shubham</span>', '<span class="name name-1">Vidisha</span>'),
    ('<span class="name name-2">Vidisha</span>', '<span class="name name-2">Shubham</span>'),
    # invitation scroll: Vidisha's parents invite, Vidisha first
    ('''              <p class="inv-parents deva">श्रीमती सुरेश देवी एवं श्री अन्जुम चौहान</p>
              <p class="inv-line deva">अपने प्रिय सुपुत्र</p>
              <h2 class="inv-name deva">चि० शुभम चौहान</h2>
              <p class="inv-small deva">(सुपौत्र स्व० श्रीमती ओमवती चौहान एवं स्व० श्री श्याम सिंह चौहान)</p>
              <p class="inv-sang deva">संग</p>
              <h2 class="inv-name deva">आयु० डा० विदिशा चौहान</h2>
              <p class="inv-small deva">(सुपुत्री श्रीमती माया चौहान एवं श्री जितेन्द्र चौहान)<br />निवासी : ग्राम-मटौर, दौराला, मेरठ</p>''',
     '''              <p class="inv-parents deva">श्रीमती माया चौहान एवं श्री जितेन्द्र चौहान</p>
              <p class="inv-line deva">अपनी प्रिय सुपुत्री</p>
              <h2 class="inv-name deva">आयु० डा० विदिशा चौहान</h2>
              <p class="inv-small deva">(सुपौत्री स्व० श्री ओमपाल सिंह एवं स्व० श्रीमती जगरोशनी देवी)<br />निवासी : ग्राम-मटौर, दौराला, मेरठ</p>
              <p class="inv-sang deva">संग</p>
              <h2 class="inv-name deva">चि० शुभम चौहान</h2>
              <p class="inv-small deva">(सुपुत्र श्रीमती सुरेश देवी एवं श्री अन्जुम चौहान)</p>'''),
    ('<b>Smt. Suresh Devi &amp; Shri Anjum Chauhan</b> request the honour of your presence at the sacred wedding of their beloved son <b>Shubham</b> with <b>Dr. Vidisha</b>.',
     '<b>Smt. Maya Chauhan &amp; Shri Jitendra Chauhan</b> request the honour of your presence at the sacred wedding of their beloved daughter <b>Dr. Vidisha</b>, granddaughter of Late Shri Ompal Singh &amp; Late Smt. Jagroshni Devi, with <b>Shubham</b>.'),
    # couple card: Vidisha's grandparents
    ('<p class="p-rel muted">Gram Mataur, Daurala, Meerut</p>',
     '<p class="p-rel muted">Granddaughter of Late Shri Ompal Singh &amp; Late Smt. Jagroshni Devi</p>\n            <p class="p-rel muted">Gram Mataur, Daurala, Meerut</p>'),
    # couple: bride card first (left)
    ('<p class="eyebrow deva">॥ वर · वधु ॥</p>', '<p class="eyebrow deva">॥ वधु · वर ॥</p>'),
    # events: drop Gurchadi + Baraat Prasthan, Vidisha first in the wedding blurb
    ('<article class="ev ev-left" data-only="wedding full">\n            <div class="ev-card">\n              <div class="ev-icon"><img src="assets/art/groom-maroon.png"', None),
    ('<article class="ev ev-right" data-only="wedding full">\n            <div class="ev-card">\n              <div class="ev-icon"><img src="assets/art/turhi-l-maroon.png"', None),
    ('            <div class="ev-card">\n              <div class="ev-icon"><svg viewBox="0 0 64 64"><path d="M32 10c7',
     '            <img class="ev-flank" src="assets/art/kalash-maroon.png" alt="" aria-hidden="true" />\n            <div class="ev-card">\n              <div class="ev-icon"><svg viewBox="0 0 64 64"><path d="M32 10c7'),
    ('<p class="ev-time"><span class="deva">विवाह स्थल</span> · 3rd Milestone, Meerut</p>',
     '<p class="ev-time"><span class="deva">विवाह स्थल</span> · 3rd Milestone, Meerut</p>\n              <span class="ev-rule" aria-hidden="true"></span>'),
    ('Shubham and Vidisha begin their life together.</p>\n            </div>\n          </article>',
     'Vidisha and Shubham begin their life together.</p>\n              <a class="ev-venue-link" href="#venue">View venue &amp; directions</a>\n            </div>\n            <img class="ev-flank" src="assets/art/kalash-maroon.png" alt="" aria-hidden="true" />\n          </article>'),
    # venue: only the wedding venue (no Rali Chauhan card)
    ('<article class="venue-card">\n            <p class="vc-events"><span data-only="main">', None),
    # family: Vidisha's side
    ('''              <li><span class="deva">राजेन्द्र चौहान</span><em>Rajendra Chauhan</em></li>
              <li><span class="deva">आजाद चौहान</span><em>Azad Chauhan</em></li>
              <li><span class="deva">राहुल चौहान</span><em>Rahul Chauhan</em></li>
              <li><span class="deva">सचिन चौहान</span><em>Sachin Chauhan</em></li>''',
     '''              <li><span class="deva">योगराज चौहान</span><em>Yograj Chauhan</em></li>'''),
    ('''            <h3 class="deva">अन्जुम चौहान (पप्पू)</h3>
            <p class="fam-en">Anjum Chauhan (Pappu)</p>
            <p class="fam-addr deva">ग्राम-राली चौहान, किला रोड, मेरठ</p>
            <div class="phones">
              <a href="tel:+919719206628">97192 06628</a>
              <a href="tel:+919717354161">97173 54161</a>
              <a href="tel:+917983959227">79839 59227</a>
            </div>''',
     '''            <h3 class="deva">श्रीमती माया चौहान एवं श्री जितेन्द्र चौहान</h3>
            <p class="fam-en">Smt. Maya Chauhan &amp; Shri Jitendra Chauhan</p>
            <p class="fam-addr deva">ग्राम-मटौर, दौराला, मेरठ</p>'''),
    ('''              <li><span class="deva">ओमेन्द्र चौहान</span><em>Omendra Chauhan</em></li>
              <li><span class="deva">निखिल चौहान</span><em>Nikhil Chauhan</em></li>''',
     '''              <li><span class="deva">सारंग चौहान</span><em>Sarang Chauhan</em></li>
              <li><span class="deva">नितिन चौहान</span><em>Nitin Chauhan</em></li>'''),
    # closing
    ('<p class="closing-names"><span>Shubham</span><i>&amp;</i><span>Vidisha</span></p>',
     '<p class="closing-names"><span>Vidisha</span><i>&amp;</i><span>Shubham</span></p>'),
]

BRIDE_CSS = '''  <style>
    .cover-fig { scale: -1 1; }
    .venue-grid { max-width: 520px; }
    /* single wedding event: centred card between two kalash, no winding timeline */
    .events .tl-svg, .events .tl-diya { visibility: hidden; }
    .events .timeline { padding-top: 10px; }
    .events .ev { justify-content: center; align-items: center; gap: clamp(18px, 4vw, 56px); padding-left: 0; }
    .events .ev-card { width: min(540px, 100%); padding: 52px 48px 42px;
      box-shadow: 0 40px 80px -36px rgba(90,15,27,.55), 0 0 0 1px rgba(156,122,60,.25), inset 0 0 0 8px #fffaf0, inset 0 0 0 9px rgba(156,122,60,.4); }
    .events .ev-card::before { content: ""; position: absolute; inset: -40px -60px; z-index: -1; pointer-events: none;
      background: radial-gradient(closest-side, rgba(242,165,22,.22), transparent); }
    .events .ev-icon { width: 84px; height: 84px; }
    .events .ev-icon svg { width: 76px; height: 76px; }
    .events .ev-time { display: inline-block; margin-top: 2px; }
    .events .ev-rule { display: block; width: 140px; height: 12px; margin: 14px auto 2px;
      background: radial-gradient(circle, var(--gold-deep) 0 3px, transparent 3.5px) center / 12px 12px no-repeat,
                  linear-gradient(90deg, transparent, var(--gold-deep) 30%, var(--gold-deep) 70%, transparent) center / 100% 1px no-repeat; }
    .events .ev-name { font-size: clamp(52px, 7vw, 76px); }
    .events .ev-desc { max-width: 380px; margin-inline: auto; }
    .ev-venue-link { display: inline-block; margin-top: 22px; padding: 10px 22px; border-radius: 999px; border: 1px solid rgba(156,122,60,.6);
      font-family: var(--f-caps); font-size: 11.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--wine); text-decoration: none;
      background: rgba(255,250,240,.7); transition: background .3s, color .3s; }
    .ev-venue-link:hover { background: var(--wine); color: #fff6e0; }
    .ev-flank { height: clamp(130px, 15vw, 190px); width: auto; flex: none; opacity: .9; filter: drop-shadow(0 12px 18px rgba(90,15,27,.18)); }
    @media (max-width: 760px) {
      .ev-flank { display: none; }
      .events .ev, .events .ev-left, .events .ev-right { justify-content: center; padding-left: 0; }
      .events .ev-card { padding: 34px 20px 28px; }
      .events .ev-name { font-size: 46px; }
    }
  </style>
'''


OLD_TITLE = '<title>Shubham ✦ Vidisha — Shubh Vivah</title>'
OLD_OG_TITLE = '<meta property="og:title" content="Shubham ✦ Vidisha — Shubh Vivah" />'
HEAD = '<meta charset="UTF-8" />'


def bride_side(html):
    for old, new in BRIDE_SIDE:
        if html.count(old) != 1:
            raise SystemExit(f'build_editions: bride-side marker must match exactly once: {old[:80]!r}')
        if new is None:  # drop the whole element that starts at `old`
            html = _drop_element(html, old)
        else:
            html = html.replace(old, new, 1)
    # couple: move the bride's card in front of the groom's
    groom = _element_at(html, '<article class="person person-groom">')
    bride = _element_at(html, '<article class="person person-bride">')
    knot = _element_at(html, '<div class="couple-knot"')
    gs, be = html.index(groom), html.index(bride) + len(bride)
    html = html[:gs] + bride + '\n\n          ' + knot + '\n\n          ' + groom + html[be:]
    return html.replace('<link rel="stylesheet" href="css/style.css" />', '<link rel="stylesheet" href="css/style.css" />\n' + BRIDE_CSS.rstrip('\n'), 1)


def _element_at(html, start_marker):
    """Return the full element (balanced on its tag name) that begins at start_marker."""
    start = html.index(start_marker) + len(start_marker) - len(start_marker.lstrip())
    tag = re.match(r'<([a-z0-9]+)', html[start:]).group(1)
    depth, i = 0, start
    while True:
        o = html.find(f'<{tag}', i)
        c = html.find(f'</{tag}>', i)
        if c == -1:
            raise SystemExit(f'build_editions: unclosed <{tag}> at {start_marker.strip()[:60]!r}')
        if o != -1 and o < c:
            depth += 1
            i = o + 1
        else:
            depth -= 1
            i = c + len(tag) + 3
            if depth == 0:
                return html[start:i]


def _drop_element(html, start_marker):
    el = _element_at(html, start_marker)
    start = html.index(el)
    line_start = html.rfind('\n', 0, start) + 1  # include the element's indentation
    end = start + len(el)
    while html[end:end + 1] == '\n':  # and the blank lines after it
        end += 1
    return html[:line_start] + html[end:]


def build(folder, cfg):
    html = bride_side(SRC) if cfg.get('side') == 'bride' else SRC
    for needle in (OLD_TITLE, OLD_OG_TITLE, HEAD):
        if needle not in html:
            raise SystemExit(f'build_editions: expected marker not found in index.html: {needle}')
    html = html.replace(HEAD, f'{HEAD}\n  <base href="../" />\n  <script>window.EDITION = "{cfg["edition"]}"; window.SIDE = "{cfg.get("side", "groom")}";</script>', 1)
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
