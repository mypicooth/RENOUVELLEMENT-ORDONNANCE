# 🚀 Déploiement rapide sur Vercel

## Checklist rapide

### 1. Code sur GitHub ✅
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 2. Variables à configurer dans Vercel

| Variable | Valeur | Où trouver |
|----------|--------|------------|
| `DATABASE_URL` | Connection string Supabase (avec pooler) | Supabase → Settings → Database → Connection Pooling |
| `NEXTAUTH_SECRET` | Secret aléatoire | https://generate-secret.vercel.app/32 |
| `NEXTAUTH_URL` | `https://votre-projet.vercel.app` | (à mettre à jour après déploiement) |
| `TEXTINGHOUSE_USER` | `contact@pharmaciesaintlaurent.re` | Vos identifiants |
| `TEXTINGHOUSE_PASS` | Votre mot de passe | Vos identifiants |
| `TEXTINGHOUSE_FROM` | `PHARMACIE` | Votre config |

### 3. Étapes Vercel

1. **vercel.com** → Sign in with GitHub
2. **Add New Project** → Sélectionnez votre repo
3. **Environment Variables** → Ajoutez les 6 variables ci-dessus
4. **Deploy** → Attendez 2-3 minutes
5. **Settings** → **Environment Variables** → Mettez à jour `NEXTAUTH_URL` avec l'URL exacte
6. **Redeploy** pour appliquer le changement

### 4. Test

- Ouvrez l'URL Vercel
- Connectez-vous : `admin@pharmacie.local` / `admin123`
- ⚠️ **Changez le mot de passe immédiatement !**

---

## 🔗 Liens utiles

- Vercel : https://vercel.com
- Supabase : https://supabase.com/dashboard
- Générer NEXTAUTH_SECRET : https://generate-secret.vercel.app/32

---

## ✅ C'est tout !

Votre application est maintenant en production ! 🎉

