#!/usr/bin/env python3
"""Headless capture + bench for the Ashfall render layer.

Serves /workspace/game2 (read-only use) on 127.0.0.1:8766 and writes ONLY into render/screenshots/.
Usage: python3 render/tools/capture.py [ruins|existing|all] [--bench]
"""
from __future__ import annotations
import http.server, json, os, sys, threading, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

RENDER = Path(__file__).resolve().parents[1]
ROOT = RENDER.parent
OUT = RENDER / 'screenshots'
OUT.mkdir(exist_ok=True)
PORT = 8766


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    h = functools.partial(Quiet, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), h)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()


ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist',
        '--enable-unsafe-swiftshader', '--disable-gpu-sandbox']


def open_page(ctx, url, logs):
    page = ctx.new_page()
    page.set_default_timeout(180_000)
    page.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    page.on('response', lambda r: logs.append(f'[http {r.status}] {r.url}') if r.status >= 400 else None)
    page.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    page.goto(url, wait_until='domcontentloaded')
    page.wait_for_function("() => window.__READY === true || window.__READY === 'error' || (window.__ERRORS && window.__ERRORS.length)", timeout=180_000)
    return page


def shot(page, name, steps=3):
    page.evaluate(f"() => window.__step({steps}, 1/30)")
    page.wait_for_timeout(150)
    page.locator('#c').screenshot(path=str(OUT / name))
    print('  wrote', name, flush=True)


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    bench = '--bench' in sys.argv
    serve()
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True, args=ARGS)
        ctx = browser.new_context(viewport={'width': 540, 'height': 960}, device_scale_factor=1)
        jobs = []
        if which in ('ruins', 'all'):
            for tier in ('low', 'medium', 'high'):
                jobs.append(('ruins', f'render/demo/index.html?tier={tier}&freeze=1&crt=low&stats=0', [(f'ruins_{tier}.png', None)], tier))
            jobs.append(('ruins', 'render/demo/index.html?tier=high&freeze=1&crt=med&mood=dusk&stats=0', [('ruins_dusk_high_crt-med.png', None)], 'high'))
        if which in ('existing', 'all'):
            jobs.append(('existing', 'render/demo/existing.html?style=C&mode=before', [('before_raw_portrait.png', None)], 'before'))
            for tier in ('low', 'medium', 'high'):
                jobs.append(('existing', f'render/demo/existing.html?style=C&tier={tier}&freeze=1&crt=off',
                             [(f'after_{tier}.png', None), (f'after_{tier}_crt-low.png', 'low'), (f'after_{tier}_crt-med.png', 'med')], tier))
            jobs.append(('existing', 'render/demo/existing.html?style=C&tier=high&freeze=1&crt=low&mood=dusk',
                         [('after_dusk_high_crt-low.png', None)], 'high'))
        for kind, path, shots, tier in jobs:
            logs = []
            url = f'http://127.0.0.1:{PORT}/{path}'
            print('open', url, flush=True)
            page = open_page(ctx, url, logs)
            errs = page.evaluate("() => (window.__ERRORS || []).concat(window.__ERROR ? [window.__ERROR] : [])")
            for name, crt in shots:
                if crt:
                    page.evaluate(f"() => window.__pipeline.setCRT('{crt}')")
                shot(page, name)
            if bench:
                r = page.evaluate("() => window.__bench(20, 1/30)")
                results[path] = r
                print('  bench', json.dumps(r), flush=True)
            bad = [l for l in logs if ('error' in l.lower() or 'warn' in l.lower() or '[http' in l) and 'favicon' not in l]
            if errs or bad:
                print('  ERRORS/WARN:', errs, bad[:20], flush=True)
            page.close()
        browser.close()
    if results:
        (OUT / 'timings.json').write_text(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
