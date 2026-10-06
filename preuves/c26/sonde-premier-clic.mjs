/**
 * Le premier clic d'un vrai doigt : à quel moment après la première peinture
 * du bouton un clic AJOUTE-t-il vraiment ? `locator.click()` attend que la
 * cible soit actionnable et ne peut donc pas voir un clic perdu : on clique à
 * la souris, au centre de la boîte, sans aucune attente. Processeur bridé x4,
 * cache vide, un contexte neuf par délai.
 *   node preuves/c26/sonde-premier-clic.mjs http://localhost:3200 [vide|rempli]
 */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:3200';
const cas = process.argv[3] ?? 'vide';
const CLE = 'maison-vaubrune.panier.v1';
const SKU = 'MV-HV-OLI-25CL';
const b = await chromium.launch();
const resultats = [];
for (let d = 0; d <= 2400; d += 200) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 551 }, reducedMotion: 'reduce' });
  if (cas === 'rempli') {
    await ctx.addInitScript(([cle]) => {
      if (!localStorage.getItem(cle)) localStorage.setItem(cle, JSON.stringify({ version: 1, panier: { lignes: [{ sku: 'MV-HV-NOI-25CL', quantite: 2 }], zone: 'metropole' } }));
    }, [CLE]);
  }
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(base + '/boutique', { waitUntil: 'commit' });
  const bouton = p.locator('li.carte-produit', { has: p.locator('a[href="/boutique/huile-olive-premiere-pression"]') }).locator('.vignette-bouton');
  await bouton.waitFor({ state: 'attached' });
  const t0 = Date.now();
  await bouton.evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(d);
  /* La boîte est relue juste avant le clic (lecture de géométrie, sans test
     d'actionnabilité) : polices et images ont pu décaler la carte. */
  await bouton.evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const boite = await bouton.boundingBox();
  const hydrate = await p.evaluate(() => document.documentElement.dataset.hydratation === 'prete');
  await p.mouse.click(boite.x + boite.width / 2, boite.y + boite.height / 2);
  await p.waitForSelector('html[data-hydratation="prete"]');
  await p.waitForTimeout(800);
  const lignes = await p.evaluate((cle) => JSON.parse(localStorage.getItem(cle) ?? '{"panier":{"lignes":[]}}').panier.lignes, CLE);
  const olive = lignes.find((l) => l.sku === SKU)?.quantite ?? 0;
  const noix = lignes.find((l) => l.sku === 'MV-HV-NOI-25CL')?.quantite ?? 0;
  resultats.push(`clic a +${String(Date.now() - t0 - 800).padStart(4)} ms apres peinture (hydrate au clic: ${hydrate ? 'oui' : 'non'}) -> olive ${olive}${cas === 'rempli' ? `, noix ${noix} (attendu 2)` : ''}`);
  await ctx.close();
}
console.log(`[${cas}] ${base}`); console.log(resultats.join('\n'));
await b.close();
