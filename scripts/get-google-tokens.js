/**
 * Script helper pour obtenir les tokens Google Calendar depuis les cookies
 * 
 * Ce script vous aide à récupérer les tokens depuis votre navigateur
 * après vous être connecté à Google Calendar dans l'application
 * 
 * Usage: 
 * 1. Connectez-vous à Google Calendar via /admin/import
 * 2. Ouvrez la console du navigateur (F12)
 * 3. Exécutez: document.cookie
 * 4. Copiez les valeurs de google_access_token et google_refresh_token
 * 5. Utilisez-les avec update-phones-from-calendar.js
 */

console.log(`
📋 Guide pour obtenir les tokens Google Calendar:

1. Allez sur votre application: /admin/import
2. Cliquez sur "Se connecter à Google Calendar"
3. Autorisez l'accès
4. Une fois connecté, ouvrez la console du navigateur (F12)
5. Exécutez cette commande dans la console:

   document.cookie.split(';').find(c => c.includes('google_access_token'))

6. Copiez la valeur du token
7. Faites de même pour google_refresh_token

8. Exécutez ensuite:
   GOOGLE_ACCESS_TOKEN="votre_token" GOOGLE_REFRESH_TOKEN="votre_refresh_token" node scripts/update-phones-from-calendar.js

💡 Alternative: Utilisez l'API directement depuis l'application
   L'interface web à /admin/import permet aussi de faire cette mise à jour.
`);

