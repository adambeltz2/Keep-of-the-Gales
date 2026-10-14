# Keep of the Gales

A small **Castle of the Winds**-style roguelike that runs entirely in your browser. Shop in the village of Windhallow, descend eight levels of the Keep, level up, learn spells, and slay the **Gale Wyrm**.

**▶ Play it: <a href="https://adambeltz2.github.io/Keep-of-the-Gales/" target="_blank" rel="noopener">https://adambeltz2.github.io/Keep-of-the-Gales/</a>**

It is a single static page with no build step and no dependencies. It installs as a PWA (works offline, phone-friendly) and autosaves to your browser.

Looking for the rules, spells, gear tables and bestiary? See the [Manual](#manual).

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

- **Village:** door signs mark the shops: crossed swords (weapons), a shield (armor), a green flask (potions and scrolls), a red cross (healing temple). Shops buy loot back at one third of its value. The staircase at the bottom of the map leads into the Keep.
- **Spells** unlock as you level: Missile (1), Heal (2), Blink (4), Chain Bolt (6).
- **Scroll of Town Portal:** read in the Keep to jump home; read in the village to return to the depth you left.
- **Death is permanent.** There is one save slot (browser `localStorage`).

## Manual

Direct link: <a href="https://adambeltz2.github.io/Keep-of-the-Gales/manual.html" target="_blank" rel="noopener">manual.html</a>, which works offline. In game, open it from **Menu → Full manual**. This section is the source: `manual.html` is generated from it by `python3 tools/build-manual.py` (needs the `markdown` package).

### Goal

The wells of Windhallow have run dry and the nights howl. Buy gear, descend the **Keep of the Gales** (8 levels), and kill the **Gale Wyrm** waiting on depth 8. Killing it wins the game; you can keep playing afterwards. There is one hero and one save slot, and death is permanent.

### The turn system

The game is turn-based: nothing moves until you act. Moving, attacking, waiting, casting, quaffing, equipping and using scrolls each take one turn. Opening the pack, shops and menus is free. Every 7 turns you regain 1 HP and every 5 turns 1 MP.

### Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move / attack | Tap an adjacent tile, or the d-pad | Arrows, WASD, vi-keys (`h j k l y u b n`), numpad |
| Auto-walk | Tap any explored tile; walking stops when an awake monster is in view or you are hit | - |
| Wait a turn | `Wait`, or the centre d-pad button | `.` or `Space` |
| Cast a spell | Spell buttons under the map | `1`-`4` |
| Open pack | `Pack` | `I` |
| Quaff best-fit healing potion | `Quaff` | `Q` |
| Use stairs | `Stairs`, or walk onto them | `>` / `<` |
| Menu (how to play, manual, new game) | `Menu` | - |
| Close a window | ✕ | `Esc` |

Moving into a monster attacks it. Moving into a shop door opens that shop. Tapping the tile you stand on uses stairs or waits.

### Your hero

- **Level-ups:** you need `10 x L^2 + 20 x L` total XP to leave level `L` (30 XP for level 2). Each level gives +8 max HP, +3 max MP, +1 Strength, +1 Magic, plus a small free heal (10 HP, 5 MP).
- **Melee damage:** weapon damage + the weapon's enchantment + `floor((Strength - 10) / 3)`. You hit 85% of the time.
- **Armor:** armor and shield values add up. Each time a monster hits you, damage is reduced by a random amount from 0 up to your total armor (minimum 1 damage).
- **Pack:** holds 24 items. Equipment slots: weapon, armor, shield (not counted in the 24).

### Spells

| Key | Spell | Learned | MP | Effect |
| --- | --- | --- | --- | --- |
| 1 | Missile | level 1 | 3 | Hits the nearest visible monster for `4 + Magic/2 + 0-4` |
| 2 | Heal | level 2 | 5 | Restores `10 + Magic` HP |
| 3 | Blink | level 4 | 4 | Teleports you to a random spot 3-7 tiles away |
| 4 | Chain Bolt | level 6 | 9 | Hits up to 3 visible monsters for `8 + Magic/2 + 0-6` each |

Spell buttons appear as you learn them; the key number is the button's position. A spell needs enough MP and (for attacks) a visible target within about 8 tiles, otherwise no mana is spent.

### The village of Windhallow

Doors carry a picture sign: crossed swords for Harrow's Smithy (weapons), a shield for the Iron Sparrow Armory (armor and shields), a green flask for Mistmoor Alchemist (potions and scrolls), and a red cross for the Temple of the Quiet Wind (heals all HP and MP for `10 + 5 x level` gold). Shops pay **one third** of an item's value and only buy their own kind of goods. Enchanted items (`+1`, `+2`...) are worth more. Magic scrolls fizzle in the village, except Town Portal.

The staircase at the bottom of the village leads down into the Keep.

### The Keep

Levels are generated fresh the first time you enter them, then remembered. You see 8 tiles in line of sight; explored tiles stay on the map. Stairs `>` go down, `<` go up. Monsters get tougher with depth. Many start asleep: they can wake each turn you stand within about 4 tiles, and always wake when you attack them. Fast monsters (jackals, dire wolves) act twice per turn.

### Reading the map

Everything on the map is a small picture; the same pictures appear next to items in your pack and in shops.

| Picture | Meaning |
| --- | --- |
| Knight in a plumed helm | You |
| Framed pit with a chevron pointing down / up | Stairs down / stairs up |
| Gold coin pile | Gold |
| Sword | A weapon (blade colour shows its quality: grey iron, steel, blue steel, gold, cyan for the best) |
| Tunic | Body armor (cloth, leather, studded, chain, scale, plate, cyan Gale Plate) |
| Shield | A shield (wood to steel) |
| Flask | A potion: red = Healing, pink = Greater Healing, blue = Mana |
| Scroll | A scroll: cyan seal = Town Portal, gold = Magic Mapping, purple = Teleport |
| Small cyan sparkle on an item | It is enchanted (`+1` or better) |
| Dark face or creature | A monster; its colours hint at its danger (see the bestiary). A blue `z` above it means it is asleep, and a red bar below it shows damage |

### Gear

| Weapon | Damage | Price |
| --- | --- | --- |
| Dagger | 2-4 | 20 |
| Short Sword | 3-6 | 60 |
| Hand Axe | 4-8 | 120 |
| Long Sword | 5-10 | 220 |
| War Hammer | 6-13 | 360 |
| Battle Axe | 8-15 | 550 |
| Broadsword | 10-18 | 800 (found only) |
| Windblade | 12-22 | 1200 (found only) |

| Armor | Value | Price | | Shield | Value | Price |
| --- | --- | --- | --- | --- | --- | --- |
| Cloth Tunic | 1 | 15 | | Buckler | 1 | 30 |
| Leather Armor | 2 | 50 | | Round Shield | 2 | 80 |
| Studded Leather | 3 | 110 | | Kite Shield | 3 | 180 |
| Chain Mail | 5 | 240 | | Tower Shield | 5 | 400 |
| Scale Mail | 7 | 420 | | | | |
| Plate Armor | 9 | 700 | | | | |
| Gale Plate | 12 | 1100 (found only) | | | | |

| Consumable | Effect | Price |
| --- | --- | --- |
| Potion of Healing | +30 HP | 30 |
| Potion of Greater Healing | +80 HP | 90 |
| Potion of Mana | +20 MP | 40 |
| Scroll of Town Portal | In the Keep: jump to the village. In the village: return to the depth you left | 60 |
| Scroll of Magic Mapping | Reveals the whole level | 50 |
| Scroll of Teleport | Moves you to a random floor tile | 40 |

`Quaff` (or `Q`) drinks the smallest healing potion that covers the HP you are missing, or your biggest one if none does.

### Bestiary

| Monster | First seen | Notes |
| --- | --- | --- |
| Giant Rat, Kobold | depth 1 | Weak; good XP for a new hero |
| Jackal | depth 1 | Fast: two actions per turn |
| Goblin | depth 2 | |
| Giant Spider, Skeleton | depth 3 | |
| Orc | depth 4 | |
| Dire Wolf | depth 4 | Fast |
| Ogre | depth 5 | Heavy hitter |
| Wraith, Troll | depth 6 | |
| Stone Golem | depth 7 | 85 HP |
| **Gale Wyrm** | depth 8 | Boss, 200 HP. Starts asleep. Breathes a howling gale every few turns from up to 6 tiles away (8-14 damage, reduced by half your armor) and bites hard in melee |

Each monster type has its own picture, and its colours hint at the danger: dull browns and greens are weak, while bright, glowing-eyed, red-eyed and golden-horned foes are the ones to respect. The Gale Wyrm glows with a pale blue aura.

Monsters drop gold, and sometimes items. Gold and items on the floor are picked up by walking over them (a full pack leaves the item behind).

### Tips

- Spend your starting 100 gold on armor first. Leather Armor (50) plus a Buckler (30) makes depth 1 much safer.
- Fight in corridors so only one monster can reach you.
- Always carry a **Scroll of Town Portal**: read it when hurt, heal and shop, read another to return exactly where you left.
- Sell weapons and armor you have outgrown to fund potions.
- Before depth 8, have 4+ healing potions, a heavy armor set, and at least level 8.
- Chain Bolt is the best answer to packs; Heal costs a turn, so use it between fights, not during a brawl.

### Saving and resetting

The game autosaves after every turn in this browser (local storage). Clearing site data deletes the save. **Menu → New Game** abandons the current hero.

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
| PWA | PWA-01..08 | loads without JS errors; favicon / apple-touch / manifest links resolve; manifest is installable (192, 512 and maskable PNGs with real sizes); service worker precaches every file; **works offline after reload**, including the manual; manual.html in sync with this README; old caches purged on upgrade; no horizontal scroll on phones |
| New game | NEW-01..02 | starting stats and kit; village shops and stairs reachable |
| Shops | SHOP-01..06 | buy / sell maths, category limits, healer pricing, full pack, shop doors |
| Levels | LVL-01..04 | stairs round-trip; every level 1–8 connected and sanely populated across many seeds; depth-appropriate monsters; levels persist |
| Combat | CMB-01..08 | kills and XP, level-ups and spell unlocks, every spell, armor, sleeping/awake AI, death and restart, **winning the game** |
| Items | ITM-01..07 | potions, pickup / drop / full pack, Town Portal both ways, mapping, teleport |
| UI | UI-01..06 | keyboard, click-to-walk (and stopping for hostiles), touch controls, HUD and log, menu, manual link and back link |
| Sprites | SPR-01..03 | every monster, item, stair, sign and hero picture is well-formed; each monster is drawn with its own colours (unknown types fall back to a letter); items, hero, stairs and shop signs render as pictures, and every item has a tier colour |
| Saves | SAV-01..04 | exact reload round-trip, corrupt or old saves, no-`localStorage` mode, new game |
| Soak | SOAK-01 | 50 random games × 1200 actions: no exceptions, no player-in-wall, stats in range |

## Files

`CLAUDE.md` holds the agent/contributor rules and `backlog.md` the deferred ideas. `index.html` is the whole game; `manual.html` is the offline manual (generated). `sw.js` and `manifest.json` provide offline play and installability; `icon*.png/svg`, `apple-touch-icon.png` and `favicon.ico` are the icons, generated as 32×32 pixel art by `tools/make-icons.py` (needs Pillow; `python3 tools/make-icons.py wyrm` swaps the character: `champion` (current), `wyrm`, `skeleton`, `ogre`). When you change any shipped file, bump `CACHE` in `sw.js` so installed copies refresh.

## Deploying

GitHub Pages → **Deploy from a branch** → `main` / root. There's nothing to build.
