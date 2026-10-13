import subprocess,os,time,tempfile,urllib.request,urllib.error,json,http.cookiejar,random
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'game'; port=str(random.randrange(32000,42000)); tmp=tempfile.mkdtemp(prefix='nullborn-v54-')
p=subprocess.Popen(['node',str(root/'server.mjs')],env={**os.environ,'PORT':port,'NULLBORN_DATA_DIR':tmp},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def api(route,body=None):
 req=urllib.request.Request('http://127.0.0.1:'+port+route,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
 try:
  with op.open(req,timeout=8) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  if e.code==429:
   time.sleep(1.1);return api(route,body)
  raise RuntimeError(f'{e.code}: {e.read().decode()}')
try:
 time.sleep(.4)
 for path in ['/common.html','/motion-v54.css','/illustrated-world.css','/battlefield-v45.css','/rarity-v49.css','/art/anime-nullborn.webp','/manifest.webmanifest']:
  with op.open('http://127.0.0.1:'+port+path) as r:assert r.status==200 and len(r.read())>100,(path,r.status)
 print('PASS: 7 critical game assets',flush=True)
 api('/api/auth/register',{'email':'smoke@example.com','password':'test-password-123'})
 for floor in range(1,11):
  d=api('/api/common-dungeon',{'action':'enter'});r=d['run'];assert r['floor']==floor
  assert all(0<=w['x']<7 and 0<=w['y']<7 for w in r['walls'])
  blocked={(w['x'],w['y']) for w in r['walls']}; start=(r['heroX'],r['heroY']); seen={start}; todo=[start]
  for x,y in todo:
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
    n=(x+dx,y+dy)
    if 0<=n[0]<7 and 0<=n[1]<7 and n not in blocked and n not in seen:seen.add(n);todo.append(n)
  assert all((e['x'],e['y']) in seen for e in r['enemies']),f'unreachable enemy floor {floor}'
  # Retry encounters on defeat; this verifies progression is reachable under the actual combat rules.
  for attempt in range(25):
   for turn in range(110):
    live=[e for e in r['enemies'] if e['hp']>0]
    if not live:break
    target=min(live,key=lambda e:abs(e['x']-r['heroX'])+abs(e['y']-r['heroY']))
    dist=abs(target['x']-r['heroX'])+abs(target['y']-r['heroY'])
    if dist<=3: payload={'action':'fire','runId':r['id'],'targetId':target['id']}
    else:
     occupied={(e['x'],e['y']) for e in live}|blocked|{(a['x'],a['y']) for a in r['allies'] if a['hp']>0}
     opts=[(r['heroX']+dx,r['heroY']+dy) for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]]
     opts=[(x,y) for x,y in opts if 0<=x<7 and 0<=y<7 and (x,y) not in occupied]
     if opts:
      x,y=min(opts,key=lambda xy:abs(xy[0]-target['x'])+abs(xy[1]-target['y']))
      payload={'action':'move','runId':r['id'],'x':x,'y':y}
     else:payload={'action':'guard','runId':r['id']}
    d=api('/api/common-dungeon',payload)
    if d.get('run'):r=d['run']
    if d.get('victory') or d.get('defeat'):break
   if d.get('victory'):break
   d=api('/api/common-dungeon',{'action':'enter'});r=d['run']
  assert d.get('victory'),f'floor {floor} not cleared after retries'
  print(f'PASS: floor {floor}/10',flush=True)
 assert api('/api/common-dungeon')['completed']==10
 print('PASS: 10-floor dungeon progression',flush=True)
finally:
 p.terminate();p.wait(timeout=5)
