# Décision 004 — Le franco de port couvre aussi le supplément isotherme

- **Date** : 2026-08-06
- **Tranche** : C3 (moteur de frais de port)
- **Statut** : gravé (implémenté dans `src/lib/expedition.ts`, étape 5 ;
  vérifié par `tests/unitaires/expedition.spec.ts`)
- **Objet** : que devient le supplément d'emballage isotherme (6,00 €) quand le
  panier atteint le franco de port (69,00 € en métropole) ?

## Le choix

**Les frais tombent à zéro, isotherme compris.** Un panier de 69,00 € contenant
du beurre et du fromage paie zéro euro de transport — pas 6,00 €, pas
« 0 € hors supplément frais ».

## L'alternative écartée

Facturer le supplément isotherme par-dessus le franco. C'est défendable
économiquement : le pain de glace et la caisse isotherme coûtent réellement au
marchand, et le franco a été calculé sur un colis sec.

C'est indéfendable **commercialement**, et c'est ce qui tranche. Un franco de
port qui souffre une exception oblige à écrire, sur la page Livraison et dans
le panier, une phrase de la forme :

> Frais de port offerts dès 69,00 € d'achat\*
> \* hors supplément d'emballage isotherme pour les produits frais

Cette astérisque est exactement ce qu'on reproche aux places de marché : une
promesse en gros caractères, une reprise en petits. Le client qui la découvre
au récapitulatif ne retient pas la logique tarifaire, il retient qu'on a essayé.
Sur une boutique de démonstration dont l'argument est « voici ce que contient
une boutique livrée dans les règles », publier le motif qu'on reproche aux
autres serait un contresens.

## Ce que ça coûte, chiffré

Le pire cas est un panier à 69,00 € pile contenant au moins un produit frais :
le marchand offre alors 4,90 € à 14,90 € de transport **plus** 6,00 €
d'isotherme, soit jusqu'à 20,90 €. Sur les deux seules références périssables
du catalogue (beurre 250 g à 7,40 €, fromage de brebis 250 g à 11,90 €), un
panier de 69,00 € est très majoritairement composé de produits secs : le
supplément offert est marginal rapporté au panier.

La contrepartie est directement mesurable : **une phrase de moins** à écrire, à
traduire, à maintenir et à défendre, sur la page Livraison comme dans le
récapitulatif de commande. Une règle qui se dit en une phrase sans exception se
respecte ; une règle à astérisque se conteste.

## Conséquences dans le code

- `calculerFraisPort()` applique le franco **en dernier** (étape 5), après avoir
  ajouté l'isotherme (étape 4) : le franco écrase le total, il ne le contourne
  pas. L'ordre est documenté en tête de `src/lib/expedition.ts` et deux tests
  échoueraient si on l'inversait.
- Quand le franco s'applique, le `detail` du résultat ne contient plus qu'une
  ligne — « Frais de port offerts à partir de 69,00 € » à zéro centime. Le
  client ne voit pas passer un supplément puis sa remise : il voit une offre.
- La page `/livraison` énonce la règle en une phrase, sans note de bas de page.

## Portée

La décision vaut pour les zones qui ont un franco (métropole, Corse). L'outre-mer
n'en a pas : la question ne s'y pose pas, et les produits frais y sont refusés
de toute façon (décision D9).
