# Keep of the Gales

A small **Castle of the Winds**-style roguelike that runs entirely in your browser. Shop in the village of Windhallow, descend eight levels of the Keep, level up, learn spells, and slay the **Gale Wyrm**.

**▶ Play it: <a href="https://adambeltz2.github.io/Keep-of-the-Gales/" target="_blank" rel="noopener">https://adambeltz2.github.io/Keep-of-the-Gales/</a>**

It is a single static page with no build step and no dependencies. It installs as a PWA (works offline, phone-friendly) and autosaves to your browser.

## Install on your phone

Open the link above in Chrome on Android, then use the menu → **Install app** (or **Add to Home screen**). Visit once online so the files are cached; after that it plays offline.

## How to play

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move / attack | Tap a tile (auto-walks), or the d-pad | Arrows, WASD, vi-keys (`hjklyubn`), numpad |
| Wait a turn | `Wait` / centre of d-pad | `.` or `Space` |
| Spells | Spell buttons | `1`–`4` |
| Pack (equip, use, drop) | `Pack` | `I` |
| Quaff the best-fit healing potion | `Quaff` | `Q` |
| Use stairs | `Stairs` (or walk onto them) | `>` / `<` |
| Close a window | ✕ | `Esc` |

- **Village:** door signs mark the shops: `W` weapons, `A` armor, `P` potions and scrolls, `+` healing temple. Shops buy loot back at one third of its value. The staircase at the bottom of the map leads into the Keep.
- **Spells** unlock as you level: Missile (1), Heal (2), Blink (4), Chain Bolt (6).
- **Scroll of Town Portal:** read in the Keep to jump home; read in the village to return to the depth you left.
- **Death is permanent.** There is one save slot (browser `localStorage`).

## Run locally

```sh
npm start          # serves http://localhost:8080  (a service worker needs http, not file://)
```

## Tests

Regression tests drive the real page in headless Chromium via <a href="https://playwright.dev/" target="_blank" rel="noopener">Playwright</a>.

```sh
npm install
npx playwright install chromium
npm test                 # all scenarios
npm test -- SHOP         # only scenarios whose name contains "SHOP"
CHROMIUM_PATH=/path/to/chromium npm test    # use an existing browser binary
```

Scenarios (deterministic seeded RNG where outcomes depend on chance):

| Area | ID | What it protects |
| --- | --- | --- |
| PWA | PWA-01..07 | loads without JS errors; favicon / apple-touch / manifest links resolve; manifest is installable (192, 512 and maskable PNGs with real sizes); service worker precaches every file; **works offline after reload**; old caches purged on upgrade; no horizontal scroll on phones |
| New game | NEW-01..02 | starting stats and kit; village shops and stairs reachable |
| Shops | SHOP-01..06 | buy / sell maths, category limits, healer pricing, full pack, shop doors |
| Levels | LVL-01..04 | stairs round-trip; every level 1–8 connected and sanely populated across many seeds; depth-appropriate monsters; levels persist |
| Combat | CMB-01..08 | kills and XP, level-ups and spell unlocks, every spell, armor, sleeping/awake AI, death and restart, **winning the game** |
| Items | ITM-01..07 | potions, pickup / drop / full pack, Town Portal both ways, mapping, teleport |
| UI | UI-01..05 | keyboard, click-to-walk (and stopping for hostiles), touch controls, HUD and log, menu |
| Saves | SAV-01..04 | exact reload round-trip, corrupt or old saves, no-`localStorage` mode, new game |
| Soak | SOAK-01 | 50 random games × 1200 actions: no exceptions, no player-in-wall, stats in range |

## Files

`CLAUDE.md` holds the agent/contributor rules and `backlog.md` the deferred ideas. `index.html` is the whole game. `sw.js` and `manifest.json` provide offline play and installability; `icon*.png/svg`, `apple-touch-icon.png` and `favicon.ico` are the icons, generated as 32×32 pixel art by `tools/make-icons.py` (needs Pillow; `python3 tools/make-icons.py wyrm` swaps the character: `champion` (current), `wyrm`, `skeleton`, `ogre`). When you change any shipped file, bump `CACHE` in `sw.js` so installed copies refresh.

## Deploying

GitHub Pages → **Deploy from a branch** → `main` / root. There's nothing to build.
