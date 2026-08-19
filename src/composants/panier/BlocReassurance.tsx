import { BAREMES } from '@/donnees/bareme-expedition';
import { LigneContact } from '@/composants/panier/LigneContact';
import { formaterEuros } from '@/lib/argent';
import { LIBELLE_ZONE } from '@/lib/types';

/**
 * CE QUE LA MAISON GARANTIT — aux trois endroits où l'on hésite (C25).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE COMPOSANT EXISTE, ET CE QUE SA NAISSANCE CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le professionnel qui a relu la boutique demandait « des éléments de
 * réassurance DANS LE PANIER OU AU NIVEAU DE LA FICHE PRODUIT ». C23 les a
 * posés dans le tiroir d'ajout — et s'est arrêté là.
 *
 * Or le tiroir n'est ni l'un ni l'autre : c'est un écran de PASSAGE, qui
 * s'ouvre après un clic et disparaît au suivant. Vérifié sur le site publié :
 * fiche produit, tiroir fermé → aucune mention ; page panier → ni les quatorze
 * jours ni le paiement. Le client qui hésite DEVANT sa fiche, ou devant son
 * panier avant de payer, ne voyait rien. C'est exactement le moment que la
 * remarque visait, et c'est celui qui manquait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CHAQUE LIGNE PUISE DANS UNE SOURCE UNIQUE DU SITE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - QUATORZE JOURS, jamais trente. Le site l'écrit dans `/retractation` et dans
 *   les CGV (article L. 221-18). L'exemple du professionnel — « retour sous
 *   30 jours » — mettrait la boutique en contradiction avec ses propres pages
 *   légales, ce qui est un écart opposable au marchand et non une formule
 *   commerciale.
 * - LE SEUIL DE PORT est LU dans le barème, jamais recopié, et il est suivi du
 *   NOM DE SA ZONE : il ne vaut pas la même chose dans les trois, et un franco
 *   affiché sans sa zone est une promesse fausse pour deux visiteurs sur trois.
 * - LE PRESTATAIRE N'EST PAS NOMMÉ. Les CGV le laissent en emplacement à
 *   compléter ; la garde des marques réelles rend ce choix vérifiable plutôt
 *   que promis.
 *
 * Composant SERVEUR, sans état : il peut donc entrer aussi bien dans une page
 * statique que dans un nœud passé à un îlot client.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'IDENTIFIANT EST À LA CHARGE DE L'APPELANT, ET C'EST OBLIGATOIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le bloc portait un `id` écrit en dur. Tant qu'il ne vivait que dans le
 * tiroir, l'identifiant était unique par construction. En le posant AUSSI sur
 * la fiche produit, la page s'est mise à rendre DEUX `<section>` liées au même
 * identifiant — le seul doublon du document, mesuré sur le site publié.
 *
 * Un identifiant se doit d'être unique : c'est une règle du langage, pas une
 * préférence. La conséquence pratique est qu'`aria-labelledby` résout vers le
 * PREMIER élément trouvé, donc les deux sections empruntaient le titre du
 * tiroir. Les deux textes étant identiques, rien ne s'entendait — mais rien ne
 * garantit qu'ils le resteront.
 *
 * AXE NE L'AURAIT PAS DIT : la règle `duplicate-id-aria` a été retirée
 * d'axe-core après la 4.10, et la campagne d'accessibilité balaye pourtant
 * cette fiche depuis C8. L'outil a cessé de regarder ; le dépôt regarde à sa
 * place (contrôle d'unicité dans `tests/e2e/accessibilite.spec.ts`).
 *
 * Le nom est donc REQUIS et sans valeur par défaut : un quatrième emplacement
 * ne pourra pas naître sans que son auteur choisisse comment l'appeler.
 */
export function BlocReassurance({
  identifiant,
  avecContact = true,
  className = '',
}: {
  /** Identifiant du titre, UNIQUE dans la page qui rend ce bloc. */
  readonly identifiant: string;
  /**
   * Le renvoi vers le service client accompagne-t-il les trois garanties ?
   *
   * `false` sur la page panier, où `LigneContact` est déjà posée sous le
   * récapitulatif depuis C23 — la répéter à deux blocs d'écart ferait un
   * doublon que l'œil lit comme une maladresse, pas comme une insistance.
   */
  readonly avecContact?: boolean;
  readonly className?: string;
}) {
  const metropole = BAREMES.metropole;

  return (
    <section aria-labelledby={identifiant} className={className}>
      <h2 id={identifiant} className="sr-only">
        Ce que la maison garantit
      </h2>
      <ul className="registre space-y-1.5 text-encre-douce">
        <li>Quatorze jours pour changer d’avis</li>
        <li>
          Port offert dès {formaterEuros(metropole.seuilFrancoCentimes ?? 0)} en{' '}
          {LIBELLE_ZONE.metropole}
        </li>
        <li>Paiement sécurisé par prestataire agréé</li>
      </ul>
      {avecContact ? (
        <div className="mt-3">
          <LigneContact />
        </div>
      ) : null}
    </section>
  );
}
