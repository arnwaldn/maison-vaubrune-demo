/**
 * L'ACCÈS AU STOCKAGE LOCAL, rattrapé une fois pour toutes.
 *
 * `window.localStorage` LÈVE POUR DE VRAI : navigation privée de certains
 * navigateurs, cookies bloqués par une politique d'entreprise, stockage
 * désactivé. Le rattrapage est ici, dans une fonction de six lignes, et le
 * reste du code n'a qu'un `null` à traiter.
 *
 * Le type de retour est `Storage`, qui satisfait à la fois `StockageCompatible`
 * (le panier, qui n'a besoin que de lire et d'écrire) et `StockageCommandes`
 * (les commandes, qui doivent aussi effacer). Les deux modules de persistance
 * continuent, eux, de ne rien savoir du navigateur : ils reçoivent leur
 * stockage en paramètre, et c'est ce qui les rend vérifiables sans DOM.
 *
 * Ce module n'est appelé que depuis des composants clients. Il ne porte pas
 * `'use client'` lui-même : une directive dans un fichier de bibliothèque
 * ferait de chacun de ses importateurs une frontière, alors que la règle utile
 * est plus simple — ne pas l'appeler côté serveur, où `window` n'existe pas.
 */

export function stockageLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
