/**
 * Template d'autorisation de conservation d'ordonnance
 * Pharmacie Saint Laurent - La Possession
 */

export interface ConsentTemplateData {
  patientLastName: string;
  patientFirstName: string;
  patientDOB: string; // Format: JJ/MM/AAAA
  patientPhone: string;
  patientEmail?: string;
  todayDate: string; // Format: JJ/MM/AAAA
  endDate: string; // Format: JJ/MM/AAAA ou "jusqu'à révocation"
  signatureImage?: string; // Base64 de l'image de signature
  consentId: string; // Identifiant unique du consentement
}

export function generateConsentText(data: ConsentTemplateData): string {
  const {
    patientLastName,
    patientFirstName,
    patientDOB,
    patientPhone,
    patientEmail = "",
    todayDate,
    endDate,
    consentId,
  } = data;

  return `(Pharmacie Saint Laurent – La Possession)

AUTORISATION DE CONSERVATION D'ORDONNANCE (COPIE / ORIGINAL SELON PROCÉDURE)
Pharmacie Saint Laurent – 73 rue Romain Rolland, 97419 La Possession

Identité du patient

Nom : ${patientLastName}

Prénom : ${patientFirstName}

Date de naissance : ${patientDOB}

Téléphone : ${patientPhone}

Email (facultatif) : ${patientEmail || "Non renseigné"}

Objet de l'autorisation

Je soussigné(e) ${patientFirstName} ${patientLastName}, autorise la Pharmacie Saint Laurent à conserver mon ordonnance afin de faciliter la gestion de mes renouvellements et la préparation de mes traitements, dans le cadre du suivi pharmaceutique.

Ce que j'accepte concrètement

La pharmacie peut conserver l'ordonnance (ou une copie/scan si c'est la procédure retenue en officine).

La pharmacie peut me recontacter (téléphone / SMS / email si renseigné) pour :

- me rappeler une échéance de renouvellement,
- préparer mes produits avant mon passage,
- éviter une rupture de traitement.

Durée de conservation

La conservation est limitée à la période utile de renouvellement, et au maximum jusqu'au : ${endDate}.

Confidentialité et droits du patient (RGPD)

Les informations sont utilisées uniquement pour la gestion de mes renouvellements et sont accessibles uniquement par l'équipe habilitée de la Pharmacie Saint Laurent.
Je peux retirer mon accord à tout moment, demander l'accès, la rectification, ou la suppression des données lorsque cela est applicable, en contactant la pharmacie.

Révocation

Je comprends que je peux demander à tout moment la restitution de l'ordonnance (ou l'arrêt de la conservation / la suppression de la copie), sans justification.

Signature

Lieu de signature : LA POSSESSION
Date de signature : ${todayDate}

Signature du patient :

[Signature]

---

ConsentID: ${consentId}
`;
}

