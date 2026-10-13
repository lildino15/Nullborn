"""Independent smoke test for server-generated dungeon maps (floor 1, randomized)."""
import subprocess,os,time,tempfile,urllib.request,urllib.error,json,http.cookiejar,random
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'game'; port=str(random.randrange(43000,52000)); tmp=tempfile.mkdtemp(prefix='nullborn-v55-')
p=subprocess.Popen(['node',str(root/'server.mjs')],env={**os.environ,'PORT':port,'NULLBORN_DATA_DIR':tmp},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def api(route,body=None):
 req=urllib.request.Request('http://127.0.0.1:'+port+route,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
 with op.open(req,timeout=8) as r:return json.load(r)
try:
 time.sleep(.5);assert api('/api/health')['ok']
 api('/api/auth/register',{'email':'layouts@example.com','password':'test-password-123'})
 for i in range(35):
  r=api('/api/common-dungeon',{'action':'enter'})['run'];walls={(w['x'],w['y']) for w in r['walls']}
  start=(r['heroX'],r['heroY']);seen={start};queue=[start]
  for x,y in queue:
   for dx,dy in ((0,1),(0,-1),(1,0),(-1,0)):
    pos=(x+dx,y+dy)
    if 0<=pos[0]<7 and 0<=pos[1]<7 and pos not in walls and pos not in seen:seen.add(pos);queue.append(pos)
  assert all((e['x'],e['y']) in seen for e in r['enemies'])
  assert all((a['x'],a['y']) in seen for a in r['allies'])
  assert all((c['x'],c['y']) in seen for c in r['loot'])
  api('/api/common-dungeon',{'action':'retreat'})
 print('PASS: 35 randomized floor layouts; all enemies, allies and treasures reachable')
finally:
 p.terminate();p.wait(timeout=5)
