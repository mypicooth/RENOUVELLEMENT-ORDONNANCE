import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ConsentTemplateData } from "../consentTemplates/ordonnanceRetention";

/**
 * Génère un PDF d'autorisation de conservation d'ordonnance
 */
export async function generateConsentPDF(data: ConsentTemplateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([595, 842]); // A4 en points (210mm x 297mm)

  // Marges
  const margin = 50;
  const maxWidth = currentPage.getWidth() - 2 * margin;
  let yPosition = currentPage.getHeight() - margin;

  // Polices
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Titre principal
  currentPage.drawText("AUTORISATION DE CONSERVATION D'ORDONNANCE", {
    x: margin,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  currentPage.drawText("(COPIE / ORIGINAL SELON PROCÉDURE)", {
    x: margin,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;

  currentPage.drawText("Pharmacie Saint Laurent – 73 rue Romain Rolland, 97419 La Possession", {
    x: margin,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  yPosition -= 30;

  // Section Identité du patient
  currentPage.drawText("Identité du patient", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  const patientInfo = [
    `Nom : ${data.patientLastName}`,
    `Prénom : ${data.patientFirstName}`,
    `Date de naissance : ${data.patientDOB}`,
    `Téléphone : ${data.patientPhone}`,
    `Email (facultatif) : ${data.patientEmail || "Non renseigné"}`,
  ];

  for (const line of patientInfo) {
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  yPosition -= 10;

  // Section Objet de l'autorisation
  currentPage.drawText("Objet de l'autorisation", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  const objetText = `Je soussigné(e) ${data.patientFirstName} ${data.patientLastName}, autorise la Pharmacie Saint Laurent à conserver mon ordonnance afin de faciliter la gestion de mes renouvellements et la préparation de mes traitements, dans le cadre du suivi pharmaceutique.`;
  const objetLines = wrapText(objetText, maxWidth, helvetica, 10);
  for (const line of objetLines) {
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  yPosition -= 10;

  // Section Ce que j'accepte concrètement
  currentPage.drawText("Ce que j'accepte concrètement", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  const acceptText = [
    "La pharmacie peut conserver l'ordonnance (ou une copie/scan si c'est la procédure retenue en officine).",
    "",
    "La pharmacie peut me recontacter (téléphone / SMS / email si renseigné) pour :",
    "",
    "• me rappeler une échéance de renouvellement,",
    "• préparer mes produits avant mon passage,",
    "• éviter une rupture de traitement.",
  ];

  for (const line of acceptText) {
    if (line) {
      const wrappedLines = wrapText(line, maxWidth, helvetica, 10);
      for (const wrappedLine of wrappedLines) {
        currentPage.drawText(wrappedLine, {
          x: margin,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      }
    } else {
      yPosition -= 10;
    }
  }
  yPosition -= 10;

  // Vérifier si on a besoin d'une nouvelle page
  if (yPosition < 200) {
    currentPage = pdfDoc.addPage([595, 842]);
    yPosition = currentPage.getHeight() - margin;
  }

  // Section Durée de conservation
  currentPage.drawText("Durée de conservation", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  const dureeText = `La conservation est limitée à la période utile de renouvellement, et au maximum jusqu'au : ${data.endDate}.`;
  const dureeLines = wrapText(dureeText, maxWidth, helvetica, 10);
  for (const line of dureeLines) {
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  yPosition -= 10;

  // Section Confidentialité
  currentPage.drawText("Confidentialité et droits du patient (RGPD)", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  const rgpdText = `Les informations sont utilisées uniquement pour la gestion de mes renouvellements et sont accessibles uniquement par l'équipe habilitée de la Pharmacie Saint Laurent.\nJe peux retirer mon accord à tout moment, demander l'accès, la rectification, ou la suppression des données lorsque cela est applicable, en contactant la pharmacie.`;
  const rgpdLines = wrapText(rgpdText, maxWidth, helvetica, 10);
  for (const line of rgpdLines) {
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  yPosition -= 10;

  // Section Révocation
  currentPage.drawText("Révocation", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  const revocationText = `Je comprends que je peux demander à tout moment la restitution de l'ordonnance (ou l'arrêt de la conservation / la suppression de la copie), sans justification.`;
  const revocationLines = wrapText(revocationText, maxWidth, helvetica, 10);
  for (const line of revocationLines) {
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  yPosition -= 30;

  // Section Signature
  currentPage.drawText("Signature", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  currentPage.drawText(`Lieu de signature : LA POSSESSION`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;

  currentPage.drawText(`Date de signature : ${data.todayDate}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  currentPage.drawText("Signature du patient :", {
    x: margin,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  yPosition -= 10;

  // Insérer l'image de signature si disponible
  if (data.signatureImage) {
    try {
      // Extraire le base64 (enlever le préfixe data:image/png;base64,)
      const base64Data = data.signatureImage.includes(",")
        ? data.signatureImage.split(",")[1]
        : data.signatureImage;
      
      // Convertir base64 en bytes
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      
      // Essayer d'embed comme PNG
      let signatureImage;
      try {
        signatureImage = await pdfDoc.embedPng(imageBytes);
      } catch {
        // Si ce n'est pas un PNG, essayer JPEG
        signatureImage = await pdfDoc.embedJpg(imageBytes);
      }
      
      const signatureWidth = 200;
      const signatureHeight = (signatureImage.height / signatureImage.width) * signatureWidth;
      
      // Vérifier qu'on a assez de place
      if (yPosition - signatureHeight < 50) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = currentPage.getHeight() - margin;
      }
      
      currentPage.drawImage(signatureImage, {
        x: margin,
        y: yPosition - signatureHeight,
        width: signatureWidth,
        height: signatureHeight,
      });
      yPosition -= signatureHeight + 20;
    } catch (error) {
      console.error("Erreur lors de l'insertion de la signature:", error);
      // Continuer sans signature si erreur
      currentPage.drawText("[Signature non disponible]", {
        x: margin,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 20;
    }
  }

  // Identifiant unique en bas de page
  const consentIdText = `ConsentID: ${data.consentId}`;
  currentPage.drawText(consentIdText, {
    x: margin,
    y: 30,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Wrap text pour qu'il tienne dans la largeur disponible
 * Approximation basée sur le nombre de caractères
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  // Approximation : environ 12 caractères par 100 points à 10pt
  const charsPerLine = Math.floor((maxWidth / 100) * 12 * (fontSize / 10));
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length > charsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

