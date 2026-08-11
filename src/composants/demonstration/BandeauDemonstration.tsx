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
 *
 * ---------------------------------------------------------------------------
 * C13 : même forme sérielle que l'aveu de l'accueil
 * ---------------------------------------------------------------------------
 *
 * L'aplat d'ocre clair à un quart d'opacité disparaît au profit de la LIGNE DE
 * REGISTRE : étiquette en mono capitales, filet dessous, aucun fond. Deux
 * raisons, et la seconde est la plus forte :
 *
 * 1. Un aplat de couleur en haut de page est la forme d'une bannière, et une
 *    bannière ne se lit pas. Le registre, si.
 * 2. Un aplat à opacité fractionnaire (`bg-ocre-clair/25`) rend un contraste
 *    qui dépend de ce qu'il y a DERRIÈRE. Tant que la page est coquille, il se
 *    calcule ; le jour où une photographie passe dessous — C14, C15 —, il ne
 *    se calcule plus. Le registre n'a pas ce défaut : le texte est posé sur le
 *    fond de la page, quel qu'il soit, et son contraste est celui du fond.
 *
 * L'étiquette garde l'ocre (5,58:1 sur coquille) : c'est la couleur de
 * l'avertissement dans ce système, et la seule chose qu'on lui demande est
 * d'être vue.
 *
 * `role="note"` et `print:hidden` sont CONSERVÉS : le premier annonce le
 * bandeau comme une remarque aux lecteurs d'écran, le second le retire du
 * papier depuis C6 — et la feuille d'impression de C7 nomme cette convention.
 */
export function BandeauDemonstration({
  texte,
  etiquette = 'Démonstration',
}: ProprietesBandeau) {
  return (
    /* `data-sur-marbre` : LE BANDEAU RESTE SUR LA MATIÈRE, ET C'EST DÉCLARÉ.
       Le recensement de C19 le comptait comme de la prose posée sur le marbre,
       donc comme un panneau qui manque — à raison, tant que personne n'avait
       tranché. On tranche : ce bandeau est du CHROME du site, une ligne unique
       qui court d'un bord à l'autre sous l'en-tête et que son filet ferme
       déjà. Le poser sur un panneau de verre en ferait une boîte, c'est-à-dire
       une bannière — exactement la forme que ce composant a abandonnée en C13
       parce qu'« une bannière ne se lit pas ». Son texte est en encre pleine
       (9,23 contre la veine la plus sombre), donc la déclaration ne cache
       aucun défaut de contraste : elle nomme un choix. */
    <div role="note" className="border-b border-filet-fort print:hidden" data-sur-marbre>
      <p className="mx-auto flex max-w-page flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-sm text-encre sm:px-8">
        <span className="etiquette text-ocre">{etiquette}</span>
        <span>{texte}</span>
      </p>
    </div>
  );
}
