# Variables d'environnement nécessaires

Créez un fichier `.env` (ou configurez-les dans Railway) avec les variables suivantes :

```env
# Base de données
# Pour le développement local (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# Pour la production (PostgreSQL) - Railway fournira cette URL automatiquement
# DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth
# Générez un secret avec: openssl rand -base64 32
# Ou en ligne: https://generate-secret.vercel.app/32
NEXTAUTH_SECRET="changez-moi-par-un-secret-aleatoire-tres-long"
NEXTAUTH_URL="http://localhost:3000"
# En production, utilisez: https://votre-app.railway.app

# TextingHouse (SMS)
TEXTINGHOUSE_USER="votre-username"
TEXTINGHOUSE_PASS="votre-password"
TEXTINGHOUSE_FROM="votre-numero-expediteur"
```

## Génération de NEXTAUTH_SECRET

Sur Windows (PowerShell) :
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Sur Mac/Linux :
```bash
openssl rand -base64 32
```

En ligne : https://generate-secret.vercel.app/32

