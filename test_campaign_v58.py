#!/usr/bin/env python3
"""End-to-end 10-floor Common Dungeon + story campaign test for Nullborn v5.8+."""
import subprocess, os, time, urllib.request, urllib.error, json, http.cookiejar, tempfile, sys

PORT = "3020"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "game")
TEMP = tempfile.mkdtemp(prefix="nullborn_full_")
print(f"ROOT={ROOT} TEMP={TEMP}", flush=True)

p = subprocess.Popen(
    ["node", os.path.join(ROOT, "server.mjs")],
    env={**os.environ, "PORT": PORT, "NULLBORN_DATA_DIR": TEMP, "NULLBORN_POST_LIMIT": "500"},
    stdout=subprocess.DEVNULL,
    stderr=subprocess.PIPE,
)
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

def api(path, body=None, retries=8):
    for attempt in range(retries):
        req = urllib.request.Request(
            f"http://127.0.0.1:{PORT}{path}",
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Content-Type": "application/json"},
        )
        try:
            with op.open(req, timeout=10) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2.0 + attempt * 0.5)
                continue
            raise RuntimeError(f"{path} {e.code} {e.read().decode()[:500]}")
        except Exception:
            if attempt + 1 == retries:
                raise
            time.sleep(0.6)
    raise RuntimeError(f"{path} failed after retries")

def wait_ready(timeout=12):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            h = api("/api/health")
            if h.get("ok"):
                print("HEALTH", h, flush=True)
                return
        except Exception:
            time.sleep(0.3)
    raise RuntimeError("Server did not become ready")

def verified_clear():
    for retry in range(20):
        d = api("/api/verified/floor1", {"action": "start"})
        rid = d["active"]["id"]
        for j in range(50):
            d = api("/api/verified/floor1", {"action": "strike", "runId": rid})
            if d.get("victory"):
                return
            if d.get("defeat"):
                break
    raise AssertionError("verified dungeon failed")

def common_floor(expected):
    specials_local = []
    for retry in range(40):
        d = api("/api/common-dungeon", {"action": "enter"})
        r = d["run"]
        assert r["floor"] == expected, (expected, r.get("floor"), r)
        if r.get("special"):
            specials_local.append((expected, r.get("name"), r.get("rarity")))
        rid = r["id"]
        for i in range(300):
            r = d.get("run") or {}
            if not r:
                if d.get("victory"):
                    assert d["victory"]["floor"] == expected
                    return specials_local
                break
            hero = (r["heroX"], r["heroY"])
            alive = [e for e in r["enemies"] if e["hp"] > 0]
            if not alive:
                try:
                    d = api("/api/common-dungeon", {"action": "strike", "runId": rid, "targetId": "none"})
                except RuntimeError:
                    pass
                if d.get("victory"):
                    assert d["victory"]["floor"] == expected
                    return specials_local
                break
            # Prefer low-HP threats / closest
            target = min(alive, key=lambda e: (e["hp"], abs(e["x"] - hero[0]) + abs(e["y"] - hero[1])))
            dist = abs(target["x"] - hero[0]) + abs(target["y"] - hero[1])
            # Heal if critically low
            if r.get("heroHp", 99) <= 12 and (r.get("potions") or 0) > 0:
                action = {"action": "potion", "runId": rid}
            elif dist <= 3 and (r.get("skillCooldown") or 0) == 0 and len(alive) >= 2:
                action = {"action": "skill", "runId": rid, "targetId": target["id"]}
            elif dist <= 3:
                action = {"action": "fire", "runId": rid, "targetId": target["id"]}
            else:
                blocked = {(w["x"], w["y"]) for w in r.get("walls", [])}
                blocked |= {(e["x"], e["y"]) for e in alive}
                blocked |= {(a["x"], a["y"]) for a in r.get("allies", []) if a["hp"] > 0}
                q = [hero]
                prev = {hero: None}
                goal = None
                for pos in q:
                    if any(abs(e["x"] - pos[0]) + abs(e["y"] - pos[1]) <= 3 for e in alive):
                        goal = pos
                        break
                    for dx, dy in [(0, -1), (-1, 0), (1, 0), (0, 1)]:
                        nxt = (pos[0] + dx, pos[1] + dy)
                        ms = r.get('mapSize') or 7
                        if 0 <= nxt[0] < ms and 0 <= nxt[1] < ms and nxt not in blocked and nxt not in prev:
                            prev[nxt] = pos
                            q.append(nxt)
                if goal is None or goal not in prev:
                    action = {"action": "guard", "runId": rid}
                else:
                    while prev.get(goal) is not None and prev[goal] != hero:
                        goal = prev[goal]
                    if goal == hero or prev.get(goal) is None:
                        action = {"action": "guard", "runId": rid}
                    else:
                        action = {"action": "move", "runId": rid, "x": goal[0], "y": goal[1]}
            try:
                d = api("/api/common-dungeon", action)
            except RuntimeError as e:
                msg = str(e)
                if "429" in msg or "slow" in msg.lower():
                    time.sleep(2.5)
                    continue
                if "Move one tile" in msg or "Invalid" in msg or "recharging" in msg:
                    d = api("/api/common-dungeon", {"action": "guard", "runId": rid})
                else:
                    raise
            if d.get("victory"):
                assert d["victory"]["floor"] == expected
                return specials_local
            if d.get("defeat"):
                if r.get("special"):
                    assert d.get("sanctuary") or d.get("losses") == 0
                break
            time.sleep(0.02)  # gentle pacing
        else:
            raise AssertionError(f"Turn limit on floor {expected}")
    raise AssertionError(f"common floor {expected} repeated defeats")

try:
    wait_ready()
    api("/api/auth/register", {"email": "fullrun@example.com", "password": "test-password-123"})
    print("REGISTER PASS", flush=True)

    for c in ["torch", "touch", "muse", "protect", "accept"]:
        api("/api/story", {"choice": c})
    verified_clear()
    api("/api/story", {"choice": "claim"})
    assert api("/api/story")["story"]["completed"]
    print("CHAPTER 1 PASS", flush=True)

    for c in ["kind", "ridge", "confide"]:
        api("/api/chapter2", {"choice": c})
    verified_clear()
    api("/api/chapter2", {"choice": "claim"})
    api("/api/chapter2", {"choice": "finish"})
    assert api("/api/chapter2")["chapter"]["completed"]
    print("CHAPTER 2 PASS", flush=True)

    d = api("/api/chapter3", {"action": "begin"})
    for i in range(30):
        if d.get("chapter", {}).get("stage") != "battle":
            break
        d = api("/api/chapter3", {"action": "fire"})
    assert d.get("chapter", {}).get("completed"), d
    print("CHAPTER 3 PASS", flush=True)

    specials = []
    bosses = []
    for floor in range(1, 11):
        s = common_floor(floor)
        specials.extend(s)
        if floor == 10:
            bosses.append("floor10")
        print(f"COMMON FLOOR {floor} PASS", flush=True)

    d = api("/api/common-dungeon")
    assert d["floor"] == 1 and d["completed"] == 10, d
    print("COMMON DUNGEON ALL 10 PASS", flush=True)

    # Tactical Three Guardians battle required before finale claim
    def tactics_win():
        for retry in range(15):
            d = api("/api/tactics")
            t = d["battle"]
            if t["phase"] == "victory":
                return
            if t["phase"] == "defeat":
                d = api("/api/tactics", {"action": "retry"})
                t = d["battle"]
            for turn in range(120):
                t = d["battle"]
                if t["phase"] != "battle":
                    break
                enemies = [dict(t["boss"], id="boss")] + list(t.get("enemies") or [])
                enemies = [e for e in enemies if e.get("hp", 0) > 0]
                if not enemies:
                    break
                h = t["hero"]
                def dist(a, b):
                    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])
                target = min(enemies, key=lambda e: dist(h, e))
                if dist(h, target) <= 3:
                    action = {"action": "fire", "target": target["id"]}
                else:
                    occupied = {(u["x"], u["y"]) for u in [t["hero"], t["lyra"], t["fenrir"], t["boss"]] + list(t.get("enemies") or []) if u.get("hp", 0) > 0}
                    occupied |= {(w["x"], w["y"]) for w in t.get("walls") or []}
                    opts = [(h["x"] + dx, h["y"] + dy) for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]]
                    opts = [xy for xy in opts if 0 <= xy[0] < 5 and 0 <= xy[1] < 5 and xy not in occupied]
                    if opts:
                        xy = min(opts, key=lambda xy: abs(xy[0] - target["x"]) + abs(xy[1] - target["y"]))
                        action = {"action": "move", "x": xy[0], "y": xy[1]}
                    else:
                        action = {"action": "guard"}
                try:
                    d = api("/api/tactics", action)
                except RuntimeError as e:
                    if "429" in str(e):
                        time.sleep(2)
                        continue
                    d = api("/api/tactics", {"action": "guard"})
                if d["battle"]["phase"] == "victory":
                    return
            if d["battle"]["phase"] == "victory":
                return
        raise AssertionError("tactics could not be won")

    tactics_win()
    print("TACTICS VICTORY PASS", flush=True)

    # Finale
    api("/api/finale", {"choice": "truth"})
    api("/api/finale", {"choice": "remember"})
    d = api("/api/finale", {"choice": "claim"})
    assert d.get("finale", {}).get("completed"), d
    print("FINALE PASS", d.get("finale", {}).get("ending"), flush=True)

    # Persistence check
    assert api("/api/finale")["finale"]["completed"]
    assert api("/api/common-dungeon")["completed"] == 10

    for page in [
        "index.html", "adventure.html", "story.html", "chapter2.html",
        "chapter3.html", "finale.html", "common.html", "skills.html",
        "beasts.html", "market.html", "auction.html", "party.html", "character.html",
    ]:
        with op.open(f"http://127.0.0.1:{PORT}/{page}") as r:
            assert r.status == 200 and len(r.read()) > 100
    print("ALL PAGES SERVED PASS", flush=True)
    print("SPECIALS", specials, flush=True)
    print("SUCCESS: full campaign verified", flush=True)
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    p.terminate()
    try:
        p.wait(timeout=5)
    except Exception:
        p.kill()
    err = p.stderr.read().decode() if p.stderr else ""
    if err:
        print("SERVER STDERR (tail):", err[-2000:], flush=True)
    print("TEST DATA DIR", TEMP, flush=True)
