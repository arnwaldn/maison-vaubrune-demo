interface ProprietesBandeau {
  /** Le message affiché. Aucune valeur par défaut : on écrit ce qu'on annonce. */
  readonly texte: string;
  /** L'étiquette courte à gauche du message. */
  readonly etiquette?: string;
}

/**
 * Bandeau de rappel, réutilisable partout où le visiteur pourrait oublier
 * qu'il est dans une démonstration — au premier chef l'espace de gestion
 * (`/gestion`), où l'on modifie un catalogue qui ne quittera jamais le
 * navigateur.
 *
 * Composant serveur, sans état et sans bouton de fermeture : un bandeau que
 * l'on peut faire disparaître ne remplit plus sa fonction d'avertissement.
 */
export function BandeauDemonstration({
  texte,
  etiquette = 'Démonstration',
}: ProprietesBandeau) {
  return (
    <div
      role="note"
      className="border-b border-ocre-clair bg-ocre-clair/25 print:hidden"
    >
      <p className="mx-auto flex max-w-page flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5 text-sm text-encre sm:px-8">
        <span className="text-xs font-semibold tracking-[0.16em] text-ocre uppercase">
          {etiquette}
        </span>
        <span>{texte}</span>
      </p>
    </div>
  );
}
