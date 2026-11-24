#!/usr/bin/env python3
"""Classic vs refined look: same scene/camera per tier at a 1080x1920 canvas (phone-like, 1:1 pixels).
Writes render/screenshots/look_{classic,refined}_{tier}.png, refined CRT shots, compare sheet,
zoomed crops and timings_looks.json (SwiftShader => relative only)."""
import json, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import capture as C
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

C.serve()
OUT = C.OUT
bench = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=C.ARGS)
    ctx = b.new_context(viewport={'width': 540, 'height': 960}, device_scale_factor=2)
    jobs = []
    for look in ('classic', 'refined'):
        for tier in ('low', 'medium', 'high'):
            jobs.append((look, tier, 'day'))
    jobs.append(('classic', 'high', 'dusk'))
    jobs.append(('refined', 'high', 'dusk'))
    for look, tier, mood in jobs:
        logs = []
        url = f'http://127.0.0.1:{C.PORT}/render/demo/existing.html?style=C&look={look}&tier={tier}&freeze=1&crt=off&w=1080&h=1920&mood={mood}'
        pg = C.open_page(ctx, url, logs)
        errs = pg.evaluate("() => window.__ERRORS || []")
        sfx = '' if mood == 'day' else '_dusk'
        C.shot(pg, f'look_{look}_{tier}{sfx}.png')
        if mood == 'day':
            if look == 'refined':
                for crt in ('low', 'med'):
                    pg.evaluate(f"() => window.__pipeline.setCRT('{crt}')")
                    C.shot(pg, f'look_refined_{tier}_crt-{crt}.png')
                pg.evaluate("() => window.__pipeline.setCRT('off')")
            r = pg.evaluate("() => window.__bench(12, 1/30)")
            pg.evaluate("() => { const p = window.__pipeline; p.profile = true; p.stats.passes = {}; window.__step(12, 1/30); p.profile = false; }")
            passes = pg.evaluate("() => window.__pipeline.stats.passes")
            bench[f'{look}/{tier}'] = {'avg_ms': round(r['avg'], 1), 'internal': r['stats']['internal'],
                                      'passes_ms': {k: round(v, 1) for k, v in passes.items()}}
            print(look, tier, bench[f'{look}/{tier}'], flush=True)
        bad = [l for l in logs if ('error' in l.lower() or 'warn' in l.lower()) and 'favicon' not in l and '404' not in l]
        if errs or bad:
            print('  ERRORS:', errs, bad[:10], flush=True)
        pg.close()
    b.close()
(OUT / 'timings_looks.json').write_text(json.dumps(bench, indent=2))

# side-by-side compare: rows = tiers, cols = classic | refined
cell = (540, 960)
rows = ['low', 'medium', 'high', 'high_dusk']
sheet = Image.new('RGB', (cell[0] * 2 + 30, (cell[1] + 28) * len(rows) + 10), (10, 12, 16))
d = ImageDraw.Draw(sheet)
for r, t in enumerate(rows):
    for c, look in enumerate(('classic', 'refined')):
        im = Image.open(OUT / f'look_{look}_{t}.png').convert('RGB').resize(cell, Image.LANCZOS)
        x, y = 10 + c * (cell[0] + 10), 10 + r * (cell[1] + 28)
        meta = bench.get(f'{look}/{t}', {})
        res = 'x'.join(map(str, meta.get('internal', []))) if meta else ''
        d.text((x + 4, y), f'{look.upper()}  {t}  {res}', fill=(210, 220, 230))
        sheet.paste(im, (x, y + 18))
sheet.save(OUT / 'compare_classic_vs_refined.png')

# zoomed crops (campfire + zombie region), nearest 3x, from the full-res 1080x1920 shots
box = (150, 820, 690, 1180)  # x0,y0,x1,y1 in 1080x1920 canvas px
crops = []
for look in ('classic', 'refined'):
    im = Image.open(OUT / f'look_{look}_high_dusk.png').convert('RGB').crop(box)
    crops.append(im.resize((im.width * 2, im.height * 2), Image.NEAREST))
z = Image.new('RGB', (crops[0].width * 2 + 30, crops[0].height + 40), (10, 12, 16))
dz = ImageDraw.Draw(z)
for i, (im, lbl) in enumerate(zip(crops, ('CLASSIC 216x384 (palette 32, bayer4)', 'REFINED 360x640 (palette 64, bayer8 soft)'))):
    z.paste(im, (10 + i * (im.width + 10), 30)); dz.text((14 + i * (im.width + 10), 8), lbl + '  - 2x nearest zoom', fill=(210, 220, 230))
z.save(OUT / 'zoom_pixel_detail_classic_vs_refined.png')
print('done')
