# Backlog

Format: `[BUG]` | `[FEATURE]` | `[REFACTOR]` | `[DEBT]` followed by a concise description and affected files.

[FEATURE] Replace the letter glyphs for monsters and the player on the canvas with matching 32x32 pixel sprites (reuse the character drawings in tools/make-icons.py). Affected: index.html (draw), tools/make-icons.py.
[BUG] Monsters chase with a greedy "step closer" rule, so they can get stuck behind walls and corners instead of pathing around them. Affected: index.html (stepToward, monstersAct).
[FEATURE] Rest command (rest until healed or a monster appears) and auto-explore; walking back to full HP is tedious on a phone. Affected: index.html (input, endTurn), README manual, manual.html.
[FEATURE] Look/inspect: tap-and-hold a monster, item or tile to see its name, HP and stats. Affected: index.html (onTap, draw).
[FEATURE] Sound effects and music with a mute setting. Affected: index.html.
[FEATURE] More equipment slots (helm, boots, gloves, rings, amulet) and wands/rings as loot. Affected: index.html (CAT, eq, pack UI), README manual.
[FEATURE] Monster variety: archers and casters, poison/slow/paralysis, resistances, and packs that flank. Affected: index.html (MON, monstersAct).
[FEATURE] Dungeon features: doors, traps, chests, keys, secret rooms, water. Affected: index.html (makeDungeon, T tiles, drawTile).
[FEATURE] Unidentified potions and scrolls, curses, and a Sage in the village to identify or enchant gear. Affected: index.html (items, shops).
[FEATURE] Spell choice and upgrades (more than 4 fixed spells; Magic stat scaling MP). Affected: index.html (SPELLS, gainXp).
[FEATURE] Character creation: name, class or starting stat allocation, difficulty setting. Affected: index.html (newGame).
[FEATURE] Quests, NPC dialogue and a story arc beyond the single Wyrm fight; second dungeon branch or deeper levels after the win. Affected: index.html.
[FEATURE] Full map view, scrollable message history, and a stats/character screen. Affected: index.html (UI).
[FEATURE] Settings: text size, left-handed d-pad, d-pad on/off, confirm-on-stairs. Affected: index.html.
[DEBT] Balance has not been playtested: XP curve, gold income, shop prices and the depth 8 boss difficulty are untuned; tests only check mechanics. Affected: index.html (MON, CAT, xpNeed).
[DEBT] The whole game state (all levels) is JSON-serialised to localStorage after every turn; may be slow or hit the quota late in a long run. Affected: index.html (save).
[DEBT] PWA install and offline play are only verified in headless Chromium, not on a real Android device, and the live GitHub Pages site has not been loaded from this environment. Affected: sw.js, manifest.json.
[DEBT] Colour-only HP/MP bars and small log text; no screen-reader labels on the canvas. Affected: index.html (HUD, canvas).
