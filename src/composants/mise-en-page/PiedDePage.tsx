import Link from 'next/link';

import { marchand } from '@/donnees/marchand';

/**
 * Pied de page.
 *
 * Bascule C7 : les documents légaux étaient listés EN TEXTE depuis C1, avec la
 * mention « (à venir) », parce qu'ils n'existaient pas — un lien mort valant
 * moins qu'un inventaire honnête, et coûtant en plus une page 404 aux robots
 * d'indexation. Ils existent maintenant, et ce sont donc de vrais `<Link>` :
 * cinq destinations, quatre documents de vente et la page qui dit ce que la
 * démonstration fait et ne fait pas.
 *
 * Le paragraphe qui annonçait des gabarits AU FUTUR (« ces documents seront des
 * gabarits ») est réécrit au présent : la promesse est tenue, la formuler
 * encore comme une promesse la ferait passer pour une dette.
 *
 * Le lien vers le formulaire de rétractation téléchargeable n'est PAS ici. Il
 * vit sur `/retractation`, à côté du modèle qu'il reproduit : proposer le
 * téléchargement d'un formulaire à quelqu'un qui n'a pas lu à quelles
 * conditions il s'exerce serait le pousser à l'envoyer pour rien.
 */
const DOCUMENTS_LEGAUX = [
  { libelle: 'Mentions légales', adresse: '/mentions-legales' },
  {
    libelle: 'Conditions générales de vente',
    adresse: '/conditions-generales-de-vente',
  },
  { libelle: 'Données personnelles et cookies', adresse: '/donnees-personnelles' },
  { libelle: 'Droit de rétractation', adresse: '/retractation' },
  {
    libelle: 'À propos de cette démonstration',
    adresse: '/a-propos-de-cette-demonstration',
  },
] as const;

const ANNEE_COURANTE = 2026;

const CLASSE_LIEN =
  'underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre';

export function PiedDePage() {
  return (
    <footer className="mt-8 border-t border-filet bg-papier">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8">
        <div>
          <p className="font-titre text-lg font-semibold text-encre">{marchand.nom}</p>
          <p className="mt-1 text-sm text-encre-douce">{marchand.baseline}</p>
          <p className="mt-5 max-w-lisible text-sm leading-relaxed text-encre-douce">
            Démonstration — épicerie fictive. Aucune commande n’est expédiée, aucun
            paiement n’est encaissé.
          </p>
        </div>

        <div>
          <h2 className="font-titre text-base font-semibold text-encre">
            Documents légaux
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-encre-douce">
            {DOCUMENTS_LEGAUX.map((document) => (
              <li key={document.adresse}>
                <Link href={document.adresse} className={CLASSE_LIEN}>
                  {document.libelle}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-lisible text-xs leading-relaxed text-encre-douce">
            Ces documents sont des gabarits&nbsp;: les emplacements que remplit le
            marchand y sont surlignés, et aucune donnée d’entreprise n’a été inventée
            pour les remplir.
          </p>
        </div>
      </div>

      <div className="border-t border-filet">
        <p className="mx-auto max-w-page px-5 py-5 text-xs text-encre-douce sm:px-8">
          © {ANNEE_COURANTE} {marchand.nom} — maison fictive, boutique de
          démonstration.
        </p>
      </div>
    </footer>
  );
}
