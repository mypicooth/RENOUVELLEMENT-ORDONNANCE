import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { UserRole } from "../lib/types";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Créer le compte superadmin (accès stats opérateurs + création des opérateurs)
  const superAdminEmail = "superadmin@pharmacie.local";
  const superAdminPassword = await hash("superadmin123", 12);
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });
  if (!existingSuperAdmin) {
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: superAdminPassword,
        role: UserRole.SUPERADMIN,
        nom: "Superadmin",
        prenom: "Pharmacie",
      },
    });
    console.log("✅ Compte superadmin créé (superadmin@pharmacie.local / superadmin123)");
  } else {
    console.log("ℹ️  Compte superadmin existe déjà");
  }

  // Créer un utilisateur admin par défaut (pharmacien titulaire, sans accès stats/création opérateurs)
  const adminEmail = "admin@pharmacie.local";
  const adminPassword = await hash("admin123", 12);
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: adminPassword,
        role: UserRole.ADMIN,
        nom: "Admin",
        prenom: "Pharmacie",
      },
    });
    console.log("✅ Utilisateur admin créé (admin@pharmacie.local / admin123)");
  } else {
    console.log("ℹ️  Utilisateur admin existe déjà");
  }

  // Créer les templates SMS par défaut
  const templates = [
    {
      code: "RENOUVELLEMENT_PRET",
      libelle: "Renouvellement prêt",
      message:
        "Bonjour, votre renouvellement est prêt. Vous pouvez passer le récupérer à la Pharmacie Saint-Laurent. À bientôt.",
      actif: true,
    },
    {
      code: "ORDONNANCE_TERMINEE",
      libelle: "Ordonnance terminée",
      message:
        "Bonjour, votre ordonnance est terminée. Pensez à nous rapporter la nouvelle ordonnance pour la suite. Pharmacie Saint-Laurent.",
      actif: true,
    },
    {
      code: "RAPPEL_PROCHAINE_FOIS",
      libelle: "Rappel prochaine fois",
      message:
        "Bonjour, pour gagner du temps la prochaine fois, vous pouvez nous laisser l'ordonnance au comptoir. Pharmacie Saint-Laurent.",
      actif: true,
    },
    {
      code: "COURT",
      libelle: "Message court",
      message:
        "Bonjour, votre traitement est prêt à la Pharmacie Saint-Laurent. Vous pouvez passer le récupérer.",
      actif: true,
    },
  ];

  for (const template of templates) {
    const existing = await prisma.smsTemplate.findUnique({
      where: { code: template.code },
    });

    if (!existing) {
      await prisma.smsTemplate.create({
        data: template,
      });
      console.log(`✅ Template ${template.code} créé`);
    } else {
      console.log(`ℹ️  Template ${template.code} existe déjà`);
    }
  }

  console.log("✨ Seeding terminé!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

