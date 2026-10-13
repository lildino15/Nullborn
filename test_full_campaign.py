import subprocess,os,time,urllib.request,urllib.error,json,http.cookiejar,tempfile,collections,random
PORT='31985'; root='/mnt/data/nullborn_playtest_v57/game'; temp=tempfile.mkdtemp(prefix='nullborn_full_')
p=subprocess.Popen(['node',root+'/server.mjs'],env={**os.environ,'PORT':PORT,'NULLBORN_DATA_DIR':temp},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def api(path,body=None):
 req=urllib.request.Request('http://127.0.0.1:'+PORT+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
 try:
  with op.open(req,timeout=6) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  if e.code==429:
   time.sleep(1.2)
   return api(path,body)
  raise RuntimeError(f'{path} {e.code} {e.read().decode()[:400]}')
def verified_clear():
 for retry in range(15):
  d=api('/api/verified/floor1',{'action':'start'});rid=d['active']['id']
  for j in range(40):
   d=api('/api/verified/floor1',{'action':'strike','runId':rid})
   if d.get('victory'):return
   if d.get('defeat'):break
 raise AssertionError('verified dungeon failed')
def common_floor(expected):
 for retry in range(25):
  d=api('/api/common-dungeon',{'action':'enter'});r=d['run'];assert r['floor']==expected,(expected,r)
  if r['special']:specials.append((expected,r['name'],r['rarity']))
  if expected==10:bosses.append((r['name'],r['rarity']))
  for i in range(200):
   r=d['run'];hero=(r['heroX'],r['heroY']);alive=[e for e in r['enemies'] if e['hp']>0]
   if not alive:break
   target=min(alive,key=lambda e:abs(e['x']-hero[0])+abs(e['y']-hero[1]))
   dist=abs(target['x']-hero[0])+abs(target['y']-hero[1]);rid=r['id']
   if dist<=3:
    action={'action':'fire','runId':rid,'targetId':target['id']}
   else:
    blocked={(w['x'],w['y']) for w in r['walls']}|{(e['x'],e['y']) for e in alive}|{(a['x'],a['y']) for a in r['allies'] if a['hp']>0}
    q=[hero];prev={hero:None};goal=None
    for pos in q:
     if any(abs(e['x']-pos[0])+abs(e['y']-pos[1])<=3 for e in alive):goal=pos;break
     for dx,dy in [(0,-1),(-1,0),(1,0),(0,1)]:
      nxt=(pos[0]+dx,pos[1]+dy)
      if 0<=nxt[0]<7 and 0<=nxt[1]<7 and nxt not in blocked and nxt not in prev:prev[nxt]=pos;q.append(nxt)
    if goal is None:raise AssertionError('No path into attack range')
    while prev[goal]!=hero:goal=prev[goal]
    action={'action':'move','runId':rid,'x':goal[0],'y':goal[1]}
   try:d=api('/api/common-dungeon',action)
   except RuntimeError as e:
    if 'out of range' in str(e):continue
    raise
   if d.get('victory'):
    assert d['victory']['floor']==expected;return
   if d.get('defeat'):
    if r['special']:assert d['sanctuary'] and d['losses']==0
    break
  else:raise AssertionError('Turn limit on floor '+str(expected))
 raise AssertionError('common floor '+str(expected)+' repeated defeats')
def tactics_win():
 for retry in range(10):
  d=api('/api/tactics');t=d['battle']
  if t['phase']=='victory':return
  if t['phase']=='defeat':d=api('/api/tactics',{'action':'retry'});t=d['battle']
  for turn in range(110):
   t=d['battle'];
   if t['phase']!='battle':break
   enemies=[dict(t['boss'],id='boss')]+t['enemies'];enemies=[e for e in enemies if e['hp']>0]
   h=t['hero']; dist=lambda a,b:abs(a['x']-b['x'])+abs(a['y']-b['y'])
   close=sorted(enemies,key=lambda e:dist(h,e));target=close[0]
   if dist(h,target)<=3: action={'action':'fire','target':target['id']}
   else:
    occupied={(u['x'],u['y']) for u in [t['hero'],t['lyra'],t['fenrir'],t['boss']]+t['enemies'] if u['hp']>0}
    occupied|={(w['x'],w['y']) for w in t['walls']}
    opts=[(h['x']+dx,h['y']+dy) for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]]
    opts=[xy for xy in opts if 0<=xy[0]<5 and 0<=xy[1]<5 and xy not in occupied]
    if opts:
     xy=min(opts,key=lambda xy:abs(xy[0]-target['x'])+abs(xy[1]-target['y']))
     action={'action':'move','x':xy[0],'y':xy[1]}
    else:action={'action':'guard'}
   try:d=api('/api/tactics',action)
   except RuntimeError as e:raise AssertionError(f'tactics action {action} failed: {e}')
  if d['battle']['phase']=='victory':return
 raise AssertionError('tactics could not be won')
try:
 time.sleep(.4)
 api('/api/auth/register',{'email':'fullrun@example.com','password':'test-password-123'})
 print('REGISTER PASS',flush=True)
 for c in ['torch','touch','muse','protect','accept']:api('/api/story',{'choice':c})
 verified_clear();api('/api/story',{'choice':'claim'});assert api('/api/story')['story']['completed'];print('CHAPTER 1 PASS',flush=True)
 for c in ['kind','ridge','confide']:api('/api/chapter2',{'choice':c})
 verified_clear();api('/api/chapter2',{'choice':'claim'});api('/api/chapter2',{'choice':'finish'});assert api('/api/chapter2')['chapter']['completed'];print('CHAPTER 2 PASS',flush=True)
 d=api('/api/chapter3',{'action':'begin'})
 for i in range(20):
  if d['chapter']['stage']!='battle':break
  d=api('/api/chapter3',{'action':'fire'})
 assert d['chapter']['completed'],d;print('CHAPTER 3 PASS',flush=True)
 specials=[];bosses=[]
 for floor in range(1,11):
  common_floor(floor);print('COMMON FLOOR',floor,'PASS',flush=True)
 d=api('/api/common-dungeon');assert d['floor']==1 and d['completed']==10
 print('COMMON DUNGEON ALL 10 PASS, boss:',bosses,flush=True)
 tactics_win();print('TACTICAL VICTORY PASS',flush=True)
 api('/api/finale',{'choice':'truth'});api('/api/finale',{'choice':'remember'});d=api('/api/finale',{'choice':'claim'});assert d['finale']['completed'];print('CHAPTER 4 FINALE PASS',d['finale']['ending'],flush=True)
 # check persistence across same server
 assert api('/api/finale')['finale']['completed'];assert api('/api/common-dungeon')['completed']==10
 for page in ['index.html','adventure.html','story.html','chapter2.html','chapter3.html','finale.html','common.html','tactics.html','skills.html','beasts.html','market.html','auction.html']:
  with op.open('http://127.0.0.1:'+PORT+'/'+page) as r:assert r.status==200 and len(r.read())>100
 print('ALL 12 PAGES SERVED PASS',flush=True)
 print('SPECIALS',specials,flush=True)
except Exception as e:
 import traceback;traceback.print_exc();raise
finally:
 p.terminate();p.wait(timeout=5)
 err=p.stderr.read().decode();print('SERVER ERR',err[-1500:],flush=True)
 print('TEST DATA',temp,flush=True)
