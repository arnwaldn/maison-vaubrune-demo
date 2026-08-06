'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { centimesDepuisEuros, eurosDepuisCentimes } from '@/lib/argent';
import {
  DepotNavigateur,
  estDisponibleAffiche,
  miseEnAvantAffichee,
  prixAffiche,
  resumeAffiche,
  stockAffiche,
} from '@/lib/catalogue-navigateur';
import type { ModificationProduit } from '@/lib/catalogue';
import { purgerCommandesLocales } from '@/lib/commandes/depot-local';
import { useSurcouche } from '@/lib/contexte-surcouche';
import {
  projeterPourMarchand,
  type ProduitMarchand,
} from '@/lib/gestion/projection-marchand';
import { stockageLocal } from '@/lib/stockage-navigateur';
import { typographier } from '@/lib/typographie';
import type { Produit } from '@/lib/types';

/**
 * LE CATALOGUE TENU PAR LE MARCHAND — l'écran que l'offre promet.
 *
 * ---------------------------------------------------------------------------
 * Ce que cet écran modifie, et où ça s'applique (décision D24)
 * ---------------------------------------------------------------------------
 *
 * Cinq champs, pas un de plus : le résumé, la mise en avant et la disponibilité
 * du produit, le prix et le stock de chaque format. La liste est fermée dans
 * `catalogue-navigateur.ts`, qui explique pourquoi chacun des autres en est
 * exclu — clés, entrées de calcul, prose juridique.
 *
 * Les modifications s'appliquent à la VITRINE — `/boutique` et les quinze
 * fiches — et s'arrêtent là. Le panier et le paiement travaillent aux prix du
 * catalogue versionné, parce que le serveur ne fait jamais confiance au
 * navigateur. L'encart en tête de cet écran le dit avant que le visiteur ne
 * s'en étonne, et `/commande` le redit au moment où ça compte.
 *
 * ---------------------------------------------------------------------------
 * LA SAISIE D'UN PRIX, et le piège qu'elle évite
 * ---------------------------------------------------------------------------
 *
 * Le champ accepte des euros parce que c'est ce qu'un marchand a en tête ;
 * `centimesDepuisEuros()` le convertit EN TEXTE, sur des entiers, sans jamais
 * construire un flottant (voir son commentaire dans `lib/argent.ts` : la
 * multiplication par cent donne 1289,9999999999998 pour 12,90 €). Une saisie
 * qui ne se lit pas n'écrit rien et affiche son aide ; le champ garde ce que le
 * marchand a tapé, ce qui lui permet de corriger au lieu de retaper.
 *
 * ---------------------------------------------------------------------------
 * L'état local : des BROUILLONS, pas une copie du catalogue
 * ---------------------------------------------------------------------------
 *
 * La source de vérité reste la surcouche, dans le contexte. Les brouillons ne
 * portent que les saisies EN COURS qui ne sont pas encore lisibles — « 12, »,
 * « », « abc ». Sans eux, taper la virgule effacerait le caractère à l'écran
 * puisque rien de valide n'aurait été enregistré ; avec eux, le champ suit la
 * main et la surcouche ne reçoit que des valeurs.
 */

/** Nom du fichier téléchargé. Daté nulle part : c'est un état, pas un instantané. */
const NOM_FICHIER_EXPORT = 'maison-vaubrune-catalogue.json';

const CLASSE_CHAMP =
  'w-full rounded-sm border border-filet bg-creme px-2 py-1.5 text-sm text-encre';

export function IlotCatalogueMarchand({
  catalogue,
}: {
  readonly catalogue: readonly Produit[];
}) {
  const { surcouche, pretALEmploi, relire } = useSurcouche();
  const [brouillons, setBrouillons] = useState<Readonly<Record<string, string>>>({});
  const [message, setMessage] = useState<string | null>(null);

  const produits = useMemo(() => projeterPourMarchand(catalogue), [catalogue]);

  const noterBrouillon = useCallback((cle: string, valeur: string | null) => {
    setBrouillons((courants) => {
      const { [cle]: _retire, ...autres } = courants;
      return valeur === null ? autres : { ...autres, [cle]: valeur };
    });
  }, []);

  /**
   * TOUTES LES ÉCRITURES PASSENT PAR LE DÉPÔT, et une seule ligne le dit.
   *
   * `DepotNavigateur` est le contrat `DepotCatalogue` posé en C2 : c'est lui
   * qui fusionne, assainit et sérialise. Le fournisseur de contexte, lui, ne
   * sait que lire (voir son en-tête : il est monté sur toutes les pages, et
   * l'écriture n'y a rien à faire). On écrit, puis on demande une relecture.
   */
  const ecrire = useCallback(
    (agir: (depot: DepotNavigateur) => void): boolean => {
      const stockage = stockageLocal();

      if (stockage === null) {
        setMessage(
          typographier(
            'Le stockage de ce navigateur est inaccessible : vos modifications ne peuvent pas être enregistrées.',
          ),
        );
        return false;
      }

      agir(new DepotNavigateur(catalogue, stockage));
      relire();
      return true;
    },
    [catalogue, relire],
  );

  const enregistrer = useCallback(
    (slug: string, modification: ModificationProduit) => {
      ecrire((depot) => {
        depot.enregistrerModification(slug, modification);
      });
    },
    [ecrire],
  );

  const exporter = useCallback(() => {
    ecrire((depot) => {
      const adresse = URL.createObjectURL(
        new Blob([depot.exporter()], { type: 'application/json' }),
      );

      const lien = document.createElement('a');
      lien.href = adresse;
      lien.download = NOM_FICHIER_EXPORT;
      lien.click();
      URL.revokeObjectURL(adresse);

      setMessage(
        `Catalogue exporté sous « ${NOM_FICHIER_EXPORT} » : les quinze fiches entières, avec vos valeurs.`,
      );
    });
  }, [ecrire]);

  const toutReinitialiser = useCallback(() => {
    const stockage = stockageLocal();

    if (stockage !== null) {
      purgerCommandesLocales(stockage);
    }

    const fait = ecrire((depot) => {
      depot.reinitialiser();
    });

    if (!fait) {
      return;
    }

    setBrouillons({});
    setMessage(
      'Jeu d’essai réinitialisé : le catalogue est revenu à ses valeurs d’origine, et les six commandes d’exemple à leur état d’origine. Les commandes que vous aviez passées dans la démonstration ont été effacées.',
    );
  }, [ecrire]);

  if (!pretALEmploi) {
    return (
      <div
        aria-hidden="true"
        className="mt-10 min-h-96 rounded-sm border border-filet bg-papier"
      />
    );
  }

  const nombreModifies = produits.filter((produit) =>
    Object.hasOwn(surcouche, produit.slug),
  ).length;

  return (
    <div className="mt-10 min-h-96 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <p className="text-sm text-encre-douce tabular-nums">
          {nombreModifies === 0
            ? 'Aucune référence modifiée.'
            : `${String(nombreModifies)} référence${nombreModifies > 1 ? 's' : ''} modifiée${nombreModifies > 1 ? 's' : ''} sur ${String(produits.length)}.`}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exporter}
            className="rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme hover:bg-olive-clair"
          >
            Exporter en JSON
          </button>
          <button
            type="button"
            onClick={toutReinitialiser}
            className="rounded-sm border border-terre bg-creme px-4 py-2.5 text-sm font-semibold text-terre hover:bg-papier"
          >
            Réinitialiser le jeu d’essai
          </button>
        </div>
      </div>

      {message === null ? null : (
        <p
          role="status"
          className="mt-4 rounded-sm border border-olive/40 bg-papier px-4 py-3 text-sm leading-relaxed text-encre"
        >
          {message}
        </p>
      )}

      <ul className="mt-10 space-y-8">
        {produits.map((produit) => (
          <FicheMarchand
            key={produit.slug}
            produit={produit}
            surcouche={surcouche}
            brouillons={brouillons}
            noterBrouillon={noterBrouillon}
            enregistrer={enregistrer}
          />
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Une référence                                                               */
/* -------------------------------------------------------------------------- */

type Enregistrer = (slug: string, modification: ModificationProduit) => void;
type Surcouche = ReturnType<typeof useSurcouche>['surcouche'];

function FicheMarchand({
  produit,
  surcouche,
  brouillons,
  noterBrouillon,
  enregistrer,
}: {
  readonly produit: ProduitMarchand;
  readonly surcouche: Surcouche;
  readonly brouillons: Readonly<Record<string, string>>;
  readonly noterBrouillon: (cle: string, valeur: string | null) => void;
  readonly enregistrer: Enregistrer;
}) {
  const modifie = Object.hasOwn(surcouche, produit.slug);
  const resume = resumeAffiche(surcouche, produit.slug, produit.resume);
  const disponible = estDisponibleAffiche(surcouche, produit.slug);
  const enAvant = miseEnAvantAffichee(surcouche, produit.slug, produit.miseEnAvant);

  return (
    <li className="rounded-sm border border-filet bg-papier p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 className="font-titre text-lg font-semibold text-encre">
          <Link
            href={`/boutique/${produit.slug}`}
            className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
          >
            {produit.nom}
          </Link>
        </h3>
        <p className="flex items-baseline gap-3 text-xs text-encre-douce">
          <span>{produit.famille}</span>
          {modifie ? (
            <span className="rounded-sm border border-ocre px-2 py-0.5 font-semibold tracking-[0.12em] text-ocre uppercase">
              Modifié
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <label
            htmlFor={`resume-${produit.slug}`}
            className="block text-xs font-semibold tracking-[0.12em] text-encre-douce uppercase"
          >
            Résumé du rayon
          </label>
          <textarea
            id={`resume-${produit.slug}`}
            rows={2}
            value={brouillons[`resume:${produit.slug}`] ?? resume}
            onChange={(evenement) => {
              const valeur = evenement.target.value;

              if (valeur.trim() === '') {
                /* Un résumé vide ne s'enregistre pas — le filtre l'écarterait
                   et le champ se remplirait tout seul de l'ancienne valeur au
                   rendu suivant. Il reste donc en brouillon. */
                noterBrouillon(`resume:${produit.slug}`, valeur);
                return;
              }

              noterBrouillon(`resume:${produit.slug}`, null);
              enregistrer(produit.slug, { resume: valeur });
            }}
            className={CLASSE_CHAMP}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-encre-douce">
            Affiché sous le nom, dans la grille du rayon et en tête de fiche. Un
            résumé vide n’est pas enregistré.
          </p>
        </div>

        <fieldset className="border-0 p-0">
          <legend className="text-xs font-semibold tracking-[0.12em] text-encre-douce uppercase">
            État en rayon
          </legend>

          <label className="mt-3 flex items-baseline gap-2.5 text-sm text-encre">
            <input
              type="checkbox"
              checked={disponible}
              onChange={(evenement) => {
                enregistrer(produit.slug, { disponible: evenement.target.checked });
              }}
              className="mt-1 shrink-0 accent-olive"
            />
            <span>
              Disponible à la vente
              <span className="mt-0.5 block text-xs text-encre-douce">
                Décoché, la fiche reste lisible mais le bouton d’ajout s’éteint,
                avec son motif.
              </span>
            </span>
          </label>

          <label className="mt-4 flex items-baseline gap-2.5 text-sm text-encre">
            <input
              type="checkbox"
              checked={enAvant}
              onChange={(evenement) => {
                enregistrer(produit.slug, { miseEnAvant: evenement.target.checked });
              }}
              className="mt-1 shrink-0 accent-olive"
            />
            <span>
              Mise en avant
              <span className="mt-0.5 block text-xs text-encre-douce">
                Ajoute l’étiquette «&nbsp;Sélection&nbsp;» au rayon et sur la fiche.
              </span>
            </span>
          </label>
        </fieldset>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <caption className="sr-only">
            {typographier(`Formats de ${produit.nom} : prix et stock modifiables`)}
          </caption>
          <thead>
            <tr className="border-b border-filet text-left">
              <th scope="col" className="pb-2 font-semibold text-encre">
                Format
              </th>
              <th scope="col" className="pb-2 font-semibold text-encre">
                Prix (€)
              </th>
              <th scope="col" className="pb-2 font-semibold text-encre">
                Stock
              </th>
              <th scope="col" className="pb-2 text-right font-semibold text-encre">
                Poids
              </th>
            </tr>
          </thead>
          <tbody>
            {produit.variantes.map((variante) => (
              <LigneVariante
                key={variante.sku}
                slug={produit.slug}
                variante={variante}
                surcouche={surcouche}
                brouillons={brouillons}
                noterBrouillon={noterBrouillon}
                enregistrer={enregistrer}
              />
            ))}
          </tbody>
        </table>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Une variante                                                                */
/* -------------------------------------------------------------------------- */

function LigneVariante({
  slug,
  variante,
  surcouche,
  brouillons,
  noterBrouillon,
  enregistrer,
}: {
  readonly slug: string;
  readonly variante: ProduitMarchand['variantes'][number];
  readonly surcouche: Surcouche;
  readonly brouillons: Readonly<Record<string, string>>;
  readonly noterBrouillon: (cle: string, valeur: string | null) => void;
  readonly enregistrer: Enregistrer;
}) {
  const clePrix = `prix:${variante.sku}`;
  const cleStock = `stock:${variante.sku}`;

  const prix = prixAffiche(surcouche, slug, variante.sku, variante.prixCentimes);
  const stock = stockAffiche(surcouche, slug, variante.sku, variante.stock);

  const prixModifie = prix !== variante.prixCentimes;
  const stockModifie = stock !== variante.stock;

  const brouillonPrix = brouillons[clePrix];
  const prixIllisible = brouillonPrix !== undefined;

  return (
    <tr className="border-b border-filet/60 align-top">
      <td className="py-3 text-encre">
        {variante.format}
        <span className="block text-xs text-encre-douce">{variante.sku}</span>
      </td>

      <td className="py-3">
        <label htmlFor={`prix-${variante.sku}`} className="sr-only">
          Prix de {variante.format} en euros
        </label>
        <input
          id={`prix-${variante.sku}`}
          type="text"
          inputMode="decimal"
          value={brouillonPrix ?? eurosDepuisCentimes(prix)}
          aria-invalid={prixIllisible}
          aria-describedby={prixIllisible ? `aide-prix-${variante.sku}` : undefined}
          onChange={(evenement) => {
            const saisie = evenement.target.value;
            const centimes = centimesDepuisEuros(saisie);

            if (centimes === null) {
              noterBrouillon(clePrix, saisie);
              return;
            }

            noterBrouillon(clePrix, null);
            enregistrer(slug, {
              variantes: [{ sku: variante.sku, prixCentimes: centimes }],
            });
          }}
          className={`${CLASSE_CHAMP} w-28 tabular-nums`}
        />
        {prixIllisible ? (
          <p
            id={`aide-prix-${variante.sku}`}
            className="mt-1 text-xs leading-relaxed text-terre"
          >
            Un prix s’écrit avec au plus deux décimales, par exemple 12,90.
          </p>
        ) : null}
        <IndicateurModifie
          modifie={prixModifie}
          origine={`${eurosDepuisCentimes(variante.prixCentimes)} à l’origine`}
        />
      </td>

      <td className="py-3">
        <label htmlFor={`stock-${variante.sku}`} className="sr-only">
          Stock de {variante.format}
        </label>
        <input
          id={`stock-${variante.sku}`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={brouillons[cleStock] ?? String(stock)}
          onChange={(evenement) => {
            const saisie = evenement.target.value;
            const valeur = Number.parseInt(saisie, 10);

            if (!Number.isInteger(valeur) || valeur < 0 || !/^\d+$/.test(saisie)) {
              noterBrouillon(cleStock, saisie);
              return;
            }

            noterBrouillon(cleStock, null);
            enregistrer(slug, { variantes: [{ sku: variante.sku, stock: valeur }] });
          }}
          className={`${CLASSE_CHAMP} w-24 tabular-nums`}
        />
        <IndicateurModifie
          modifie={stockModifie}
          origine={`${String(variante.stock)} à l’origine`}
        />
      </td>

      <td className="py-3 text-right text-encre-douce tabular-nums">
        {variante.poidsGrammes}&nbsp;g
        <span className="mt-1 block text-xs">non modifiable</span>
      </td>
    </tr>
  );
}

/**
 * Le rappel de la valeur d'origine, sous un champ modifié.
 *
 * Il occupe TOUJOURS sa place, vide quand rien n'a changé : sans cela, la
 * première modification ferait grandir la ligne et pousserait tout le tableau
 * vers le bas au moment précis où le marchand tape — le pire moment.
 */
function IndicateurModifie({
  modifie,
  origine,
}: {
  readonly modifie: boolean;
  readonly origine: string;
}) {
  return (
    <p className="mt-1 min-h-4 text-xs leading-4 text-ocre">
      {modifie ? origine : ''}
    </p>
  );
}
