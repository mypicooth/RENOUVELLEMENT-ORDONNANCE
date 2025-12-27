# Migration : Table patient_consents

## Étape 1 : Générer la migration Prisma

```bash
npx prisma migrate dev --name add_patient_consents
```

Ou en production :

```bash
npx prisma migrate deploy
```

## Étape 2 : Vérifier la migration

La table `patient_consents` devrait être créée avec les colonnes suivantes :
- id (uuid, primary key)
- patient_id (uuid, foreign key vers patients)
- consent_type (string, default: "ORDONNANCE_RETENTION")
- created_at (timestamp)
- signed_at (timestamp nullable)
- place (string, default: "LA POSSESSION")
- today_date (string)
- end_date (string nullable)
- document_url (string nullable)
- signature_data (text nullable)
- revoked_at (timestamp nullable)
- revoked_reason (string nullable)
- created_by (uuid, foreign key vers users)
- revoked_by (uuid nullable, foreign key vers users)

## Étape 3 : Tester la fonctionnalité

1. Aller sur la fiche d'un patient
2. Cliquer sur "Faire signer l'autorisation"
3. Remplir le formulaire et signer
4. Vérifier que le consentement apparaît dans la section "Documents"
5. Tester le téléchargement du PDF
6. Tester la révocation

## Notes

- Les PDFs sont stockés en base64 dans `document_url` pour l'instant
- En production, vous pourriez vouloir utiliser un service de stockage (S3, etc.)
- La signature est stockée en base64 dans `signature_data`

