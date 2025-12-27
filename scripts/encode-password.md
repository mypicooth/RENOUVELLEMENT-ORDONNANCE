# Comment encoder le mot de passe dans DATABASE_URL

## Problème

Si votre mot de passe Supabase contient des caractères spéciaux comme `@`, `#`, `%`, `&`, etc., ils doivent être **encodés en URL** dans la connection string.

## Solution

### Méthode 1 : Encoder manuellement

Remplacez les caractères spéciaux par leur équivalent URL :

| Caractère | Encodage URL |
|-----------|--------------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| `:` | `%3A` |
| ` ` (espace) | `%20` |

**Exemple** :
- Mot de passe : `MyP@ss#123`
- Encodé : `MyP%40ss%23123`
- Connection string : `postgresql://postgres:MyP%40ss%23123@db.xxxxx.supabase.co:5432/postgres`

### Méthode 2 : Utiliser un outil en ligne

1. Allez sur https://www.urlencoder.org/
2. Collez votre mot de passe
3. Copiez le résultat encodé
4. Remplacez dans votre connection string

### Méthode 3 : Utiliser Node.js (PowerShell)

```powershell
# Dans PowerShell
$password = "VotreMotDePasseAvec@Caractères#Spéciaux"
[System.Web.HttpUtility]::UrlEncode($password)
```

### Méthode 4 : Utiliser le script fourni

```bash
node scripts/fix-database-url.js
```

## Exemple complet

**Connection string Supabase originale** :
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Si votre mot de passe est** : `rSk5Js!v3T8S@123`

**Connection string corrigée** :
```
postgresql://postgres:rSk5Js!v3T8S%40123@db.xxxxx.supabase.co:5432/postgres
```

Notez que `@` devient `%40`.

## Vérification

Votre connection string doit respecter ce format :
```
postgresql://[USER]:[PASSWORD_ENCODED]@[HOST]:[PORT]/[DATABASE]
```

Où :
- `[USER]` = `postgres`
- `[PASSWORD_ENCODED]` = votre mot de passe avec caractères spéciaux encodés
- `[HOST]` = `db.xxxxx.supabase.co`
- `[PORT]` = `5432`
- `[DATABASE]` = `postgres`


