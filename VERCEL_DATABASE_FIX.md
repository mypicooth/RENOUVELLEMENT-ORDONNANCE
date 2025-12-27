# 🔧 Fix : Erreur "prepared statement already exists" sur Vercel

## Problème

L'erreur `prepared statement "s0" already exists` se produit dans les environnements serverless (Vercel) lorsque plusieurs instances de Prisma tentent de créer des prepared statements PostgreSQL en même temps.

## Solution recommandée : Utiliser Supabase Connection Pooling

La meilleure solution est d'utiliser le **Connection Pooling** de Supabase qui désactive automatiquement les prepared statements.

### Étapes :

1. **Dans Supabase Dashboard** :
   - Allez dans **Settings** → **Database**
   - Trouvez la section **Connection Pooling**
   - Copiez l'URL de connection pooling (port **6543**)

2. **Dans Vercel** :
   - Allez dans **Settings** → **Environment Variables**
   - Mettez à jour `DATABASE_URL` avec l'URL de connection pooling
   - Format : `postgresql://user:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true`

3. **Redéployez** votre application

## Solution alternative : Configuration Prisma

Si vous ne pouvez pas utiliser le connection pooling, le code a été modifié pour :
- Limiter les connexions (`connection_limit=1`)
- Ne pas réutiliser le client Prisma global en production
- Créer un nouveau client pour chaque invocation serverless

## Vérification

Après le déploiement, l'erreur ne devrait plus apparaître. Si elle persiste :

1. Vérifiez que vous utilisez bien le connection pooling (port 6543)
2. Vérifiez que `DATABASE_URL` est correctement configuré dans Vercel
3. Videz le cache de build sur Vercel et redéployez

## Références

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

