import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 551 } });
await p.goto('http://localhost:3200/');
await p.waitForSelector('html[data-hydratation="prete"]');
console.log(await p.evaluate(() => {
  const rail = document.querySelector('.rail-vitrine'); const rr = rail.getBoundingClientRect();
  const li = rail.querySelector('li'); const lr = li.getBoundingClientRect();
  const sr = rail.querySelector('p.sr-only'); const sb = sr.getBoundingClientRect();
  const va = rail.querySelector('.vignette-achat').getBoundingClientRect();
  const cs = getComputedStyle(sr);
  return JSON.stringify({ railBas: rr.bottom, railPad: getComputedStyle(rail).paddingBottom, liBas: lr.bottom, achatBas: va.bottom, srTop: sb.top, srPos: cs.position, srMargin: cs.margin, srParentPos: getComputedStyle(sr.parentElement).position, sh: rail.scrollHeight, ch: rail.clientHeight, liMb: getComputedStyle(li).marginBottom });
}));
await b.close();
