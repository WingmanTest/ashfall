#!/usr/bin/env python3
"""Serve the mockup folder and capture art_A..art_D.png at 1280x720."""
from __future__ import annotations

import http.server
import os
import sys
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PORT = 8765


def start_server():
    os.chdir(ROOT)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


def main():
    start_server()
    styles = ["A", "B", "C", "D"]
    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",
            headless=True,
            args=[
                "--use-angle=swiftshader",
                "--use-gl=angle",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                "--enable-unsafe-swiftshader",
                "--disable-gpu-sandbox",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            device_scale_factor=1,
        )
        page = context.new_page()
        page.set_default_timeout(120_000)
        errors = []
        for style in styles:
            url = f"http://127.0.0.1:{PORT}/index.html?style={style}"
            print(f"capturing {style} {url}", flush=True)
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_function(
                "() => window.__READY === true || window.__READY === 'error'",
                timeout=90_000,
            )
            ready = page.evaluate("() => window.__READY")
            err = page.evaluate("() => window.__ERROR || ''")
            logs = page.evaluate("() => window.__STYLE || ''")
            print(f"  ready={ready} style={logs} err={err}", flush=True)
            if ready != True and ready != "true":
                errors.append(f"{style}: {err or ready}")
                # still try a screenshot for debugging
            out = ROOT / f"art_{style}.png"
            # screenshot the stacked canvases
            page.locator("#stack").screenshot(path=str(out), type="png")
            print(f"  wrote {out} ({out.stat().st_size} bytes)", flush=True)
        browser.close()
    if errors:
        print("ERRORS:", errors)
        sys.exit(1)


if __name__ == "__main__":
    main()
