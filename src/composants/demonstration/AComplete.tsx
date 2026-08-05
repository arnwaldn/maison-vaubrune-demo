interface ProprietesAComplete {
  /** Ce qui manque, dit en français courant : « numéro SIREN », « adresse du siège ». */
  readonly champ: string;
}

/**
 * Emplacement laissé vide, et qui le dit.
 *
 * Partout où un vrai marchand mettrait une donnée que nous refusons
 * d'inventer (SIREN, IBAN, adresse, téléphone, nom du responsable de
 * publication), on pose ce composant. Il rend un `<mark>` : le surlignage
 * est visible à l'œil, et l'`aria-label` donne à un lecteur d'écran la même
 * information que la couleur donne à l'œil — sans quoi le repère ne serait
 * accessible qu'aux voyants.
 *
 * Composant serveur, aucun état, aucun JavaScript envoyé au navigateur.
 */
export function AComplete({ champ }: ProprietesAComplete) {
  return (
    <mark
      aria-label={`emplacement à compléter par le marchand : ${champ}`}
      className="rounded-[2px] bg-ocre-clair/40 px-1.5 py-0.5 text-encre"
    >
      À compléter&nbsp;: {champ}
    </mark>
  );
}
