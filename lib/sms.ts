import { prisma } from "./prisma";
import { normalizePhone } from "./phone";

const TEXTINGHOUSE_API_URLS = [
  "https://api.textinghouse.com/http/v1/do",
  "https://api2.textinghouse.com/http/v1/do",
];

export interface SendSmsParams {
  renewalEventId: string;
  templateId?: string;
  message?: string;
  userId: string;
}

export interface SmsResult {
  success: boolean;
  apiId?: string;
  error?: string;
}

/**
 * Envoie un SMS via TextingHouse avec retry automatique
 */
async function sendSmsToTextingHouse(
  to: string,
  message: string
): Promise<SmsResult> {
  const user = process.env.TEXTINGHOUSE_USER;
  const pass = process.env.TEXTINGHOUSE_PASS;
  const from = process.env.TEXTINGHOUSE_FROM;

  if (!user || !pass) {
    throw new Error("TEXTINGHOUSE_USER et TEXTINGHOUSE_PASS doivent être configurés");
  }

  // Valider le message
  if (message.length > 160) {
    throw new Error("Le message ne doit pas dépasser 160 caractères");
  }

  // Vérifier les emojis (caractères non-ASCII simples)
  if (/[\u{1F300}-\u{1F9FF}]/u.test(message)) {
    throw new Error("Les emojis ne sont pas autorisés");
  }

  const params = new URLSearchParams({
    cmd: "sendsms",
    to,
    txt: message,
    iscom: "N",
    user,
    pass,
  });

  if (from) {
    params.append("from", from);
  }

  let lastError: Error | null = null;

  // Essayer chaque URL
  for (const url of TEXTINGHOUSE_API_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const text = await response.text();

      // TextingHouse retourne "ID:xxxxx" en cas de succès
      if (text.startsWith("ID:")) {
        const apiId = text.replace("ID:", "").trim();
        return { success: true, apiId };
      }

      // TextingHouse retourne "ERR:message" en cas d'erreur
      if (text.startsWith("ERR:")) {
        const error = text.replace("ERR:", "").trim();
        lastError = new Error(error);
        continue; // Essayer l'URL suivante
      }

      // Réponse inattendue
      lastError = new Error(`Réponse inattendue: ${text}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continuer vers l'URL suivante
    }
  }

  // Toutes les tentatives ont échoué
  return {
    success: false,
    error: lastError?.message || "Erreur inconnue lors de l'envoi du SMS",
  };
}

/**
 * Envoie un SMS pour un renouvellement
 */
export async function sendRenewalSms(params: SendSmsParams): Promise<SmsResult> {
  const { renewalEventId, templateId, message, userId } = params;

  // Récupérer l'événement de renouvellement
  const renewalEvent = await prisma.renewalEvent.findUnique({
    where: { id: renewalEventId },
    include: {
      prescriptionCycle: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!renewalEvent) {
    throw new Error("Renouvellement introuvable");
  }

  const patient = renewalEvent.prescriptionCycle.patient;

  // Vérifier le consentement
  if (!patient.consentement) {
    throw new Error("Le patient n'a pas donné son consentement pour l'envoi de SMS");
  }

  // Permettre l'envoi de SMS même si le statut n'est pas PRET (flexibilité)
  // Pas de vérification de statut pour permettre l'envoi à tout moment

  // Récupérer ou utiliser le message
  let smsMessage: string;
  let finalTemplateId: string | null = null;
  
  if (templateId) {
    const template = await prisma.smsTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template || !template.actif) {
      throw new Error("Template SMS introuvable ou inactif");
    }
    smsMessage = template.message;
    finalTemplateId = template.id;
  } else if (message) {
    smsMessage = message;
  } else {
    // Utiliser le template par défaut RENOUVELLEMENT_PRET
    const defaultTemplate = await prisma.smsTemplate.findFirst({
      where: {
        code: "RENOUVELLEMENT_PRET",
        actif: true,
      },
    });
    if (!defaultTemplate) {
      throw new Error("Template par défaut RENOUVELLEMENT_PRET introuvable");
    }
    smsMessage = defaultTemplate.message;
    finalTemplateId = defaultTemplate.id;
  }

  // Normaliser le téléphone
  const phoneNormalized = normalizePhone(patient.telephone_normalise);
  if (!phoneNormalized) {
    throw new Error("Numéro de téléphone invalide");
  }

  // Envoyer le SMS
  const result = await sendSmsToTextingHouse(phoneNormalized, smsMessage);

  // Logger en base
  await prisma.smsLog.create({
    data: {
      renewal_event_id: renewalEventId,
      prescription_cycle_id: renewalEvent.prescription_cycle_id,
      template_id: finalTemplateId,
      telephone: phoneNormalized,
      message: smsMessage,
      statut: result.success ? "SUCCESS" : "ERROR",
      api_id: result.apiId || null,
      erreur: result.error || null,
      sent_by: userId,
    },
  });

  // Si succès, mettre à jour le statut du renouvellement
  if (result.success) {
    await prisma.renewalEvent.update({
      where: { id: renewalEventId },
      data: {
        statut: "SMS_ENVOYE",
        date_sms: new Date(),
      },
    });
  }

  return result;
}

