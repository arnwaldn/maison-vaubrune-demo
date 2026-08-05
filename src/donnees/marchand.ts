/**
 * Identité du marchand.
 *
 * Règle non négociable du projet : AUCUNE donnée personnelle ou d'entreprise
 * n'est inventée. Un courriel, un téléphone ou une adresse plausibles dans une
 * démonstration finissent tôt ou tard recopiés dans un vrai site — et une
 * adresse inventée peut exister pour de bon. Les champs restent donc à `null`,
 * et l'interface les affiche comme des emplacements à compléter (composant
 * `<AComplete>`), jamais comme des valeurs.
 *
 * Le nom et la baseline, eux, sont assumés comme fiction : ils désignent une
 * maison qui n'existe pas, et la page d'accueil le dit noir sur blanc.
 */

export interface AdressePostale {
  readonly voie: string;
  readonly codePostal: string;
  readonly commune: string;
  readonly pays: string;
}

export interface Marchand {
  /** Nom commercial affiché partout — la marque de la démonstration. */
  readonly nom: string;
  /** Une ligne, sous le nom. Décrit le commerce, ne promet rien. */
  readonly baseline: string;
  /** À compléter par le marchand qui reprendra ce socle. */
  readonly courriel: string | null;
  /** À compléter par le marchand qui reprendra ce socle. */
  readonly telephone: string | null;
  /** À compléter par le marchand qui reprendra ce socle. */
  readonly adresse: AdressePostale | null;
}

export const marchand: Marchand = {
  nom: 'Maison Vaubrune',
  baseline: 'Conserves, confitures et condiments de garde',
  courriel: null,
  telephone: null,
  adresse: null,
};
