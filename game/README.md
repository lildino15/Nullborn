# The Nullborn v4.3 · Visual Edition

Refreshed presentation across the single-player game with a unified navy/gold visual system, original vector cover art, responsive bottom navigation, enhanced tactical tiles, animation, and repaired dungeon sound hooks. All existing v4.2 gameplay is preserved.

## Run

Install Node.js 20+, extract the folder, run `node server.mjs`, and open http://localhost:3000/adventure.html. The game requires its local server for accounts and saved progress. An iPhone must be able to reach that server. Audio requires a user gesture.

## Limitations

This is a visual-quality upgrade and playable alpha, not an App Store-approved iOS application. Original cinematic sprites, professional music mastering, device testing, security review, hosting, and App Store distribution remain separate production tasks.

# The Nullborn v2.2: Simulated Player Crystal Exchange

Run `node server.mjs` and open `http://localhost:3000`. Sign in and select **Simulated Player Crystal Exchange** at the guild, or open `/market.html`. Create two test accounts in separate browser profiles to test trades.

The exchange uses **fictional gold** as its only unit of account. Players receive 200 test crystals and 1,000 extra test gold on their first market action. Buy and sell limit orders reserve balances in server escrow, match at resting-order prices, support cancellation/refunds of unfilled escrow, and persist trades and open orders across server restarts. The last trade price fluctuates based on player transactions. No real dollars, blockchain, withdrawal, or cash-out.

**Security limitations:** Local experimental single-process Node server only. Legacy `/api/save` still trusts client-supplied game state; real deployment requires database transactions, persistent sessions, stronger CSRF protections, anti-bot measures, KYC/legal review if real-world value is ever added, rate limits and abuse monitoring. The demo allocation is for testing only. Do not expose this server publicly.


## v2.3 Market analytics and trading fees
The market page now plots the last 100 completed trade prices and displays 24-hour crystal trading volume. Each executed trade charges the seller a 2% gold fee (rounded down to whole gold); fees are removed from circulation and tracked in server data. Order escrow and matching remain server-side.

The chart is based on completed trades, not an external crypto price. No real-world redemption. This is an experimental, local-only server; do not deploy publicly.


## v2.4 Cosmetic Auction House
Run `node server.mjs`, register or log in, then visit `/auction.html` from the market. The auction uses fictional crystals and collectible sigils, not real-world money. On first auction action, test accounts receive one Moonlit and one Emberglass Sigil. Listings escrow one collectible, bids escrow crystals, outbid bids are refunded, and sellers cannot cancel after bidding. Auctions last one hour and settle when any player requests the auction API after expiry. All transactions are serialized by the existing in-process market lock and persisted to disk.

**Limitations:** The demo does not yet have cross-process database transactions, durable sessions, CSRF defense, robust anti-bot controls, independent reconciliation, or a background settlement worker. Do not deploy publicly.


## v2.5 Chapter One story campaign
Start `node server.mjs`, sign in at `/story.html` with your game account. Branch through the fall, ancient door, Muse naming, caravan, and guild registry. The story saves choices to the server and requires one NEW verified Floor One clear after accepting the guild assignment. Open the main game, use its verified dungeon, and return to claim the quest. Existing v2.4 trading and auction features remain. This is a local prototype; do not deploy publicly.


## v2.6 Chapter Two: The Guild’s First Secret
Complete Chapter One, then open `/chapter2.html`. Lyra friendship changes with branching dialogue. Chapter Two requires one NEW verified dungeon clear after accepting Lyra’s mission. Progress is stored server-side and is resumable. This is a local prototype; Lyra friendship is not yet wired into combat companion stats. No real money or blockchain.


## v2.7 Chapter Three
After finishing Chapters One and Two, open `/chapter3.html`. The Bell Warden has Ice resistance and Fire weakness. Protecting Lyra increases bond; Lyra deals more damage at bond 8+. Battle and reward are saved server-side. On defeat, regroup and retry. The Riftbound Sigil is a fictional collectible. No payments or crypto enabled.


## v2.8 Tactical Trial
Run `node server.mjs`, sign in, finish Chapter Two, then open `/tactics.html`. The 5×5 tactical trial is server-saved and independent from the original Chapter Three battle. Move one orthogonal tile per action; sword range 1, fire range 3. Lyra automatically attacks within 3 tiles. The Warden advances and attacks. Protecting Lyra increases bond. Victory awards a Riftbound Sigil once. No real-money functions.


## Version 2.9: The Three Guardians
Tactical battle now includes Fenrir (wolf ally), Frost Wisp and Ash Imp enemies, blocked stone tiles, target selection, elemental resistance, and server-saved positions. Chapter Two completion is required. Open /tactics.html after logging in. Run `node server.mjs` from this folder, then visit http://localhost:3000. The game is a local development prototype; no real currency is involved.

## v3.0 Beast Guild prototype
Start `node server.mjs`, sign in, then open `/beasts.html`. Search for wild beasts, approach or feed them to bond, and list or buy living companions with fictional gold. Server owns all stable records and trade transfers. Fenrir joins your roster upon opening unlocked tactical combat and, if killed in that battle, is memorialized permanently and does not respawn on retry. Wild companions are collectible/tradeable but are **not yet usable in tactical combat**. No resurrection, real-money payments, or cash-out. This is a local prototype only; do not expose it publicly.


## v3.1: Class Skills and Beast Battles
Open `/skills.html` to equip two active skills and spend three starting training points. Rank 3 grants a class-compatible passive (currently recorded and displayed; passive effects are not yet implemented). Open `/beasts.html` to manage beasts. The server supports `POST /api/beasts` with `{ "action":"deploy", "id":"<beast id>" }` before the first battle turn. A deployed beast appears in `/tactics.html`, automatically moves and attacks, and is moved to the Soul Memorial permanently if killed. Fenrir also remains subject to permadeath. This is a local-server prototype, not a live service.


## v3.2: First Arc Finale
Run `node server.mjs`, complete Chapter Two and win the verified Three Guardians tactical trial, then open `/finale.html`. Two branching story decisions lead to two endings. Completion awards three training points once. Server saves the ending, fallen-beast memorial and Lyra bond. Rank-three Nullborn Void Resonance adds 2 damage to attacks; rank-three Mending Light activates a once-per-battle Last Stand heal. This is a local prototype, not a completed commercial game. Further polish and security hardening required.

## v3.3: Single-player hub and Common Dungeon

Run `node server.mjs`, then visit `http://localhost:3000/adventure.html`. The new `/common.html` Common Dungeon contains 10 consecutive floors, with The Hollow Sentinel as the only boss on Floor 10. Encounters, HP, gold, and materials are recorded on the server. Retreat keeps floor progress. Losing resets the current encounter, not all completed floors. Chapter I-IV links remain available in the hub; their original unlock requirements still apply.

This is an alpha candidate, not a verified production-ready release. Combat is turn-based via buttons, not the tactical grid. Server data is stored in local JSON files, and full iPhone and end-to-end story playthrough tests remain outstanding. This build does not enable real-money payments or cryptocurrency.


## v3.4 Randomized Final Bosses
Floor 10 of the Common Dungeon now selects one of five bosses, weighted by rarity (Common 12/16, Uncommon 4/16). Every boss has its own type, element, weakness, resistance, HP, attack and material reward. Boss selection is performed on the server when the floor starts and persisted for the encounter. Higher-rarity dungeon boss pools are a design rule for future dungeons, not yet implemented. No real-money features.


## v3.5: Sanctuary encounters
Each Common Dungeon encounter rolls a 3% server-side chance of a higher-rarity intruder (Rare or Epic). These encounters are explicitly flagged `special` and `sanctuary`, persist across reloads, and award a unique higher-rarity material on victory. Defeat clears only the active encounter and does not mutate gold, equipment, human NPCs, or beast ownership/death. Normal floor progression is preserved until victory. These encounters do not activate real-money systems.


## v3.6: Single-player polish and save recovery
Adventure Hub now displays authenticated chapter progress, dungeon floor progress, and gold without trusting browser-supplied values. The Common Dungeon has larger mobile touch targets, safe-area padding, clearer battle text, and live announcements. Verified progression saves now keep a `.bak` copy of the previous valid JSON and automatically recover from it if the primary file is unreadable. This is a local single-player alpha, not a hosted production release.


## Version 3.7: Randomized enemy groups

Floors 1–9 generate 1–10 monsters per encounter. Floor 10 generates one randomly selected boss plus 1–5 regular guards. Each monster has individual HP and must be defeated; encounter progress persists with the saved run. The group attacks together with capped damage. Higher-rarity Sanctuary intruders still provide defeat protection and special loot.

## Version 3.8: Floor-specific enemy counts

Floors 1–5 roll 1–5 regular enemies; Floors 6–9 roll 1–10 regular enemies; Floor 10 rolls exactly one randomized boss plus 1–5 guards. Sanctuary encounter protections are unchanged.


## v3.9 Single-player first-level playtest
- Added integrated character ledger (`/character.html`), hero XP, leveling, 2 stat points per level, and Might/Vitality/Focus upgrades, all stored server-side.
- Dungeon encounters award XP; Might increases melee/skill damage, Focus increases Fire Rune damage, Vitality increases HP. Null Pulse deals higher damage with a three-action cooldown.
- Added enemy formation display and audio feedback in the Common Dungeon. Existing sequential group combat remains: **not yet a full multi-unit tactical grid**.
- Added original Web Audio synthesized atmospheric melody and effects with an opt-in sound toggle. Browser requires tapping Sound On to start playback.
- Added PWA manifest, app icon and service worker for installability when hosted via HTTPS or localhost. **The game server must remain online to play or save**; this is not an offline game.
- Launch `node server.mjs` then open `/adventure.html`; for iPhone access use a reachable HTTPS deployment, not the phone's localhost.
- Party recruitment, full dungeon tactical combat, cinematic portraits, and complete production release testing remain future work.

## v4.0: Tactical single-player dungeon and Guild Party
- Common Dungeon now has a persistent 7×7 turn-based battlefield. Tap adjacent empty tiles to move, tap an enemy to select a target, then Strike (range 1), Fire (range 3), or Null Pulse (range 4, cooldown). Enemy positions and movement are saved server-side.
- Enemy units individually advance and attack. Group counts remain Floors 1–5: 1–5, Floors 6–9: 1–10, Floor 10: one randomized boss plus 1–5 guards. Special Sanctuary encounters retain defeat protection.
- New `/party.html` and `/api/party`: recruit Warrior Rin, Ranger Orin or Healer Selene using verified gold; deploy up to three of eight roster members. NPCs automatically attack, heal, move, gain bond and can fall permanently in ordinary dungeon combat. Sanctuary NPCs are protected.
- Story tactical battles remain separate from the replayable Common Dungeon. Existing synthesized ambient music and sound effects remain opt-in through the floating sound control. This build does not contain cinematic sprite animations or an offline standalone iOS application.
- Smoke-tested registration, recruitment, party deployment, tactical movement, combat, victory, XP/rewards, and page delivery. Full 10-floor randomized combat regression, actual iPhone tests, and production security review remain necessary.
- Launch: `node server.mjs`, then `http://localhost:3000/adventure.html`. An iPhone requires the server to be reachable through HTTPS, not its own localhost.


## v4.1 usability and testing

The tactical dungeon now includes a visible music toggle, clearer skill cooldown labels, and a more explicit Sanctuary warning. Server validates target availability. This remains a local-server alpha, not a production iOS release.


## v4.2 Monster Tactics
Monsters now use distinct behavior in the 7×7 Common Dungeon: wisps and spirits attack at range, while melee monsters approach. Bosses announce a charged attack a turn before it fires. Construct bosses use a radius-2 Earthshaker; ice bosses use a range-3 Frozen Lance; other bosses use a range-3 charge. Players can guard, move away, or defeat the boss during the warning turn. Boss special attacks have cooldowns and damage caps. Charged bosses glow on the tactical board. Sanctuary defeat protections and existing randomized enemy counts remain unchanged. This is an alpha and requires further iPhone testing.


## v4.4 animated sprite edition
Original hand-authored SVG hero, warrior, ranger, healer, beast, slime, undead, insect, construct, and boss sprites replace the Common Dungeon emoji tokens. CSS idle animation, attack impacts, fire and void spell bursts, and scene entrance effects respect reduced-motion preferences. Character and party pages also show matching portraits. These are prototype vector sprites, not a full frame-by-frame animation system.


## v4.5 illustrated battlefield upgrade
- Replaced 11 simple shared-face SVG figures with distinct, detailed original vector silhouettes, including wolf, slime, insect, undead, construct, and crowned boss.
- Added procedural stone floor, engraved runes, moss variations, warm torchlight, team-color targeting, richer shadows, and bespoke idle/impact animations.
- Retained gameplay and server APIs from v4.4; artwork is illustrative SVG, not frame-by-frame production animation.
- Updated PWA cache version and cached sprites/styles.

## v4.6 Illustrated World Restoration
Restores a storybook fantasy direction across the hub and tactical dungeon. New illustrated atmospheric dungeon backdrop, stronger cinematic cover treatment, and hero/Lyra/Fenrir party portraits on the hub. No combat rules or save formats changed. The cast portraits reuse current vector assets, not final commissioned illustrations.


## v4.7 Anime Dungeon Edition
Approved anime concept imagery is integrated into the adventure hub, dialogue, and battle scene. Common Dungeon now has server-persisted impassable stone wall tiles and obstacle-aware enemy/ally movement. Art crops come from the supplied/generated composite and are a first integration, not standalone production-ready sprite animations.


## v4.8 Hidden dungeon discoveries
Every entered Common Dungeon floor generates 2–4 server-owned hidden material caches and treasure chests. Move onto a tile to collect it; caches are revealed when you come within one tile. Rewards are immediately added to your persistent gold/materials and discovery journal, including on retreat. Hidden coordinates are excluded from API responses until revealed. The existing 7×7 battle board remains the exploration area; a large room-to-room dungeon is not yet implemented.


## v4.9: Rarity-based discoveries
Common dungeon floors generate 2-3 secret caches with Common 78%, Uncommon 19%, Rare 3% loot. Rare Sanctuary encounters generate 4-5 caches with Common 35%, Uncommon 40%, Rare 23%, Epic 2%. Epic Sanctuary encounters generate 5-6 caches with Common 15%, Uncommon 35%, Rare 35%, Epic 15%. Treasure gold and material yields scale by rarity. These are loot rarity tiers, not separate explorable dungeon maps yet.
