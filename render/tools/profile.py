#!/usr/bin/env python3
"""Per-pass timing (SwiftShader, so CPU-bound and only relative) on Echo's scene, all tiers."""
import json, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import capture as C
from playwright.sync_api import sync_playwright
C.serve()
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=C.ARGS)
    ctx = b.new_context(viewport={'width': 540, 'height': 960})
    for tier in ('low', 'medium', 'high'):
        logs = []
        pg = C.open_page(ctx, f'http://127.0.0.1:{C.PORT}/render/demo/existing.html?style=C&tier={tier}&freeze=1&crt=low', logs)
        r = pg.evaluate("() => { const p = window.__pipeline; p.profile = true; p.stats.passes = {}; window.__step(15, 1/30); return p.stats.passes; }")
        out[tier] = {k: round(v, 1) for k, v in r.items()}
        print(tier, out[tier], flush=True)
        pg.close()
    b.close()
(C.OUT / 'pass_timings_swiftshader.json').write_text(json.dumps(out, indent=2))
