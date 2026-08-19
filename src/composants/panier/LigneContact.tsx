import Link from 'next/link';

/**
 * « UNE QUESTION ? » — le renvoi vers le service client (C23).
 *
 * Sixième retour du professionnel qui a relu la boutique : « il faudrait aussi,
 * si il y a une adresse de contact vers le service client ou quelque chose, pour
 * rassurer l'utilisateur — une question, contactez-nous ». Il a raison, et le
 * client qui hésite au moment de payer n'a effectivement personne à qui
 * demander.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE BLOC NE PORTE AUCUNE COORDONNÉE, ET C'EST UN ARGUMENT DE VENTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `marchand.courriel`, `marchand.telephone` et `marchand.adresse` valent `null`
 * par doctrine du projet : « une adresse inventée peut exister pour de bon, et
 * un courriel plausible dans une démonstration finit tôt ou tard recopié dans un
 * vrai site ». La garde `verifier-aucune-donnee-inventee` refuserait de toute
 * façon une valeur écrite ici.
 *
 * Le bloc renvoie donc vers la section « 4. Contact » des mentions légales, où
 * les quatre emplacements — courriel, téléphone, adresse postale, horaires —
 * sont déjà rendus en `<AComplete>`, surlignés et annoncés aux lecteurs
 * d'écran. Un prospect qui ouvre cette démonstration y voit EXACTEMENT où ses
 * propres coordonnées viendront se brancher : le manque se lit comme un
 * gabarit, pas comme un oubli.
 *
 * AUCUN `<AComplete>` N'EST ÉCRIT ICI. La garde compte les emplacements fichier
 * par fichier, et les décomptes des cinq pages légales (22/11/41/7/0) sont un
 * invariant du dépôt. Ce composant renvoie vers eux plutôt que de les dupliquer,
 * ce qui est aussi la seule façon de n'avoir qu'une source à remplir le jour où
 * un marchand reprend ce socle.
 */
export function LigneContact() {
  return (
    <p className="registre text-encre-douce">
      Une question&nbsp;?{' '}
      <Link
        href="/mentions-legales#contact"
        className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
      >
        Contactez le service client
      </Link>
    </p>
  );
}
