'use client';

import { useId, useState } from 'react';

import { usePanier } from '@/lib/panier/contexte-panier';
import { CODES_ZONE, LIBELLE_ZONE, type CodeZone } from '@/lib/types';
import { zoneDepuisCodePostal } from '@/lib/zones';

/**
 * LA DESTINATION, choisie explicitement ou déduite d'un code postal.
 *
 * ---------------------------------------------------------------------------
 * Deux entrées pour une seule décision
 * ---------------------------------------------------------------------------
 *
 * La zone est ce qui décide des frais de port et, pour un panier contenant du
 * frais, de la possibilité même d'expédier. Elle est donc toujours choisie de
 * façon EXPLICITE, par trois boutons radio — un client qui n'a rien saisi voit
 * quand même sur quelle base son prix est calculé.
 *
 * Le code postal est un CONFORT, pas une obligation : il pré-remplit la zone
 * (`zoneDepuisCodePostal`, tranche C3) pour éviter de faire choisir « Corse »
 * ou « outre-mer » à quelqu'un qui connaît son code postal et pas le découpage
 * de la boutique. Le champ est facultatif, et le rester : rien ne se bloque
 * s'il est vide.
 *
 * ---------------------------------------------------------------------------
 * Un code postal non reconnu ne bloque rien
 * ---------------------------------------------------------------------------
 *
 * `zoneDepuisCodePostal` rend `null` sur tout ce qui n'est pas cinq chiffres.
 * La réponse retenue est un message DOUX, sous le champ : la zone déjà
 * sélectionnée reste en vigueur, le calcul continue, rien ne devient rouge et
 * aucun bouton ne s'éteint. Une saisie en cours de frappe — « 750 » — n'est
 * pas une erreur du client, c'est un client qui tape.
 */

export function ChoixZone({ zone }: { readonly zone: CodeZone }) {
  const { envoyer } = usePanier();
  const identifiant = useId();
  const [codePostal, setCodePostal] = useState('');

  const nonReconnu = codePostal.trim() !== '' && zoneDepuisCodePostal(codePostal) === null;

  return (
    <section
      aria-labelledby={`${identifiant}-titre`}
      className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
    >
      <h2 id={`${identifiant}-titre`} className="sous-titre text-encre">
        Destination
      </h2>

      <fieldset className="mt-4 border-0 p-0">
        <legend className="etiquette text-encre-douce">Zone de livraison</legend>

        <div className="mt-3 space-y-1.5">
          {CODES_ZONE.map((candidate) => (
            <label
              key={candidate}
              className="flex items-baseline gap-2.5 text-sm text-encre"
            >
              <input
                type="radio"
                name={`${identifiant}-zone`}
                value={candidate}
                checked={zone === candidate}
                onChange={() => {
                  envoyer({ type: 'choisirZone', zone: candidate });
                }}
                className="mt-1 shrink-0 accent-olive"
              />
              {LIBELLE_ZONE[candidate]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <label
          htmlFor={`${identifiant}-code-postal`}
          className="etiquette block text-encre-douce"
        >
          Code postal (facultatif)
        </label>
        <input
          id={`${identifiant}-code-postal`}
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={codePostal}
          aria-describedby={`${identifiant}-aide-code-postal`}
          onChange={(evenement) => {
            const saisie = evenement.target.value;
            setCodePostal(saisie);

            const trouvee = zoneDepuisCodePostal(saisie);

            if (trouvee !== null) {
              envoyer({ type: 'choisirZone', zone: trouvee });
            }
          }}
          className="mt-2 w-32 rounded-sm border border-filet bg-creme px-3 py-2 font-mono text-sm text-encre tabular-nums"
        />

        <p
          id={`${identifiant}-aide-code-postal`}
          aria-live="polite"
          className="mt-2 max-w-lisible text-xs leading-relaxed text-encre-douce"
        >
          {nonReconnu
            ? 'Ce code postal n’est pas reconnu — cinq chiffres sont attendus. Vous pouvez continuer : la zone reste celle que vous avez cochée.'
            : 'Il sert seulement à cocher la bonne zone à votre place.'}
        </p>
      </div>
    </section>
  );
}
