import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BusinessInfo {
  business_name: string;
  address?: string;
  email?: string;
  phone?: string;
  tax_number?: string;
  vat_id?: string;
  logo_url?: string;
  payment_terms?: string;
  account_holder?: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  owner_name?: string;
}

interface CustomerInfo {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface DocumentItem {
  title: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  total: number;
}

interface PdfData {
  type: 'offer' | 'invoice' | 'confirmation';
  documentTitle: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
  validityDate?: string;
  business: BusinessInfo;
  customer: CustomerInfo;
  items: DocumentItem[];
  subtotal: number;
  tax_total: number;
  grand_total: number;
  intro_text?: string;
  footer_text?: string;
  closing_text?: string;
  notes?: string;
  validity_days?: number;
  legal_note?: string;
  small_business_regulation?: boolean;
  accepted_by_name?: string;
  accepted_at?: string;
  accepted_at_time?: string;
  signature_text?: string;
  signature_image?: string;
  reference_offer_number?: string;
  reference_offer_date?: string;
  labels: {
    date: string;
    dueDate?: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    taxRate: string;
    total: string;
    subtotal: string;
    taxTotal: string;
    grandTotal: string;
    description: string;
    itemTitle: string;
    page: string;
  };
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

// Re-export from central utils for backward compatibility
export { formatDateDE } from '@/lib/utils';

const formatIban = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    // Only set crossOrigin for external URLs, not data URIs
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const generatePdf = async (data: PdfData, returnBase64 = false): Promise<string | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = pageWidth - margin;

  // ============================================================
  // 1. HEADER: Compact sender line (left) + Logo (right)
  // ============================================================
  const headerY = 12;

  // Logo on the right
  let logoBottomY = headerY;
  if (data.business.logo_url) {
    const img = await loadImage(data.business.logo_url);
    if (img) {
      const maxW = 50;
      const maxH = 22;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'PNG', rightEdge - w, headerY, w, h);
      logoBottomY = headerY + h;
    }
  }

  // Sender line on the left
  const senderParts = [
    data.business.business_name,
    data.business.address?.replace(/\n/g, ', '),
  ].filter(Boolean);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(senderParts.join(' · '), margin, headerY + 4);

  // Divider below header
  const dividerY = Math.max(headerY + 8, logoBottomY + 2);
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.3);
  doc.line(margin, dividerY, rightEdge, dividerY);

  // Business contact details on the right
  let contactY = dividerY + 4;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  if (data.business.phone) { doc.text(data.business.phone, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.email) { doc.text(data.business.email, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.tax_number) { doc.text(`St.-Nr.: ${data.business.tax_number}`, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.vat_id) { doc.text(`USt-IdNr.: ${data.business.vat_id}`, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }

  // ============================================================
  // 2. RECEIVER BLOCK
  // ============================================================
  let y = dividerY + 8;
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name, margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  if (data.customer.address) {
    data.customer.address.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        doc.text(trimmed, margin, y);
        y += 5;
      }
    });
  }

  // ============================================================
  // 3. DOCUMENT META — 2-column layout
  // ============================================================
  y = Math.max(y + 10, 62);

  const numberLabel = data.type === 'invoice' ? 'Rechnungsnummer' : data.type === 'confirmation' ? 'Bestätigungsnr.' : 'Angebotsnummer';

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(numberLabel, margin, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(data.documentNumber, margin, y + 4.5);

  // Date column
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const dateX = margin + 70;
  doc.text(data.labels.date, dateX, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(data.date, dateX, y + 4.5);

  // Due date column (invoices only)
  if (data.type === 'invoice' && data.dueDate && data.labels.dueDate) {
    const dueDateX = margin + 120;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(data.labels.dueDate, dueDateX, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(data.dueDate, dueDateX, y + 4.5);
  }

  y += 14;

  // ============================================================
  // 4. DOCUMENT TITLE
  // ============================================================
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.documentTitle, margin, y);
  y += 10;

  // ============================================================
  // 5. CONFIRMATION-SPECIFIC: Reference info + formal text
  // ============================================================
  if (data.type === 'confirmation') {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);

    const refParts = [`Bezugnehmend auf das Angebot ${data.reference_offer_number || data.documentNumber}`];
    if (data.reference_offer_date) {
      refParts.push(`vom ${data.reference_offer_date}`);
    }
    refParts.push('bestätigen wir hiermit die Annahme des Angebots durch den Kunden.');
    const refText = refParts.join(' ');
    const refLines = doc.splitTextToSize(refText, contentWidth);
    doc.text(refLines, margin, y);
    y += refLines.length * 4.5 + 4;

    if (data.accepted_by_name) {
      doc.text(`Name des Unterzeichners: ${data.accepted_by_name}`, margin, y);
      y += 5;
    }
    if (data.accepted_at) {
      const timeStr = data.accepted_at_time ? ` um ${data.accepted_at_time} Uhr` : '';
      doc.text(`Angenommen am: ${data.accepted_at}${timeStr}`, margin, y);
      y += 5;
    }
    y += 4;
  }

  // ============================================================
  // 6. INTRO TEXT (offers & invoices)
  // ============================================================
  if (data.intro_text) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const introLines = doc.splitTextToSize(data.intro_text, contentWidth);
    doc.text(introLines, margin, y);
    y += introLines.length * 4.5 + 6;
  }

  // ============================================================
  // 7. ITEMS TABLE (offers & invoices only)
  // ============================================================
  if (data.items.length > 0) {
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.5);
    doc.line(margin, y, rightEdge, y);
    y += 1;

    const tableHead = [[
      'Pos.',
      data.labels.itemTitle,
      data.labels.quantity,
      data.labels.unit,
      data.labels.unitPrice,
      data.labels.taxRate,
      data.labels.total,
    ]];

    const tableBody = data.items.map((item, i) => [
      String(i + 1),
      item.description ? `${item.title}\n${item.description}` : item.title,
      item.quantity.toFixed(2).replace('.', ','),
      item.unit,
      formatCurrency(item.unit_price),
      `${item.tax_rate} %`,
      formatCurrency(item.total),
    ]);

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0,
      },
      headStyles: {
        fillColor: false as any,
        textColor: [80, 80, 80],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { lineWidth: 0 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 18 },
        3: { cellWidth: 16 },
        4: { halign: 'right', cellWidth: 26 },
        5: { halign: 'right', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 26 },
      },
      theme: 'plain',
      tableLineColor: [60, 60, 60],
      tableLineWidth: 0,
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.5);
    doc.line(margin, tableEndY + 1, rightEdge, tableEndY + 1);
    y = tableEndY + 10;

    // ============================================================
    // 8. TOTALS — adaptive for small business regulation
    // ============================================================
    const totalsLabelX = rightEdge - 55;
    const isSmallBiz = !!data.small_business_regulation;

    if (!isSmallBiz) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(data.labels.subtotal, totalsLabelX, y);
      doc.text(formatCurrency(data.subtotal), rightEdge, y, { align: 'right' });
      y += 5;
      doc.text(data.labels.taxTotal, totalsLabelX, y);
      doc.text(formatCurrency(data.tax_total), rightEdge, y, { align: 'right' });
      y += 6;
    }

    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.4);
    doc.line(totalsLabelX, y - 1.5, rightEdge, y - 1.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(data.labels.grandTotal, totalsLabelX, y + 3);
    doc.text(formatCurrency(data.grand_total), rightEdge, y + 3, { align: 'right' });
    y += 10;

    if (isSmallBiz) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      doc.text('Gemäß §19 UStG wird keine Umsatzsteuer berechnet.', totalsLabelX, y);
      y += 8;
    } else {
      y += 4;
    }
  }

  // ============================================================
  // 9. POST-TABLE CONTENT — differentiated by type
  // ============================================================

  // Notes
  if (data.notes) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 5;
  }

  // --- OFFER-SPECIFIC: legal note + validity ---
  if (data.type === 'offer') {
    // Only show legal note if small business regulation is active
    if (data.small_business_regulation && data.legal_note) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      const legalLines = doc.splitTextToSize(data.legal_note, contentWidth);
      doc.text(legalLines, margin, y);
      y += legalLines.length * 4 + 4;
    }

    if (data.validityDate) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const validityText = `Dieses Angebot ist gültig bis: ${data.validityDate}`;
      doc.text(validityText, margin, y);
      y += 8;
    }

    // Footer text for offers (custom text after validity)
    if (data.footer_text) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const footerLines = doc.splitTextToSize(data.footer_text, contentWidth);
      doc.text(footerLines, margin, y);
      y += footerLines.length * 4 + 5;
    }
  }

  // --- INVOICE-SPECIFIC: payment terms + bank details ---
  if (data.type === 'invoice') {
    // Footer text
    if (data.footer_text) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const footerLines = doc.splitTextToSize(data.footer_text, contentWidth);
      doc.text(footerLines, margin, y);
      y += footerLines.length * 4 + 5;
    }

    // Payment terms
    if (data.business.payment_terms) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const termLines = doc.splitTextToSize(data.business.payment_terms, contentWidth);
      doc.text(termLines, margin, y);
      y += termLines.length * 4 + 5;
    }

    // Bank details
    if (data.business.iban || data.business.bank_name) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Bankverbindung', margin, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      if (data.business.account_holder) { doc.text(`Kontoinhaber: ${data.business.account_holder}`, margin, y); y += 4; }
      if (data.business.bank_name) { doc.text(`Bank: ${data.business.bank_name}`, margin, y); y += 4; }
      if (data.business.iban) { doc.text(`IBAN: ${formatIban(data.business.iban)}`, margin, y); y += 4; }
      if (data.business.bic) { doc.text(`BIC: ${data.business.bic.toUpperCase()}`, margin, y); y += 4; }
      y += 5;
    }
  }

  // ============================================================
  // 10. CONFIRMATION-SPECIFIC: signature section
  // ============================================================
  if (data.type === 'confirmation') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Unterschrift des Auftraggebers', margin, y);
    y += 6;

    // Handwritten signature image
    if (data.signature_image) {
      try {
        const sigImg = await loadImage(data.signature_image);
        if (sigImg) {
          const maxSigW = 70;
          const maxSigH = 30;
          const sigRatio = Math.min(maxSigW / sigImg.width, maxSigH / sigImg.height);
          const sigW = sigImg.width * sigRatio;
          const sigH = sigImg.height * sigRatio;
          doc.addImage(sigImg, 'PNG', margin, y, sigW, sigH);
          y += sigH + 2;
        }
      } catch {
        // signature image failed to load, skip
      }
    }

    // Signature line
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 70, y);
    y += 4;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(data.accepted_by_name || '', margin, y);
    y += 10;
  }

  // ============================================================
  // 11. CLOSING — signature block
  // ============================================================
  if (data.closing_text) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(data.closing_text, margin, y);
    y += 8;
  }

  if (data.business.business_name) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(data.business.business_name, margin, y);
    y += 5;
  }

  if (data.business.owner_name) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Inhaber: ${data.business.owner_name}`, margin, y);
    y += 5;
  }

  // ============================================================
  // 12. PAGE FOOTER
  // ============================================================
  const pageFooterY = 284;
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.2);
  doc.line(margin, pageFooterY - 4, rightEdge, pageFooterY - 4);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  const pageFooterParts = [
    data.business.business_name,
    data.business.address?.replace(/\n/g, ', '),
    data.business.tax_number ? `St.-Nr.: ${data.business.tax_number}` : '',
    data.business.vat_id ? `USt-IdNr.: ${data.business.vat_id}` : '',
  ].filter(Boolean).join(' | ');
  doc.text(pageFooterParts, pageWidth / 2, pageFooterY, { align: 'center' });

  if (returnBase64) {
    return doc.output('datauristring').split(',')[1];
  }
  doc.save(`${data.documentNumber}.pdf`);
};

export const generateConfirmationPdf = async (data: PdfData, returnBase64 = false): Promise<string | void> => {
  return generatePdf(data, returnBase64);
};

// ============================================================
// PAYMENT REMINDER PDF
// ============================================================

interface ReminderPdfData {
  business: BusinessInfo;
  customer: CustomerInfo;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  grandTotal: number;
  reminderDate: string;
  reminderLevel: number;
  labels: {
    page: string;
  };
}

export const generateReminderPdf = async (data: ReminderPdfData, returnBase64 = false): Promise<string | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = pageWidth - margin;

  // 1. HEADER
  const headerY = 12;
  let logoBottomY = headerY;
  if (data.business.logo_url) {
    const img = await loadImage(data.business.logo_url);
    if (img) {
      const maxW = 50;
      const maxH = 22;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'PNG', rightEdge - w, headerY, w, h);
      logoBottomY = headerY + h;
    }
  }

  const senderParts = [
    data.business.business_name,
    data.business.address?.replace(/\n/g, ', '),
  ].filter(Boolean);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(senderParts.join(' · '), margin, headerY + 4);

  const dividerY = Math.max(headerY + 8, logoBottomY + 2);
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.3);
  doc.line(margin, dividerY, rightEdge, dividerY);

  let contactY = dividerY + 4;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  if (data.business.phone) { doc.text(data.business.phone, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.email) { doc.text(data.business.email, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.tax_number) { doc.text(`St.-Nr.: ${data.business.tax_number}`, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }

  // 2. RECEIVER
  let y = dividerY + 8;
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name, margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  if (data.customer.address) {
    data.customer.address.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) { doc.text(trimmed, margin, y); y += 5; }
    });
  }

  // 3. META
  y = Math.max(y + 10, 62);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Rechnungsnummer', margin, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(data.invoiceNumber, margin, y + 4.5);

  const dateX = margin + 70;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Datum', dateX, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(data.reminderDate, dateX, y + 4.5);
  y += 14;

  // 4. TITLE
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Zahlungserinnerung', margin, y);
  y += 12;

  // 5. BODY TEXT
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  const bodyText = `Sehr geehrte Damen und Herren,

zu unserer Rechnung ${data.invoiceNumber} vom ${data.invoiceDate} mit einem Gesamtbetrag von ${formatCurrency(data.grandTotal)} und Fälligkeitsdatum ${data.dueDate} konnten wir bisher leider keinen Zahlungseingang feststellen.

Wir bitten Sie höflich, den offenen Betrag zeitnah auf das unten angegebene Konto zu überweisen.

Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie diese Erinnerung bitte als gegenstandslos.`;

  const bodyLines = doc.splitTextToSize(bodyText, contentWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 4.5 + 8;

  // 6. AMOUNT SUMMARY
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(margin, y, rightEdge, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Offener Betrag', margin, y);
  doc.text(formatCurrency(data.grandTotal), rightEdge, y, { align: 'right' });
  y += 4;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(margin, y, rightEdge, y);
  y += 10;

  // 7. BANK DETAILS
  if (data.business.iban || data.business.bank_name) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Bankverbindung', margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    if (data.business.account_holder) { doc.text(`Kontoinhaber: ${data.business.account_holder}`, margin, y); y += 4; }
    if (data.business.bank_name) { doc.text(`Bank: ${data.business.bank_name}`, margin, y); y += 4; }
    if (data.business.iban) { doc.text(`IBAN: ${formatIban(data.business.iban)}`, margin, y); y += 4; }
    if (data.business.bic) { doc.text(`BIC: ${data.business.bic.toUpperCase()}`, margin, y); y += 4; }
    y += 8;
  }

  // 8. CLOSING
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text('Mit freundlichen Grüßen', margin, y);
  y += 8;

  if (data.business.business_name) {
    doc.setFont('helvetica', 'bold');
    doc.text(data.business.business_name, margin, y);
    y += 5;
  }
  if (data.business.owner_name) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Inhaber: ${data.business.owner_name}`, margin, y);
  }

  // 9. PAGE FOOTER
  const pageFooterY = 284;
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.2);
  doc.line(margin, pageFooterY - 4, rightEdge, pageFooterY - 4);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  const pageFooterParts = [
    data.business.business_name,
    data.business.address?.replace(/\n/g, ', '),
    data.business.tax_number ? `St.-Nr.: ${data.business.tax_number}` : '',
  ].filter(Boolean).join(' | ');
  doc.text(pageFooterParts, pageWidth / 2, pageFooterY, { align: 'center' });

  if (returnBase64) {
    return doc.output('datauristring').split(',')[1];
  }
  doc.save(`Zahlungserinnerung_${data.invoiceNumber}.pdf`);
};

// ============================================================
// CONTRACT PDF
// ============================================================

interface ContractPdfData {
  contractNumber: string;
  title: string;
  date: string;
  startDate: string;
  endDate: string | null;
  frequency: string;
  sourceOfferNumber: string;
  business: BusinessInfo;
  customer: CustomerInfo;
  items: DocumentItem[];
  subtotal: number;
  tax_total: number;
  grand_total: number;
  small_business_regulation?: boolean;
  closing_text?: string;
  labels: {
    date: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    taxRate: string;
    total: string;
    subtotal: string;
    taxTotal: string;
    grandTotal: string;
    description: string;
    itemTitle: string;
    page: string;
    frequencyLabel: string;
    startLabel: string;
    endLabel: string;
    durationOpen: string;
    refOffer: string;
    // New structured contract labels
    sectionScope: string;
    sectionExecution: string;
    sectionCompensation: string;
    sectionDuration: string;
    sectionFinal: string;
    contractorLabel: string;
    clientLabel: string;
    introText: string;
    scopeIntro: string;
    executionText: string;
    compensationText: string;
    durationText: string;
    durationOpenText: string;
    finalText: string;
    signaturePlace: string;
    signatureDateLabel: string;
    signatureContractor: string;
    signatureClient: string;
    paymentTerms: string;
    perCycle: string;
  };
}

export const generateContractPdf = async (data: ContractPdfData, returnBase64 = false): Promise<string | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = pageWidth - margin;

  // Helper: check page break needed
  const checkPageBreak = (currentY: number, needed: number): number => {
    if (currentY + needed > 270) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };

  // ============================================================
  // 1. HEADER: Sender line (left) + Logo (right)
  // ============================================================
  const headerY = 12;
  let logoBottomY = headerY;
  if (data.business.logo_url) {
    const img = await loadImage(data.business.logo_url);
    if (img) {
      const maxW = 50;
      const maxH = 22;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'PNG', rightEdge - w, headerY, w, h);
      logoBottomY = headerY + h;
    }
  }

  const senderParts = [data.business.business_name, data.business.address?.replace(/\n/g, ', ')].filter(Boolean);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(senderParts.join(' · '), margin, headerY + 4);

  const dividerY = Math.max(headerY + 8, logoBottomY + 2);
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.3);
  doc.line(margin, dividerY, rightEdge, dividerY);

  let contactY = dividerY + 4;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  if (data.business.phone) { doc.text(data.business.phone, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.email) { doc.text(data.business.email, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.tax_number) { doc.text(`St.-Nr.: ${data.business.tax_number}`, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.vat_id) { doc.text(`USt-IdNr.: ${data.business.vat_id}`, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }

  // ============================================================
  // 2. DOCUMENT TITLE
  // ============================================================
  let y = dividerY + 14;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.title, margin, y);
  y += 4;

  // Contract number + date line
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${data.contractNumber}  ·  ${data.labels.date}: ${data.date}  ·  ${data.labels.refOffer}: ${data.sourceOfferNumber}`, margin, y + 4);
  y += 12;

  // ============================================================
  // 3. PARTIES INTRO BLOCK
  // ============================================================
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  // "Zwischen"
  const introLines = doc.splitTextToSize(data.labels.introText, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 4.5 + 3;

  // Contractor (business)
  doc.setFont('helvetica', 'bold');
  doc.text(data.business.business_name, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  if (data.business.address) {
    data.business.address.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) { doc.text(trimmed, margin, y); y += 4.5; }
    });
  }
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text(`– ${data.labels.contractorLabel} –`, margin, y);
  y += 7;

  // "und"
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  // Client (customer)
  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  if (data.customer.address) {
    data.customer.address.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) { doc.text(trimmed, margin, y); y += 4.5; }
    });
  }
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text(`– ${data.labels.clientLabel} –`, margin, y);
  y += 8;

  // Closing intro line
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  // ============================================================
  // §1 LEISTUNGSUMFANG
  // ============================================================
  y = checkPageBreak(y, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.labels.sectionScope, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const scopeLines = doc.splitTextToSize(data.labels.scopeIntro, contentWidth);
  doc.text(scopeLines, margin, y);
  y += scopeLines.length * 4.5 + 4;

  // Items table
  const isSmallBiz = data.small_business_regulation;
  const tableColumns = isSmallBiz
    ? ['Pos.', data.labels.itemTitle, data.labels.quantity, data.labels.unit, data.labels.unitPrice, data.labels.total]
    : ['Pos.', data.labels.itemTitle, data.labels.quantity, data.labels.unit, data.labels.unitPrice, data.labels.taxRate, data.labels.total];

  const tableRows = data.items.map((item, i) => {
    const row = [
      String(i + 1),
      item.description ? `${item.title}\n${item.description}` : item.title,
      item.quantity.toFixed(2).replace('.', ','),
      item.unit,
      formatCurrency(item.unit_price),
    ];
    if (!isSmallBiz) row.push(`${item.tax_rate} %`);
    row.push(formatCurrency(item.total));
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: [tableColumns],
    body: tableRows,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0,
    },
    headStyles: {
      fillColor: false as any,
      textColor: [80, 80, 80],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: isSmallBiz
      ? { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { halign: 'right', cellWidth: 18 }, 3: { cellWidth: 16 }, 4: { halign: 'right', cellWidth: 26 }, 5: { halign: 'right', cellWidth: 26 } }
      : { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { halign: 'right', cellWidth: 16 }, 3: { cellWidth: 16 }, 4: { halign: 'right', cellWidth: 25 }, 5: { halign: 'right', cellWidth: 16 }, 6: { halign: 'right', cellWidth: 25 } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ============================================================
  // §2 AUSFÜHRUNG
  // ============================================================
  y = checkPageBreak(y, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.labels.sectionExecution, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const execText = data.labels.executionText
    .replace('{frequency}', data.frequency)
    .replace('{startDate}', data.startDate);
  const execLines = doc.splitTextToSize(execText, contentWidth);
  doc.text(execLines, margin, y);
  y += execLines.length * 4.5 + 6;

  // ============================================================
  // §3 VERGÜTUNG
  // ============================================================
  y = checkPageBreak(y, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.labels.sectionCompensation, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const compText = data.labels.compensationText
    .replace('{amount}', formatCurrency(data.grand_total))
    .replace('{cycle}', data.frequency);
  const compLines = doc.splitTextToSize(compText, contentWidth);
  doc.text(compLines, margin, y);
  y += compLines.length * 4.5 + 4;

  // Totals block
  const totalsLabelX = rightEdge - 55;
  if (!isSmallBiz) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(data.labels.subtotal, totalsLabelX, y);
    doc.text(formatCurrency(data.subtotal), rightEdge, y, { align: 'right' });
    y += 5;
    doc.text(data.labels.taxTotal, totalsLabelX, y);
    doc.text(formatCurrency(data.tax_total), rightEdge, y, { align: 'right' });
    y += 6;
  }

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.4);
  doc.line(totalsLabelX, y - 1.5, rightEdge, y - 1.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(data.labels.grandTotal, totalsLabelX, y + 3);
  doc.text(formatCurrency(data.grand_total), rightEdge, y + 3, { align: 'right' });
  y += 8;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`${data.labels.perCycle}: ${data.frequency}`, totalsLabelX, y);
  y += 4;

  if (isSmallBiz) {
    doc.setFont('helvetica', 'italic');
    doc.text('Gemäß §19 UStG wird keine Umsatzsteuer berechnet.', totalsLabelX, y);
    y += 4;
  }

  // Payment terms
  if (data.labels.paymentTerms) {
    y += 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const ptLines = doc.splitTextToSize(data.labels.paymentTerms, contentWidth);
    doc.text(ptLines, margin, y);
    y += ptLines.length * 4.5;
  }
  y += 6;

  // ============================================================
  // §4 VERTRAGSLAUFZEIT
  // ============================================================
  y = checkPageBreak(y, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.labels.sectionDuration, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const durText = data.endDate
    ? data.labels.durationText.replace('{startDate}', data.startDate).replace('{endDate}', data.endDate)
    : data.labels.durationOpenText.replace('{startDate}', data.startDate);
  const durLines = doc.splitTextToSize(durText, contentWidth);
  doc.text(durLines, margin, y);
  y += durLines.length * 4.5 + 6;

  // ============================================================
  // §5 SCHLUSSBESTIMMUNGEN
  // ============================================================
  y = checkPageBreak(y, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.labels.sectionFinal, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const finalLines = doc.splitTextToSize(data.labels.finalText, contentWidth);
  doc.text(finalLines, margin, y);
  y += finalLines.length * 4.5 + 12;

  // ============================================================
  // SIGNATURE AREA
  // ============================================================
  y = checkPageBreak(y, 40);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`${data.labels.signaturePlace}, ${data.labels.signatureDateLabel}`, margin, y);
  y += 14;

  // Two-column signatures
  const colWidth = (contentWidth - 20) / 2;
  const leftCol = margin;
  const rightCol = margin + colWidth + 20;

  // Signature lines
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(leftCol, y, leftCol + colWidth, y);
  doc.line(rightCol, y, rightCol + colWidth, y);
  y += 4;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(data.labels.signatureContractor, leftCol, y);
  doc.text(data.labels.signatureClient, rightCol, y);
  y += 3;
  doc.setFontSize(7.5);
  doc.text(data.business.business_name, leftCol, y);
  doc.text(data.customer.name, rightCol, y);

  // ============================================================
  // PAGE FOOTER
  // ============================================================
  const addPageFooter = (pageDoc: jsPDF) => {
    const pageFooterY = 284;
    pageDoc.setDrawColor(190, 190, 190);
    pageDoc.setLineWidth(0.2);
    pageDoc.line(margin, pageFooterY - 4, rightEdge, pageFooterY - 4);
    pageDoc.setFontSize(6.5);
    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setTextColor(140, 140, 140);
    const footerParts = [
      data.business.business_name,
      data.business.address?.replace(/\n/g, ', '),
      data.business.tax_number ? `St.-Nr.: ${data.business.tax_number}` : '',
      data.business.vat_id ? `USt-IdNr.: ${data.business.vat_id}` : '',
    ].filter(Boolean).join(' | ');
    pageDoc.text(footerParts, pageWidth / 2, pageFooterY, { align: 'center' });
  };

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc);
  }

  if (returnBase64) {
    return doc.output('datauristring').split(',')[1];
  }
  doc.save(`${data.contractNumber}.pdf`);
};

// ============================================================
// CONTRACT CONFIRMATION PDF (Vertragsbestätigung)
// ============================================================
interface ContractConfirmationPdfData {
  contractNumber: string;
  title: string;
  date: string;
  signedByName: string;
  signedAt: string;
  signatureImage?: string | null;
  business: BusinessInfo;
  customer: CustomerInfo;
  items: DocumentItem[];
  subtotal: number;
  tax_total: number;
  grand_total: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  small_business_regulation?: boolean;
}

export const generateContractConfirmationPdf = async (data: ContractConfirmationPdfData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = pageWidth - margin;

  // Header
  let y = 12;
  if (data.business.logo_url) {
    const img = await loadImage(data.business.logo_url);
    if (img) {
      const maxW = 50; const maxH = 22;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      doc.addImage(img, 'PNG', rightEdge - img.width * ratio, y, img.width * ratio, img.height * ratio);
    }
  }

  const senderParts = [data.business.business_name, data.business.address?.replace(/\n/g, ', ')].filter(Boolean);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(senderParts.join(' · '), margin, y + 4);
  y += 12;
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.3);
  doc.line(margin, y, rightEdge, y);
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Vertragsbestätigung', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Vertrag: ${data.contractNumber}  ·  ${data.title}`, margin, y);
  y += 5;
  doc.text(`Datum: ${data.date}`, margin, y);
  y += 10;

  // Confirmation text
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const confirmText = `Hiermit wird bestätigt, dass der Vertrag ${data.contractNumber} („${data.title}") zwischen`;
  const lines = doc.splitTextToSize(confirmText, contentWidth);
  doc.text(lines, margin, y);
  y += lines.length * 5 + 4;

  // Parties
  doc.setFont('helvetica', 'bold');
  doc.text(data.business.business_name, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('(Auftragnehmer)', margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('und', margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('(Auftraggeber)', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('am folgenden Datum digital unterzeichnet wurde:', margin, y);
  y += 8;

  // Signature details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Unterzeichnet von: ${data.signedByName}`, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Datum/Uhrzeit: ${data.signedAt}`, margin, y);
  y += 10;

  // Signature image
  if (data.signatureImage) {
    try {
      const sigImg = new Image();
      sigImg.src = data.signatureImage;
      await new Promise<void>((resolve) => { sigImg.onload = () => resolve(); sigImg.onerror = () => resolve(); });
      if (sigImg.width > 0) {
        const sigW = 60;
        const sigH = (sigImg.height / sigImg.width) * sigW;
        doc.addImage(data.signatureImage, 'PNG', margin, y, sigW, Math.min(sigH, 25));
        y += Math.min(sigH, 25) + 3;
      }
    } catch { /* skip */ }
  }

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 70, y);
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Digitale Unterschrift des Auftraggebers', margin, y);
  y += 12;

  // Contract summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Vertragszusammenfassung', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(`Abrechnungszyklus: ${data.frequency}`, margin, y); y += 5;
  doc.text(`Vertragsbeginn: ${data.startDate}`, margin, y); y += 5;
  doc.text(`Vertragsende: ${data.endDate || 'Unbefristet'}`, margin, y); y += 5;
  doc.text(`Betrag pro Zyklus: ${formatCurrency(data.grand_total)}`, margin, y); y += 10;

  // Items table
  const isSmallBiz = data.small_business_regulation;
  const tableColumns = isSmallBiz
    ? ['Pos.', 'Bezeichnung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']
    : ['Pos.', 'Bezeichnung', 'Menge', 'Einheit', 'Einzelpreis', 'MwSt.', 'Gesamt'];

  const tableRows = data.items.map((item, i) => {
    const row = [String(i + 1), item.description ? `${item.title}\n${item.description}` : item.title, item.quantity.toFixed(2).replace('.', ','), item.unit, formatCurrency(item.unit_price)];
    if (!isSmallBiz) row.push(`${item.tax_rate} %`);
    row.push(formatCurrency(item.total));
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: [tableColumns],
    body: tableRows,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, textColor: [30, 30, 30] },
    headStyles: { fillColor: false as any, textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  const totalsX = rightEdge - 55;
  if (!isSmallBiz) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Zwischensumme', totalsX, y); doc.text(formatCurrency(data.subtotal), rightEdge, y, { align: 'right' }); y += 5;
    doc.text('MwSt.', totalsX, y); doc.text(formatCurrency(data.tax_total), rightEdge, y, { align: 'right' }); y += 5;
  }
  doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.4); doc.line(totalsX, y, rightEdge, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text('Gesamtbetrag', totalsX, y); doc.text(formatCurrency(data.grand_total), rightEdge, y, { align: 'right' });

  // Footer
  const pageFooterY = 284;
  doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.2); doc.line(margin, pageFooterY - 4, rightEdge, pageFooterY - 4);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 140, 140);
  const footerParts = [data.business.business_name, data.business.address?.replace(/\n/g, ', ')].filter(Boolean).join(' | ');
  doc.text(footerParts, pageWidth / 2, pageFooterY, { align: 'center' });

  doc.save(`Vertragsbestätigung_${data.contractNumber}.pdf`);
};
