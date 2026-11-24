# Dark-house captures. Run from /workspace/game2:
#   python3 render/tools/capture_darkhouse.py darkhouse_hero.png:hero:high:refined darkhouse_refined_medium.png:main:medium:refined darkhouse_classic_medium.png:main:medium:classic
# job = outfile:shot(main|hero):tier:look[:crt]  -> render/screenshots/ at 1080x1920
import sys; sys.path.insert(0,'render/tools')
import capture as C
from playwright.sync_api import sync_playwright
C.serve()
jobs=[a.split(':') for a in sys.argv[1:]]  # name:shot:tier:look
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True,args=C.ARGS)
    ctx=b.new_context(viewport={'width':540,'height':960},device_scale_factor=2)
    for name,shot,tier,look,*rest in jobs:
        logs=[]
        pg=C.open_page(ctx,f'http://127.0.0.1:{C.PORT}/render/demo/darkhouse.html?tier={tier}&look={look}&freeze=1&crt={rest[0] if rest else 'low'}&w=1080&h=1920&stats=0&shot={shot}',logs)
        e=pg.evaluate("()=>window.__ERRORS"); bad=[l for l in logs if 'favicon' not in l and '404' not in l and ('error' in l.lower() or 'warn' in l.lower())]
        if e or bad: print('ERR',e,bad[:5])
        C.shot(pg,name,steps=4); pg.close()
    b.close()
