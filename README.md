# The Nullborn: Rise of the Forgotten — v5.9.1

Anime fantasy RPG (web / PWA) for iPhone Safari.

## v5.9.1 changes
- **Larger connected dungeon maps**: floors 1–4 stay 7×7; floors 5–8 expand to **9×9**; floors 9–10 use **11×11**. Walls, pathfinding, loot placement, and client grid all scale with `run.mapSize`.
- Configurable POST rate limit (`NULLBORN_POST_LIMIT`, default 150).
- Stronger CSS walk / cast / hit feedback on the battlefield.
- Campaign test updated for dynamic map sizes.

## What works
- Story chapters 1–4 + finale (tactics victory required)
- Common Dungeon 10 floors with bosses, secret caches, rarity tiers, sanctuary events
- Guild / party, permadeath memorial, skills, market, auction, beasts
- Server-authoritative combat, telegraphs, elemental notes
- PWA install, save backup/restore, optional PostgreSQL durable snapshots

## Run locally
```bash
cd game && npm install && npm start
# http://localhost:3000/adventure.html
```

## Private iPhone beta (free hosting)
1. Push this folder to a **private** GitHub repo.
2. Render.com free Web Service:
   - Root: `game`
   - Build: `npm install --omit=dev`
   - Start: `npm start`
   - Attach free Postgres → set `DATABASE_URL`
   - `NODE_ENV=production`
3. Open the HTTPS URL on iPhone Safari → Share → Add to Home Screen.
4. Play and approve before any App Store step.

`render.yaml` is included for blueprint deploy.

## Remaining (honest)
- Maps are larger single rooms with walls/corridors of obstacles, not multi-room dungeon complexes yet.
- Art is CSS-animated WEBP/SVG portraits, not full multi-frame walk cycles.
- Sessions are in-memory (re-login after restart); Postgres stores durable player data when configured.
- Native iOS shell under `ios/` needs a Mac + Xcode; PWA is the practical path today.

Continue from this source.
