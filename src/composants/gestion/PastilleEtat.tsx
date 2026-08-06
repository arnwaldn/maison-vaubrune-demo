import { LIBELLE_ETAT, type EtatCommande } from '@/lib/commandes/etats';

/**
 * L'état d'une commande, sous forme d'étiquette.
 *
 * Composant SERVEUR — il ne lit ni stockage ni contexte, seulement l'état qu'on
 * lui donne. Les îlots clients qui l'utilisent le rendent depuis leur propre
 * arbre, ce qui ne coûte rien de plus que le JSX qu'il remplace.
 *
 * LA COULEUR NE PORTE PAS L'INFORMATION. Chaque état a son libellé écrit en
 * toutes lettres ; la teinte ne fait que le confirmer. C'est la règle
 * d'accessibilité la plus simple à tenir et la plus souvent oubliée sur ce
 * genre de tableau — un daltonien lit « Expédiée », pas un rond vert.
 *
 * Les quatre teintes viennent de la palette du site et sont toutes vérifiées
 * au-dessus du seuil AA sur le fond papier (voir `globals.css`) : l'olive pour
 * ce qui avance, l'ocre pour ce qui attend un geste, l'encre douce pour ce qui
 * est clos sans suite.
 */

const TEINTE: Record<EtatCommande, string> = {
  payee: 'border-ocre text-ocre',
  preparee: 'border-terre text-terre',
  expediee: 'border-olive text-olive',
  annulee: 'border-encre-douce text-encre-douce',
};

export function PastilleEtat({ etat }: { readonly etat: EtatCommande }) {
  return (
    <span
      className={`inline-block rounded-sm border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.12em] whitespace-nowrap uppercase ${TEINTE[etat]}`}
    >
      {LIBELLE_ETAT[etat]}
    </span>
  );
}
