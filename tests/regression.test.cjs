/* Regression suite for Keep of the Gales.
 * Runs the real page in headless Chromium (Playwright) against a local static server.
 *   npm install && npx playwright install chromium && npm test
 * Env: CHROMIUM_PATH=/path/to/chromium to use an existing browser binary.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { createServer } = require('./serve.cjs');
const ROOT = path.resolve(__dirname, '..');

// Deterministic RNG injected before the game script runs; tests may reseed with __seed(n).
const SEEDED_RNG = `(() => {
  let s = 12345;
  window.__seed = n => { s = n >>> 0; };
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})();`;

const results = [];
const test = (name, fn) => results.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
const eq = (a, b, msg) => assert(Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b), `${msg || 'expected equal'}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);

let browser, server, base;

async function freshPage(ctxOpts = {}, { seed = 1, skipHelp = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: 'block', ...ctxOpts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.addInitScript(SEEDED_RNG);
  await page.addInitScript(s => window.__seed(s), seed);
  await page.goto(base + '/index.html');
  await page.waitForFunction(() => typeof G !== 'undefined' && G && G.p);
  if (skipHelp) await page.evaluate(() => closeModal());
  return page;
}
const done = async page => { await page.context().close(); };
// Run a function in the page; args are passed as a single JSON-able value.
const ev = (page, fn, arg) => page.evaluate(fn, arg);

/* Put the player on a given level/position with a clean slate of monsters if requested. */
const setup = (page, o) => ev(page, o => {
  newGame(); closeModal();
  if (o.depth) enter(o.depth, 'top');
  if (o.clear) cur().mons.length = 0;
  if (o.p) Object.assign(G.p, o.p);
  computeFov();
}, o);

/* ------------------------------------------------------------------ static / PWA */

test('PWA-01 page loads with no JS errors and shows the how-to-play modal on first visit', async () => {
  const page = await freshPage({}, { skipHelp: false });
  eq(await ev(page, () => $('#mtitle').textContent), 'How to play');
  assert(await ev(page, () => !!document.getElementById('cv')), 'canvas missing');
  eq(await ev(page, () => document.title), 'Keep of the Gales');
  eq(page.errors, [], 'console/page errors');
  await done(page);
});

test('PWA-02 head links: manifest, favicon (svg + ico), apple-touch-icon, theme-color, viewport', async () => {
  const page = await freshPage();
  const links = await ev(page, () => [...document.querySelectorAll('link')].map(l => [l.rel, l.getAttribute('href')]));
  for (const want of [['manifest', 'manifest.json'], ['icon', 'icon.svg'], ['icon', 'favicon.ico'], ['apple-touch-icon', 'apple-touch-icon.png']])
    assert(links.some(l => l[0] === want[0] && l[1] === want[1]), `missing <link rel=${want[0]} href=${want[1]}>`);
  assert(await ev(page, () => !!document.querySelector('meta[name=theme-color]')), 'theme-color');
  assert(await ev(page, () => /width=device-width/.test(document.querySelector('meta[name=viewport]').content)), 'viewport');
  for (const [rel, href] of links) {
    const r = await page.request.get(new URL(href, base + '/').href);
    assert(r.ok(), `${href} returned ${r.status()}`);
  }
  await done(page);
});

test('PWA-03 manifest is installable: required fields, PNG icons 192 + 512 + maskable, real sizes', async () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons'])
    assert(m[k], `manifest.${k} missing`);
  eq(m.display, 'standalone');
  const icons = m.icons;
  const png = (size, purpose) => icons.find(i => i.type === 'image/png' && i.sizes === `${size}x${size}` && i.purpose === purpose);
  assert(png(192, 'any'), '192 any icon'); assert(png(512, 'any'), '512 any icon'); assert(png(512, 'maskable'), '512 maskable icon');
  for (const i of icons) {
    const f = path.join(ROOT, i.src);
    assert(fs.existsSync(f), `${i.src} does not exist`);
    if (i.type === 'image/png') {
      const b = fs.readFileSync(f);
      eq(b.subarray(1, 4).toString(), 'PNG', `${i.src} is not a PNG`);
      eq(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`, i.sizes, `${i.src} real dimensions`);
    }
  }
  assert(fs.statSync(path.join(ROOT, 'favicon.ico')).size > 100, 'favicon.ico');
  assert(fs.statSync(path.join(ROOT, 'apple-touch-icon.png')).size > 100, 'apple-touch-icon.png');
});

test('PWA-04 service worker installs, controls the page, and precaches every shipped file', async () => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/index.html');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async () => {
    const out = {};
    for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname);
    return out;
  });
  const names = Object.keys(cached);
  eq(names.length, 1, 'exactly one cache after activation');
  const files = cached[names[0]];
  for (const f of ['index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.ico', 'sw.js'].filter(f => f !== 'sw.js'))
    assert(files.some(p => p.endsWith('/' + f)), `${f} not precached`);
  await ctx.close();
});

test('PWA-05 works offline: reload with the network cut still renders and plays', async () => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  page.errors = []; page.on('pageerror', e => page.errors.push(String(e)));
  await page.goto(base + '/index.html');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => typeof G !== 'undefined' && G && G.p);
  const before = await page.evaluate(() => { closeModal(); return [G.p.x, G.p.y]; });
  await page.evaluate(() => act(0, -1));
  const after = await page.evaluate(() => [G.p.x, G.p.y]);
  assert(before[0] !== after[0] || before[1] !== after[1], 'player did not move offline');
  eq(page.errors, []);
  await ctx.close();
});

test('PWA-06 service worker upgrade purges stale caches', async () => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/index.html');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.evaluate(() => caches.open('keep-of-the-gales-v0-stale'));
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.unregister(); });
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => !(await caches.keys()).includes('keep-of-the-gales-v0-stale'));
  await ctx.close();
});

test('PWA-07 layout: no horizontal scroll at phone width, d-pad shown on touch devices', async () => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage(); await page.goto(base + '/index.html');
  await page.waitForFunction(() => typeof G !== 'undefined' && G && G.p);
  assert(await ev(page, () => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
  assert(await ev(page, () => getComputedStyle(document.getElementById('pad')).display !== 'none'), 'd-pad hidden on touch');
  await ctx.close();
});

/* ------------------------------------------------------------------ new game / village */

test('NEW-01 new game starting state', async () => {
  const page = await freshPage();
  const s = await ev(page, () => ({ d: G.depth, hp: G.p.hp, mhp: G.p.mhp, mp: G.p.mp, gold: G.p.gold, lvl: G.p.lvl,
    inv: G.p.inv.map(itemName), w: itemName(G.p.eq.w), a: G.p.eq.a, s: G.p.eq.s, over: G.over }));
  eq(s, { d: 0, hp: 30, mhp: 30, mp: 10, gold: 100, lvl: 1, inv: ['Potion of Healing', 'Potion of Healing'], w: 'Dagger', a: null, s: null, over: false, });
  await done(page);
});

test('NEW-02 village has 4 shops with reachable doors and a staircase down', async () => {
  const page = await freshPage();
  const r = await ev(page, () => {
    const L = cur(), kinds = Object.values(L.shops).sort();
    const reach = (tx, ty) => { // BFS over walkable tiles from start
      const seen = new Set([G.p.x + ',' + G.p.y]), q = [[G.p.x, G.p.y]];
      while (q.length) { const [x, y] = q.shift(); if (Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1) return true;
        for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
          if (!seen.has(k) && walkable(L, nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
      return false; };
    const doors = Object.keys(L.shops).map(k => k.split(',').map(Number));
    return { kinds, allReach: doors.every(([x, y]) => reach(x, y)), downReach: reach(L.down.x, L.down.y), down: L.t[L.down.y * L.w + L.down.x] === T.DOWN };
  });
  eq(r.kinds, ['alch', 'armor', 'healer', 'smith']); assert(r.allReach, 'a shop door is unreachable'); assert(r.downReach && r.down, 'stairs unreachable');
  await done(page);
});

/* ------------------------------------------------------------------ shops */

test('SHOP-01 buying deducts gold and adds the item; broke player cannot buy', async () => {
  const page = await freshPage();
  const r = await ev(page, () => {
    G.p.gold = 25; openShop('smith'); shopAct('buy', { n: 0 }); // Dagger 20g
    const afterBuy = { gold: G.p.gold, last: itemName(G.p.inv[G.p.inv.length - 1]) };
    const n = G.p.inv.length; shopAct('buy', { n: 5 }); // Battle Axe, unaffordable
    return { afterBuy, unchanged: G.p.inv.length === n && G.p.gold === 5 };
  });
  eq(r.afterBuy, { gold: 5, last: 'Dagger' }); assert(r.unchanged, 'bought something unaffordable'); await done(page);
});

test('SHOP-02 selling pays one third of value; shops only buy their own category', async () => {
  const page = await freshPage();
  const r = await ev(page, () => {
    G.p.inv = [{ k: 'w', i: 3, b: 0 }, { k: 'p', i: 0, b: 0 }]; G.p.gold = 0; // Long Sword 220g
    openShop('smith'); renderShop();
    const html = $('#mbody').innerHTML; const sellable = html.includes('Long Sword') && html.split('Sell')[1].includes('Long Sword') && !html.split('Sell')[1].includes('Potion');
    shopAct('sell', { i: 0 });
    return { sellable, gold: G.p.gold, left: G.p.inv.map(itemName) };
  });
  assert(r.sellable, 'sell list wrong'); eq(r.gold, Math.floor(220 / 3)); eq(r.left, ['Potion of Healing']); await done(page);
});

test('SHOP-03 enchanted items cost and sell for more', async () => {
  const page = await freshPage();
  const r = await ev(page, () => [price({ k: 'w', i: 0, b: 0 }), price({ k: 'w', i: 0, b: 2 })]);
  assert(r[1] > r[0], 'bonus did not raise price'); await done(page);
});

test('SHOP-04 healer restores HP/MP for 10+5*level gold and refuses when poor', async () => {
  const page = await freshPage();
  const r = await ev(page, () => {
    G.p.hp = 3; G.p.mp = 0; G.p.gold = 14; openShop('healer'); shopAct('heal', {}); const poor = G.p.hp;
    G.p.gold = 100; shopAct('heal', {}); return { poor, hp: G.p.hp, mp: G.p.mp, gold: G.p.gold };
  });
  eq(r.poor, 3); eq(r.hp, 30); eq(r.mp, 10); eq(r.gold, 100 - 15); await done(page);
});

test('SHOP-05 full pack blocks purchases', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { G.p.gold = 999; G.p.inv = Array.from({ length: MAXINV }, () => ({ k: 'p', i: 0, b: 0 })); openShop('alch'); shopAct('buy', { n: 0 }); return [G.p.inv.length, G.p.gold]; });
  eq(r, [24, 999]); await done(page);
});

test('SHOP-06 walking into a shop door opens the shop instead of passing through', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { const L = cur(); const [k] = Object.keys(L.shops); const [x, y] = k.split(',').map(Number);
    G.p.x = x; G.p.y = y + 1; computeFov(); tryMove(0, -1); return { open: modalOpen(), title: $('#mtitle').textContent, pos: [G.p.x, G.p.y], y }; });
  assert(r.open, 'shop did not open'); eq(r.pos[1], r.y + 1, 'player walked into the door tile'); await done(page);
});

/* ------------------------------------------------------------------ levels */

test('LVL-01 stairs: village -> depth 1 -> back; arrival lands on the matching staircase', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { const d = cur().down; G.p.x = d.x; G.p.y = d.y - 1; computeFov(); tryMove(0, 1);
    const a = { depth: G.depth, onUp: cur().t[G.p.y * cur().w + G.p.x] === T.UP };
    useStairs(); return { a, b: { depth: G.depth, onDown: cur().t[G.p.y * cur().w + G.p.x] === T.DOWN } }; });
  eq(r.a, { depth: 1, onUp: true }); eq(r.b, { depth: 0, onDown: true }); await done(page);
});

test('LVL-02 every dungeon level (1-8, many seeds) is connected from up- to down-stairs, with sane spawns', async () => {
  const page = await freshPage();
  const bad = await ev(page, () => {
    const bad = [];
    for (let seed = 1; seed <= 15; seed++) { __seed(seed * 977);
      for (let d = 1; d <= MAXD; d++) {
        const L = makeDungeon(d); const W = L.w;
        const seen = new Uint8Array(L.w * L.h), q = [L.up.y * W + L.up.x]; seen[q[0]] = 1;
        for (let i = 0; i < q.length; i++) { const x = q[i] % W, y = (q[i] / W) | 0;
          for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (!inb(L, nx, ny)) continue; const n = ny * W + nx;
            if (!seen[n] && !BLOCK.has(L.t[n])) { seen[n] = 1; q.push(n); } } }
        if (d < MAXD && !seen[L.down.y * W + L.down.x]) bad.push(`seed ${seed} d${d}: down stairs unreachable`);
        if (d === MAXD && L.down) bad.push(`d${d}: has down stairs`);
        for (const m of L.mons) { if (BLOCK.has(L.t[m.y * W + m.x])) bad.push(`d${d}: monster in wall`); if (!seen[m.y * W + m.x]) bad.push(`d${d}: unreachable monster`); }
        const pos = new Set(); for (const m of L.mons) { const k = m.x + ',' + m.y; if (pos.has(k)) bad.push(`d${d}: stacked monsters`); pos.add(k); }
        if (L.mons.some(m => m.x === L.up.x && m.y === L.up.y)) bad.push(`d${d}: monster on up stairs`);
        if (d === MAXD && L.mons.filter(m => m.boss).length !== 1) bad.push('boss count != 1');
      } }
    return bad;
  });
  eq(bad, []); await done(page);
});

test('LVL-03 monster difficulty scales with depth; depth 1 has no ogres or wyrms', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { const names = new Set(); for (let i = 0; i < 40; i++) for (const m of makeDungeon(1).mons) names.add(m.n); return [...names]; });
  for (const n of r) assert(!['Ogre', 'Troll', 'Stone Golem', 'Gale Wyrm', 'Wraith'].includes(n), `depth 1 spawned ${n}`); await done(page);
});

test('LVL-04 levels persist: returning to a level restores its monsters and items', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { enter(1, 'top'); const L = cur(); L.mons.length = 0; L.items.push({ x: L.up.x + 1, y: L.up.y, gold: 77 }); const before = JSON.stringify(L.items);
    enter(0, 'start'); enter(1, 'top'); return JSON.stringify(cur().items) === before; });
  assert(r, 'level regenerated'); await done(page);
});

/* ------------------------------------------------------------------ combat / progression */

test('CMB-01 player kills a monster, gains its XP, and the corpse can drop loot', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { enter(1, 'top'); const L = cur(); L.mons.length = 0;
    const m = spawn(MON[0], G.p.x + 1, G.p.y); m.sleep = false; m.hp = 1; L.mons.push(m);
    const xp0 = G.p.xp; for (let i = 0; i < 20 && L.mons.includes(m); i++) tryMove(1, 0); // 85% hit chance
    return { dead: !L.mons.includes(m), xp: G.p.xp - xp0 }; });
  assert(r.dead, 'monster survived'); eq(r.xp, 3); await done(page);
});

test('CMB-02 level-up at the XP threshold raises stats and unlocks spells at the right levels', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { const p = G.p; const need = xpNeed(1); gainXp(need - 1); const still = p.lvl; gainXp(1);
    const a = { still, lvl: p.lvl, mhp: p.mhp, mmp: p.mmp, str: p.str };
    gainXp(100000); return { a, final: p.lvl, spells: SPELLS.filter(s => p.lvl >= s.lvl).length }; });
  eq(r.a, { still: 1, lvl: 2, mhp: 38, mmp: 13, str: 11 }); assert(r.final >= 6, 'did not keep levelling'); eq(r.spells, 4); await done(page);
});

test('CMB-03 spells: missile needs a target + mana; heal works; blink moves >=3 tiles; chain hits up to 3', async () => {
  const page = await freshPage();
  const r = await ev(page, () => {
    enter(1, 'top'); const L = cur(); L.mons.length = 0; G.p.lvl = 8; G.p.mp = G.p.mmp = 60; G.p.hp = 10; G.p.mhp = 60;
    const out = {}; cast(0); out.noTarget = G.p.mp === 60; // no monsters in sight: mana not spent
    const mk = dx => { const m = spawn(MON[11], G.p.x + dx, G.p.y); m.sleep = true; m.hp = m.mhp = 500; return m; };
    const ms = [mk(1), mk(2), mk(3), mk(4)]; ms.forEach((m, i) => { m.y = G.p.y; }); // line them up (room permitting)
    const free = ms.filter(m => walkable(L, m.x, m.y)); free.forEach(m => L.mons.push(m)); computeFov();
    const vis = visibleMons().length; const hp0 = L.mons.map(m => m.hp);
    cast(3); out.chainHit = L.mons.filter((m, i) => m.hp < hp0[i]).length <= 3 && L.mons.some((m, i) => m.hp < hp0[i]);
    const mp = G.p.mp; cast(1); out.healed = G.p.hp > 10 && G.p.mp === mp - 5;
    L.mons.length = 0; const p0 = [G.p.x, G.p.y]; cast(2); out.blinked = Math.hypot(G.p.x - p0[0], G.p.y - p0[1]) >= 3 - 1e-9;
    G.p.mp = 0; const hp1 = G.p.hp; cast(1); out.noMana = G.p.hp === hp1; out.vis = vis; return out; });
  assert(r.noTarget, 'missile spent mana with no target'); assert(r.chainHit, 'chain bolt'); assert(r.healed, 'heal'); assert(r.blinked, 'blink'); assert(r.noMana, 'cast without mana'); await done(page);
});

test('CMB-04 armor reduces incoming damage; equipping swaps the old piece back into the pack', async () => {
  const page = await freshPage();
  const r = await ev(page, () => {
    G.p.inv = [{ k: 'a', i: 3, b: 1 }]; G.p.eq.a = { k: 'a', i: 0, b: 0 }; const before = armorVal();
    packAct('equip', { i: '0' }); closeModal();
    return { before, after: armorVal(), pack: G.p.inv.map(itemName), worn: itemName(G.p.eq.a) }; });
  eq(r.before, 1); eq(r.after, 6); eq(r.pack, ['Cloth Tunic']); eq(r.worn, 'Chain Mail +1'); await done(page);
});

test('CMB-05 sleeping monsters stay asleep far away and wake when you are close or attack them', async () => {
  const page = await freshPage({}, { seed: 5 });
  const r = await ev(page, () => { enter(1, 'top'); const L = cur(); L.mons.length = 0;
    const far = spawn(MON[2], G.p.x + 12, G.p.y); far.sleep = true; L.mons.push(far);
    for (let i = 0; i < 10; i++) endTurn(); const stays = far.sleep;
    const near = spawn(MON[2], G.p.x + 1, G.p.y); near.sleep = true; near.hp = near.mhp = 99; L.mons.push(near); tryMove(1, 0);
    return { stays, woke: !near.sleep }; });
  assert(r.stays && r.woke, JSON.stringify(r)); await done(page);
});

test('CMB-06 hostile monsters close the distance and attack; HP never goes negative on screen', async () => {
  const page = await freshPage({}, { seed: 9 });
  const r = await ev(page, () => { enter(1, 'top'); const L = cur(); L.mons.length = 0; G.p.hp = G.p.mhp = 200;
    const m = spawn(MON[2], G.p.x + 3, G.p.y); m.sleep = false; L.mons.push(m);
    const d0 = Math.max(Math.abs(m.x - G.p.x), Math.abs(m.y - G.p.y)); for (let i = 0; i < 6; i++) endTurn();
    return { d0, d1: Math.max(Math.abs(m.x - G.p.x), Math.abs(m.y - G.p.y)), hp: G.p.hp }; });
  assert(r.d1 <= 1, 'did not reach player'); assert(r.hp < 200, 'never attacked'); await done(page);
});

test('CMB-07 dying ends the game, deletes the save, and offers a new game', async () => {
  const page = await freshPage({}, { seed: 3 });
  const r = await ev(page, () => { enter(1, 'top'); const L = cur(); L.mons.length = 0; G.p.hp = 1; G.p.mhp = 1;
    const m = spawn(MON[11], G.p.x + 1, G.p.y); m.sleep = false; m.a = m.b = 50; L.mons.push(m);
    for (let i = 0; i < 20 && !G.over; i++) endTurn();
    return { over: G.over, save: localStorage.getItem(KEY), title: $('#mtitle').textContent, hp: G.p.hp }; });
  assert(r.over, 'not dead'); eq(r.save, null); eq(r.title, 'You have fallen'); eq(r.hp, 0);
  await page.evaluate(() => { document.querySelector('#mbody [data-a=new]').click(); });
  assert(await ev(page, () => !G.over && G.depth === 0), 'new game did not start'); await done(page);
});

test('CMB-08 killing the Gale Wyrm wins the game', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { enter(8, 'top'); const L = cur(); const boss = L.mons.find(m => m.boss); boss.hp = 1; boss.sleep = false;
    G.p.x = boss.x - 1; G.p.y = boss.y; if (!walkable(L, G.p.x, G.p.y)) { G.p.x = boss.x + 1; } computeFov();
    const dx = boss.x - G.p.x; for (let i = 0; i < 30 && !G.won; i++) tryMove(dx, 0); return { won: G.won, left: L.mons.some(m => m.boss) }; });
  assert(r.won && !r.left, JSON.stringify(r)); await done(page);
});

/* ------------------------------------------------------------------ items */

test('ITM-01 potions heal (capped at max), mana potion restores MP, and quaff picks a sensible potion', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { G.p.inv = [{ k: 'p', i: 1, b: 0 }, { k: 'p', i: 0, b: 0 }, { k: 'p', i: 2, b: 0 }]; G.p.hp = 20; G.p.mhp = 30; G.p.mp = 0;
    quickHeal(); const used = G.p.inv.map(itemName); // need 10 -> smallest potion that covers it is the 30hp one
    const a = { hp: G.p.hp, used }; useItem(G.p.inv.findIndex(i => i.i === 2)); return { a, mp: G.p.mp }; });
  eq(r.a.hp, 30); eq(r.a.used, ['Potion of Greater Healing', 'Potion of Mana']); eq(r.mp, 10); await done(page);
});

test('ITM-02 quaffing at full health does not waste a potion; with none it says so', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { quickHeal(); const kept = G.p.inv.length; G.p.inv = []; G.p.hp = 5; quickHeal(); return { kept, last: G.log[G.log.length - 1].t }; });
  eq(r.kept, 2); assert(/no healing potions/i.test(r.last), r.last); await done(page);
});

test('ITM-03 pick up gold and items by walking; full pack leaves the item on the floor', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { enter(1, 'top'); const L = cur(); L.mons.length = 0;
    for (const dx of [1, 2]) L.t[G.p.y * L.w + G.p.x + dx] = T.FLOOR; // guarantee open floor east of the arrival stairs
    L.items.push({ x: G.p.x + 1, y: G.p.y, gold: 50 }); const g0 = G.p.gold; tryMove(1, 0); const gold = G.p.gold - g0;
    G.p.inv = Array.from({ length: MAXINV }, () => ({ k: 'p', i: 0, b: 0 })); L.items.push({ x: G.p.x + 1, y: G.p.y, item: { k: 'w', i: 0, b: 0 } }); tryMove(1, 0);
    return { gold, floor: L.items.filter(i => i.item && i.x === G.p.x && i.y === G.p.y).length, pack: G.p.inv.length }; });
  eq(r.gold, 50); eq(r.floor, 1); eq(r.pack, 24); await done(page);
});

test('ITM-04 drop puts the item on the floor, and unequip returns gear to the pack', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { enter(1, 'top'); const n = G.p.inv.length; packAct('drop', { i: '0' }); closeModal();
    const floor = cur().items.some(i => i.x === G.p.x && i.y === G.p.y && i.item); packAct('unequip', { s: 'w' }); closeModal();
    return { floor, n: G.p.inv.length, wielding: G.p.eq.w }; });
  assert(r.floor, 'not on floor'); eq(r.n, 2); eq(r.wielding, null); await done(page);
});

test('ITM-05 Town Portal: dungeon -> village, then village -> the depth you left (scroll consumed each time)', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { G.p.inv = [{ k: 'c', i: 0, b: 0 }, { k: 'c', i: 0, b: 0 }]; enter(3, 'top');
    useItem(0); const a = { depth: G.depth, ret: G.returnDepth, scrolls: G.p.inv.length };
    useItem(0); return { a, b: { depth: G.depth, ret: G.returnDepth, scrolls: G.p.inv.length } }; });
  eq(r.a, { depth: 0, ret: 3, scrolls: 1 }); eq(r.b, { depth: 3, ret: 0, scrolls: 0 }); await done(page);
});

test('ITM-06 portal with nowhere to go is not wasted; mapping/teleport fizzle in the village', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { G.p.inv = [{ k: 'c', i: 0, b: 0 }, { k: 'c', i: 1, b: 0 }, { k: 'c', i: 2, b: 0 }]; G.returnDepth = 0; G.maxDepth = 0;
    useItem(0); useItem(1); useItem(2); return { n: G.p.inv.length, depth: G.depth }; });
  eq(r, { n: 3, depth: 0 }); await done(page);
});

test('ITM-07 magic mapping reveals the level; teleport moves you to a floor tile', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { G.p.inv = [{ k: 'c', i: 1, b: 0 }, { k: 'c', i: 2, b: 0 }]; enter(2, 'top'); const L = cur();
    const p0 = [G.p.x, G.p.y]; useItem(0); const mapped = L.seen.every(v => v === 1);
    useItem(0); return { mapped, moved: G.p.x !== p0[0] || G.p.y !== p0[1], ok: L.t[G.p.y * L.w + G.p.x] === T.FLOOR }; });
  assert(r.mapped && r.ok, JSON.stringify(r)); await done(page);
});

/* ------------------------------------------------------------------ input / UI */

test('UI-01 keyboard: arrows/WASD/vi-keys/numpad move; space waits; I opens the pack; Escape closes it', async () => {
  const page = await freshPage();
  await ev(page, () => { enter(1, 'top'); cur().mons.length = 0; });
  const pos = () => ev(page, () => [G.p.x, G.p.y]);
  let moved = 0;
  for (const key of ['ArrowRight', 'd', 'l', 'Numpad6', 'ArrowLeft', 'a', 'h', 'Numpad4', 'ArrowDown', 's', 'j', 'ArrowUp', 'w', 'k']) {
    const p0 = await pos(); await page.keyboard.press(key); const p1 = await pos(); if (p0[0] !== p1[0] || p0[1] !== p1[1]) moved++;
  }
  assert(moved >= 6, `only ${moved} keys moved the player`);
  const t0 = await ev(page, () => G.turn); await page.keyboard.press('Space'); eq(await ev(page, () => G.turn), t0 + 1);
  await page.keyboard.press('i'); assert(await ev(page, () => modalOpen() && $('#mtitle').textContent === 'Pack'), 'pack did not open');
  const t1 = await ev(page, () => G.turn); await page.keyboard.press('d'); eq(await ev(page, () => G.turn), t1, 'moved while modal open');
  await page.keyboard.press('Escape'); assert(await ev(page, () => !modalOpen()), 'escape did not close'); await done(page);
});

test('UI-02 click-to-walk: tapping a seen tile auto-walks there; walking stops when a hostile is in view', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { enter(1, 'top'); const L = cur(); L.mons.length = 0; computeFov();
    let tx = null; for (let r = 4; r < 8 && !tx; r++) for (const [dx, dy] of DIRS) { const x = G.p.x + dx * r, y = G.p.y + dy * r; if (inb(L, x, y) && vis[y * L.w + x] && walkable(L, x, y) && pathTo(x, y)) { tx = [x, y]; break; } }
    return tx; });
  assert(r, 'no walkable target found');
  await page.evaluate(([x, y]) => onTap(x, y), r);
  await page.waitForFunction(([x, y]) => G.p.x === x && G.p.y === y, r, { timeout: 5000 });
  // walking is cancelled when a hostile appears
  const stopped = await ev(page, () => { const L = cur(); const m = spawn(MON[2], G.p.x + 2, G.p.y); L.t[m.y * L.w + m.x] = T.FLOOR; L.t[G.p.y * L.w + G.p.x + 1] = T.FLOOR; m.sleep = false; L.mons.push(m); computeFov(); return hostileAwake(); });
  assert(stopped, 'awake monster in view should block auto-walk'); await done(page);
});

test('UI-03 touch controls: d-pad buttons, spell buttons and action bar are wired', async () => {
  const page = await freshPage({ hasTouch: true, isMobile: true });
  await ev(page, () => { enter(1, 'top'); cur().mons.length = 0; G.p.lvl = 2; ui(); });
  const t0 = await ev(page, () => G.turn);
  await page.tap('#pad button[data-dx="0"][data-dy="0"]'); eq(await ev(page, () => G.turn), t0 + 1, 'center d-pad = wait');
  await page.tap('#bar button[data-b=pack]'); assert(await ev(page, () => modalOpen()), 'pack button'); await page.tap('#mclose');
  assert(await page.locator('#spells button').count() === 2, 'spell buttons for lvl 2'); await done(page);
});

test('UI-04 HUD reflects HP/MP/gold/depth and the log keeps only the latest lines', async () => {
  const page = await freshPage();
  const r = await ev(page, () => { G.p.hp = 12; G.p.gold = 321; enter(2, 'top'); for (let i = 0; i < 30; i++) msg('line ' + i); ui();
    return { hp: $('#hpt').textContent, meta: $('#meta').textContent, lines: $('#log').children.length }; });
  assert(/HP 12\/30/.test(r.hp)); assert(/321g/.test(r.meta) && /Depth 2/.test(r.meta)); eq(r.lines, 6); await done(page);
});

test('UI-05 how-to-play modal can be reopened from the menu', async () => {
  const page = await freshPage();
  await page.click('#bar button[data-b=menu]'); await page.click('#mbody [data-a=help]');
  eq(await ev(page, () => $('#mtitle').textContent), 'How to play'); await done(page);
});

test('UI-06 Menu has a Full manual button that opens the README manual in a new tab; help modal links to it', async () => {
  const page = await freshPage();
  await ev(page, () => { window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null; }; });
  await page.click('#bar button[data-b=menu]'); await page.click('#mbody [data-a=manual]');
  const opened = await ev(page, () => window.__opened);
  eq(opened.length, 1); assert(/github\.com\/adambeltz2\/Keep-of-the-Gales#manual$/.test(opened[0][0]), opened[0][0]); eq(opened[0][1], '_blank');
  await ev(page, () => showHelp());
  const a = await ev(page, () => { const l = document.querySelector('#mbody a'); return l && [l.href, l.target, l.rel]; });
  assert(a && /#manual$/.test(a[0]) && a[1] === '_blank' && /noopener/.test(a[2]), JSON.stringify(a));
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8'); assert(/^## Manual$/m.test(readme), 'README is missing the "## Manual" heading the link targets');
  await done(page);
});

/* ------------------------------------------------------------------ persistence */

test('SAV-01 state survives a reload exactly (position, depth, gold, items, explored map)', async () => {
  const page = await freshPage();
  await ev(page, () => { enter(2, 'top'); cur().mons.length = 0; G.p.gold = 4242; tryMove(1, 0); tryMove(0, 1); G.p.inv.push({ k: 'w', i: 4, b: 2 }); save(); });
  const before = await ev(page, () => ({ d: G.depth, x: G.p.x, y: G.p.y, gold: G.p.gold, inv: G.p.inv.map(itemName), seen: Array.from(cur().seen).reduce((a, b) => a + b, 0) }));
  await page.reload(); await page.waitForFunction(() => typeof G !== 'undefined' && G && G.p);
  const after = await ev(page, () => ({ d: G.depth, x: G.p.x, y: G.p.y, gold: G.p.gold, inv: G.p.inv.map(itemName), seen: Array.from(cur().seen).reduce((a, b) => a + b, 0), typed: cur().seen instanceof Uint8Array && cur().t instanceof Uint8Array }));
  assert(after.typed, 'typed arrays not restored'); delete after.typed; eq(after, before); assert(!(await ev(page, () => modalOpen())), 'help modal should not reappear on continue'); await done(page);
});

test('SAV-02 a corrupt or wrong-version save falls back to a fresh game instead of crashing', async () => {
  for (const junk of ['{not json', JSON.stringify({ v: 99 }), 'null']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block' }); const page = await ctx.newPage(); page.errors = [];
    page.on('pageerror', e => page.errors.push(String(e)));
    await page.addInitScript(SEEDED_RNG); await page.addInitScript(j => localStorage.setItem('keep-of-the-gales-v1', j), junk);
    await page.goto(base + '/index.html'); await page.waitForFunction(() => typeof G !== 'undefined' && G && G.p);
    eq(await page.evaluate(() => [G.depth, G.p.lvl]), [0, 1]); eq(page.errors, [], 'errors for ' + junk); await ctx.close();
  }
});

test('SAV-03 works when localStorage is unavailable (private mode): game still plays', async () => {
  const ctx = await browser.newContext({ serviceWorkers: 'block' }); const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  await page.goto(base + '/index.html'); await page.waitForFunction(() => typeof G !== 'undefined' && G && G.p);
  await page.evaluate(() => { closeModal(); act(0, -1); }); eq(page.errors, []); await ctx.close();
});

test('SAV-04 new game from the menu wipes progress (after confirm)', async () => {
  const page = await freshPage();
  page.on('dialog', d => d.accept());
  await ev(page, () => { G.p.gold = 9999; G.p.lvl = 5; save(); });
  await page.click('#bar button[data-b=menu]'); await page.click('#mbody [data-a=new]');
  eq(await ev(page, () => [G.p.gold, G.p.lvl, G.depth]), [100, 1, 0]); await done(page);
});

/* ------------------------------------------------------------------ soak */

test('SOAK-01 50 random games x 1200 actions each: no exceptions, invariants hold', async () => {
  const page = await freshPage();
  const r = await ev(page, () => {
    const errs = []; const dirs = DIRS;
    for (let g = 0; g < 50; g++) { __seed(1000 + g); newGame(); closeModal(); G.p.gold = 3000; G.p.lvl = 6; G.p.mhp = 120; G.p.hp = 120; G.p.mmp = 40; G.p.mp = 40;
      G.p.inv.push({ k: 'c', i: 0, b: 0 }, { k: 'c', i: 1, b: 0 }, { k: 'c', i: 2, b: 0 }); enter(1, 'top');
      for (let t = 0; t < 1200 && !G.over; t++) {
        try {
          const r = Math.random();
          if (r < .6) { const d = dirs[(Math.random() * 8) | 0]; tryMove(d[0], d[1]); }
          else if (r < .72) cast((Math.random() * 4) | 0); else if (r < .78) useStairs(); else if (r < .84) quickHeal();
          else if (r < .9) { useItem((Math.random() * G.p.inv.length) | 0); closeModal(); }
          else { const L = cur(); onTap((Math.random() * L.w) | 0, (Math.random() * L.h) | 0); stopWalk(); closeModal(); }
          if (G.p.hp < 20 && !G.over) G.p.hp = 120;
          const L = cur(), p = G.p;
          if (BLOCK.has(L.t[p.y * L.w + p.x])) errs.push('player in wall');
          if (p.hp > p.mhp || p.mp > p.mmp || p.mp < 0 || p.gold < 0) errs.push('stat out of range');
          if (L.mons.some(m => m.x === p.x && m.y === p.y)) errs.push('monster on player');
          if (p.inv.length > MAXINV) errs.push('pack overflow');
          if (errs.length) return errs.slice(0, 3);
        } catch (e) { return ['EXC ' + e.stack.split('\n').slice(0, 2).join(' | ')]; }
      } }
    return errs;
  });
  eq(r, []); await done(page);
});

/* ------------------------------------------------------------------ runner */

(async () => {
  server = createServer(); await new Promise(r => server.listen(0, r)); base = `http://localhost:${server.address().port}`;
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const only = process.argv[2]; let fail = 0, ran = 0;
  for (const t of results) {
    if (only && !t.name.startsWith(only) && !t.name.includes(only)) continue;
    const t0 = Date.now(); ran++;
    try { await t.fn(); console.log(`  ok   ${t.name} (${Date.now() - t0}ms)`); }
    catch (e) { fail++; console.log(`  FAIL ${t.name}\n       ${String(e.message || e).split('\n')[0]}`); }
  }
  await browser.close(); server.close();
  console.log(`\n${ran - fail}/${ran} passed`);
  process.exit(fail ? 1 : 0);
})();
