import subprocess, os, time, tempfile, urllib.request, urllib.error, json, http.cookiejar, random
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'game'
port = str(random.randrange(32000, 42000))
tmp = tempfile.mkdtemp(prefix='nullborn-economy-')
p = subprocess.Popen(['node', str(root / 'server.mjs')],
                     env={**os.environ, 'PORT': port, 'NULLBORN_DATA_DIR': tmp,
                          # Production rate limits stay in server.mjs; tests raise the caps
                          # so rapid scripted play doesn't trip the anti-spam guards.
                          'NULLBORN_POST_LIMIT': '2000',
                          'NULLBORN_VENDOR_LIMIT': '2000'},
                     stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
for _ in range(50):
    try:
        urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=2).read()
        break
    except Exception:
        time.sleep(0.2)
else:
    raise RuntimeError('server did not start: ' + (p.stderr.read().decode()[-500:] if p.stderr else ''))

def make_api():
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def api(route, body=None, expect=None):
        req = urllib.request.Request('http://127.0.0.1:' + port + route,
            data=json.dumps(body).encode() if body is not None else None,
            headers={'Content-Type': 'application/json'})
        try:
            with op.open(req, timeout=10) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                e.read()
                time.sleep(1.2)
                return api(route, body, expect)
            if expect and e.code == expect:
                return {'_error': e.code, '_body': e.read().decode()[:300]}
            raise RuntimeError(f'{route} -> {e.code}: {e.read().decode()[:300]}')
    return api

def register(api, email):
    api('/api/auth/register', {'email': email, 'password': 'test-password-123'})

def verified_clear(api):
    for _ in range(15):
        d = api('/api/verified/floor1', {'action': 'start'})
        rid = d['active']['id']
        for _ in range(40):
            d = api('/api/verified/floor1', {'action': 'strike', 'runId': rid})
            if d.get('victory'):
                return d['victory']
            if d.get('defeat'):
                break
    raise AssertionError('verified dungeon clear failed')

results = []
def check(name, fn):
    try:
        fn()
        results.append(('PASS', name))
        print(f'PASS: {name}', flush=True)
    except Exception as e:
        results.append(('FAIL', name))
        print(f'FAIL: {name}: {e}', flush=True)

# --- 1. Story loot granted once, flows into shared pools ---
def t_story_loot():
    api = make_api(); register(api, 'story@example.com')
    d = api('/api/story', {'choice': 'torch'}); assert d['story']['scene'] == 'door'
    d = api('/api/story', {'choice': 'touch'}); assert d['story']['scene'] == 'awakening'
    d = api('/api/story', {'choice': 'muse'}); assert d['story']['scene'] == 'caravan'
    d = api('/api/story', {'choice': 'protect'})
    assert d['story']['scene'] == 'guild', d['story']['scene']
    assert d.get('rewards'), 'caravan completion should grant rewards'
    gold_after_caravan = d['verifiedGold']
    assert gold_after_caravan == 60 + 8, gold_after_caravan
    d = api('/api/story', {'choice': 'accept'})
    assert d['story']['scene'] == 'quest'
    assert d.get('rewards'), 'guild completion should grant rewards'
    assert d['verifiedGold'] == gold_after_caravan + 12, d['verifiedGold']
    verified_clear(api)
    before = d['verifiedGold']
    d = api('/api/story', {'choice': 'claim'})
    assert d['story']['completed'] is True
    assert d.get('rewards'), 'quest completion should grant rewards'
    # quest loot: +20 gold on top of whatever the dungeon clear paid
    v = api('/api/verified/floor1')
    assert v['gold'] >= before + 20, (v['gold'], before)
    assert (v['materials'] or {}).get('Iron Fragment', 0) >= 3, v['materials']
    # replay is impossible: story is complete, no choices remain
    r = api('/api/story', {'choice': 'claim'}, expect=409)
    assert r['_error'] == 409
check('story loot granted once into shared pools', t_story_loot)

# --- 2. Vendor sell ---
def t_vendor():
    api = make_api(); register(api, 'vendor@example.com')
    for c in ['torch', 'touch', 'muse', 'protect', 'accept']:
        api('/api/story', {'choice': c})
    verified_clear(api)
    api('/api/story', {'choice': 'claim'})
    v = api('/api/vendor')
    assert v['prices']['Iron Fragment'] == 4, v['prices']
    assert v['materials'].get('Iron Fragment', 0) >= 3, v['materials']
    gold0 = v['gold']
    # forge a weapon (15g + 2 fragments); it auto-equips
    f = api('/api/verified/floor1', {'action': 'forge', 'recipe': 'ironfang'})
    assert any(w['name'] == 'Ironfang Blade' for w in f['weapons'])
    equipped = f['equippedId']
    # cannot sell equipped weapon
    r = api('/api/vendor', {'action': 'sell', 'kind': 'weapon', 'id': equipped}, expect=409)
    assert r['_error'] == 409, r
    # sell one material
    v = api('/api/vendor')
    frags0 = v['materials'].get('Iron Fragment', 0)
    gold0 = v['gold']
    v = api('/api/vendor', {'action': 'sell', 'kind': 'material', 'key': 'Iron Fragment', 'qty': 1})
    assert v['materials'].get('Iron Fragment', 0) == frags0 - 1
    assert v['gold'] == gold0 + 4, (v['gold'], gold0)
    # cannot sell more than owned (valid qty, insufficient balance)
    r = api('/api/vendor', {'action': 'sell', 'kind': 'material', 'key': 'Iron Fragment', 'qty': 500}, expect=409)
    assert r['_error'] == 409
    # quantity out of bounds rejected
    r = api('/api/vendor', {'action': 'sell', 'kind': 'material', 'key': 'Iron Fragment', 'qty': 9999}, expect=400)
    assert r['_error'] == 400
    # unknown material rejected
    r = api('/api/vendor', {'action': 'sell', 'kind': 'material', 'key': 'Dragon Scale', 'qty': 1}, expect=400)
    assert r['_error'] == 400
    # unknown weapon rejected
    r = api('/api/vendor', {'action': 'sell', 'kind': 'weapon', 'id': 'nope'}, expect=404)
    assert r['_error'] == 404
check('vendor sell validates ownership and equipped state', t_vendor)

# --- 3. Market material exchange + crystals still work ---
def t_market():
    apiA = make_api(); register(apiA, 'mkta@example.com')
    apiB = make_api(); register(apiB, 'mktb@example.com')
    for c in ['torch', 'touch', 'muse', 'protect']:
        apiA('/api/story', {'choice': c})
    m = apiA('/api/market')
    assert 'Iron Fragment' in (m['marketableMaterials'] or []), m.keys()
    assert m['materials'].get('Iron Fragment', 0) >= 1
    # A lists 1 Iron Fragment @ 100 gold
    m = apiA('/api/market', {'action': 'place', 'item': 'Iron Fragment', 'side': 'sell', 'quantity': 1, 'price': 100})
    assert any(o['item'] == 'Iron Fragment' and o['side'] == 'sell' for o in m['myOrders']), m['myOrders']
    assert m['materials'].get('Iron Fragment', 0) == 0, 'listed units are reserved'
    aGold0 = m['gold']  # marketAccount initialized on first POST (+1000 gold)
    # B buys it (first POST initializes B too)
    m = apiB('/api/market', {'action': 'place', 'item': 'Iron Fragment', 'side': 'buy', 'quantity': 1, 'price': 100})
    assert (m['materials'] or {}).get('Iron Fragment', 0) == 1, m['materials']
    assert m['gold'] == 1060 - 100, (m['gold'])
    a1 = apiA('/api/market')
    fee = 100 * 200 // 10000
    assert a1['gold'] == aGold0 + 100 - fee, (a1['gold'], aGold0)
    # invalid item rejected
    r = apiA('/api/market', {'action': 'place', 'item': 'Dragon Scale', 'side': 'sell', 'quantity': 1, 'price': 5}, expect=400)
    assert r['_error'] == 400
    # crystals still trade: B sells 5 @ 5, A buys 5 @ 5
    apiB('/api/market', {'action': 'place', 'item': 'crystal', 'side': 'sell', 'quantity': 5, 'price': 5})
    c0 = apiA('/api/market'); cr0, g0 = c0['crystals'], c0['gold']
    apiA('/api/market', {'action': 'place', 'item': 'crystal', 'side': 'buy', 'quantity': 5, 'price': 5})
    c1 = apiA('/api/market')
    assert c1['crystals'] == cr0 + 5 and c1['gold'] == g0 - 25, (c1['crystals'], c1['gold'])
    # cancel refunds reserved materials
    apiA('/api/market')  # ensure initialized
    m = apiA('/api/market', {'action': 'place', 'item': 'crystal', 'side': 'sell', 'quantity': 7, 'price': 50})
    oid = [o['id'] for o in m['myOrders'] if o['item'] == 'crystal' and o['side'] == 'sell' and o['remaining'] == 7][0]
    cr_before = apiA('/api/market')['crystals']
    apiA('/api/market', {'action': 'cancel', 'id': oid})
    assert apiA('/api/market')['crystals'] == cr_before + 7
check('market trades materials and crystals with fees', t_market)

# --- 4. Dungeon expected rewards + delve again ---
def t_dungeon_view():
    api = make_api(); register(api, 'dung@example.com')
    d = api('/api/common-dungeon')
    er = d.get('expectedRewards')
    assert er, 'expectedRewards missing from dungeon view'
    assert er['gold'] == 5 + 1 * 2 and er['xp'] == 10 + 1 * 6, er
    assert er['material'] == 'Iron Fragment' and er['repeatable'] is True
check('dungeon view shows expected grind rewards', t_dungeon_view)

# --- 5. Full flow: chapter2/3 loot, weapon usable and sellable ---
def t_chapters():
    api = make_api(); register(api, 'chap@example.com')
    for c in ['torch', 'touch', 'muse', 'protect', 'accept']:
        api('/api/story', {'choice': c})
    verified_clear(api)
    api('/api/story', {'choice': 'claim'})
    for c in ['kind', 'ridge', 'confide']:
        d = api('/api/chapter2', {'choice': c})
    assert d['chapter']['scene'] == 'trial'
    verified_clear(api)
    d = api('/api/chapter2', {'choice': 'claim'})
    assert d['chapter']['scene'] == 'aftermath'
    d = api('/api/chapter2', {'choice': 'finish'})
    assert d['chapter']['completed'] is True
    assert d.get('rewards'), 'chapter2 completion should grant rewards'
    # chapter 3 battle
    d = api('/api/chapter3', {'action': 'begin'})
    for _ in range(40):
        if d['chapter']['stage'] == 'complete':
            break
        b = d['chapter']['boss']
        act = 'potion' if b['heroHp'] < 12 and b['potions'] > 0 else 'fire'
        d = api('/api/chapter3', {'action': act})
    assert d['chapter']['completed'] is True, d['chapter']['stage']
    assert d.get('rewards'), 'chapter3 completion should grant rewards'
    # chapter3 cannot be replayed for more loot
    r = api('/api/chapter3', {'action': 'begin'}, expect=409)
    assert r['_error'] == 409
    # the granted Ironfang Blade is in the shared pool and sellable (not equipped)
    v = api('/api/vendor')
    w = next((x for x in v['weapons'] if x['name'] == 'Ironfang Blade' and not x['equipped']), None)
    assert w, [x['name'] for x in v['weapons']]
    g0 = v['gold']
    v = api('/api/vendor', {'action': 'sell', 'kind': 'weapon', 'id': w['id']})
    assert v['gold'] == g0 + w['sellValue'], (v['gold'], g0, w['sellValue'])
    assert all(x['id'] != w['id'] for x in v['weapons'])
check('chapter2/3 loot flows into shared vault and sells', t_chapters)

# --- 6. Finale route intact (trial claim requires tactics victory) ---
def t_finale():
    api = make_api(); register(api, 'fin@example.com')
    r = api('/api/finale', expect=409)
    assert r['_error'] == 409  # chapter2 not complete
check('finale gating unchanged', t_finale)

failed = [n for s, n in results if s == 'FAIL']
print(f'\n{len(results) - len(failed)}/{len(results)} economy tests passed', flush=True)
p.terminate()
raise SystemExit(1 if failed else 0)
