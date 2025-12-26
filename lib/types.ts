// Types pour remplacer les enums Prisma (SQLite ne supporte pas les enums)

export const UserRole = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const PrescriptionCycleStatus = {
  ACTIF: "ACTIF",
  TERMINE: "TERMINE",
  ANNULE: "ANNULE",
} as const;

export type PrescriptionCycleStatus = typeof PrescriptionCycleStatus[keyof typeof PrescriptionCycleStatus];

export const RenewalEventStatus = {
  A_PREPARER: "A_PREPARER",
  EN_PREPARATION: "EN_PREPARATION",
  PRET: "PRET",
  SMS_ENVOYE: "SMS_ENVOYE",
  TERMINE: "TERMINE",
  ANNULE: "ANNULE",
} as const;

export type RenewalEventStatus = typeof RenewalEventStatus[keyof typeof RenewalEventStatus];




