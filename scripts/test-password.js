#!/usr/bin/env node

/**
 * Script pour tester si un mot de passe correspond à un hash
 */

const { compare } = require("bcryptjs");

const password = "admin123";
const hash = "$2a$12$aGvvGrqhwWi1jt2XAzib3Ov3fBybqGpBs7rkm7sn/n656Rrq.8yN6";

compare(password, hash)
  .then((isValid) => {
    if (isValid) {
      console.log("✅ Le hash est correct pour le mot de passe 'admin123'");
    } else {
      console.log("❌ Le hash ne correspond pas au mot de passe");
    }
  })
  .catch((error) => {
    console.error("❌ Erreur:", error.message);
  });

