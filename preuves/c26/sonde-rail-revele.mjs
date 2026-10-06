import { chromium } from '@playwright/test';
const base = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 551 } });
await p.goto(base + '/');
await p.waitForSelector('html[data-hydratation="prete"]');
await p.locator('.rail-vitrine').scrollIntoViewIfNeeded();
await p.waitForTimeout(2500);
console.log(base, await p.evaluate(() => {
  const rail = document.querySelector('.rail-vitrine');
  const lis = [...rail.children].map(li => (li.hasAttribute('data-revele') ? 'R' : '-') + getComputedStyle(li).transform);
  return JSON.stringify({ sh: rail.scrollHeight, ch: rail.clientHeight, lis: lis.slice(0, 6) });
}));
await b.close();
