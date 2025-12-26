/**
 * Normalise un numéro de téléphone français/La Réunion au format 33XXXXXXXXX ou 262XXXXXXXXX
 * Accepte : 06/07, +33, 0033, 0262 (La Réunion), avec espaces/points
 * La Réunion utilise l'indicatif 262
 */
export function normalizePhone(phone: string): string | null {
  // Supprimer tous les espaces, points, tirets
  let cleaned = phone.replace(/[\s\.\-\(\)]/g, "");

  // La Réunion : 0262XXXXXXXX (10 chiffres) -> 262XXXXXXXX
  if (cleaned.startsWith("0262") && cleaned.length === 12) {
    return "262" + cleaned.slice(4);
  }

  // La Réunion : +262 ou 00262
  if (cleaned.startsWith("00262")) {
    cleaned = "262" + cleaned.slice(5);
    if (cleaned.length === 12) {
      return cleaned;
    }
  }

  if (cleaned.startsWith("+262")) {
    cleaned = "262" + cleaned.slice(4);
    if (cleaned.length === 12) {
      return cleaned;
    }
  }

  // Remplacer 0033 par +33
  if (cleaned.startsWith("0033")) {
    cleaned = "+33" + cleaned.slice(4);
  }

  // Si commence par 0, remplacer par +33
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "+33" + cleaned.slice(1);
  }

  // Si commence par +33, garder tel quel
  if (cleaned.startsWith("+33")) {
    cleaned = "33" + cleaned.slice(3);
  }

  // Vérifier le format final : 33 suivi de 9 chiffres OU 262 suivi de 9 chiffres
  const phoneRegex = /^(33[1-9]\d{8}|262[1-9]\d{8})$/;
  if (phoneRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Formate un numéro normalisé pour l'affichage : 0X XX XX XX XX
 */
export function formatPhoneForDisplay(phone: string): string {
  if (phone.startsWith("33") && phone.length === 11) {
    const digits = phone.slice(2);
    return `0${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return phone;
}

