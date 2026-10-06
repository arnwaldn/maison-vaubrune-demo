import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [w,h] of [[1280,551],[390,844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:3200/');
  await p.waitForSelector('html[data-hydratation="prete"]');
  const r = await p.evaluate(() => {
    const rail = document.querySelector('.rail-vitrine');
    const rr = rail.getBoundingClientRect();
    let pire = null;
    for (const el of rail.querySelectorAll('*')) {
      const b = el.getBoundingClientRect();
      if (b.bottom > rr.bottom - 0.5 && (!pire || b.bottom > pire.bas)) pire = { el: el.tagName + '.' + el.className.toString().slice(0,60), bas: b.bottom - rr.bottom, h: b.height };
    }
    const cs = getComputedStyle(rail);
    return { sh: rail.scrollHeight, ch: rail.clientHeight, oy: cs.overflowY, pb: cs.paddingBottom, pire };
  });
  console.log(w, JSON.stringify(r));
  await p.close();
}
// premier clic avant hydratation, navigateur vierge
for (let i=0;i<3;i++){
  const ctx = await b.newContext({ viewport: { width: 1280, height: 551 } });
  const p = await ctx.newPage();
  await p.route('**/_next/static/chunks/**', async r => { await new Promise(s=>setTimeout(s,600)); r.continue(); });
  await p.goto('http://localhost:3200/boutique', { waitUntil: 'commit' });
  const btn = p.locator('[data-slug="huile-olive-premiere-pression"], li:has(a[href="/boutique/huile-olive-premiere-pression"])').first().getByRole('button', { name: /^Ajouter au panier/ });
  await btn.waitFor();
  const t0 = Date.now();
  await btn.click({ timeout: 10000 }).catch(e=>console.log('clic refuse', e.message.split('\n')[0]));
  await p.waitForSelector('html[data-hydratation="prete"]');
  await p.waitForTimeout(500);
  const pastille = await p.evaluate(() => JSON.stringify(localStorage.getItem('maison-vaubrune.panier.v1')));
  console.log('essai', i, 'clic a', Date.now()-t0, 'ms, panier:', pastille);
  await ctx.close();
}
await b.close();
