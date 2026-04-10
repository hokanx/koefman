import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================
// TYPES
// ============================================================

interface BusinessInfo {
  business_name: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
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
  service_type_label?: string;
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
  signatureData?: {
    signedByName: string;
    signedAt: string;
    signatureImage: string | null;
  };
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

// ============================================================
// SHARED HELPERS
// ============================================================

const PAGE_WIDTH = 210;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;

const formatCurrency = (value: number): string => {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

export { formatDateDE } from '@/lib/utils';

const formatIban = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// ── Header: logo left, company right, sender line + recipient ──
interface HeaderOptions {
  business: BusinessInfo;
  customer: CustomerInfo;
}

const renderHeader = async (doc: jsPDF, opts: HeaderOptions): Promise<number> => {
  const { business, customer } = opts;
  const headerY = 14;

  // ── Logo on the LEFT ──
  let logoBottomY = headerY;
  let hasLogo = false;
  if (business.logo_url) {
    const img = await loadImage(business.logo_url);
    if (img) {
      const maxW = 55;
      const maxH = 26;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'PNG', MARGIN, headerY, w, h);
      logoBottomY = headerY + h;
      hasLogo = true;
    }
  }

  if (!hasLogo) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(business.business_name || 'Unternehmen', MARGIN, headerY + 6);
    logoBottomY = headerY + 8;
  }

  // ── Company block on the RIGHT ──
  let rightY = headerY + 1;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  if (hasLogo && business.business_name) {
    doc.text(business.business_name, RIGHT_EDGE, rightY, { align: 'right' });
    rightY += 3.8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  if (business.address) {
    const addrLine = business.address.replace(/\n/g, ', ');
    doc.text(addrLine, RIGHT_EDGE, rightY, { align: 'right' });
    rightY += 3.5;
  }
  if (business.phone) { doc.text(business.phone, RIGHT_EDGE, rightY, { align: 'right' }); rightY += 3.5; }
  if (business.email) { doc.text(business.email, RIGHT_EDGE, rightY, { align: 'right' }); rightY += 3.5; }
  if (business.website) { doc.text(business.website, RIGHT_EDGE, rightY, { align: 'right' }); rightY += 3.5; }

  const taxDetails = [
    business.tax_number ? `St.-Nr.: ${business.tax_number}` : '',
    business.vat_id ? `USt-IdNr.: ${business.vat_id}` : '',
  ].filter(Boolean);
  if (taxDetails.length > 0) {
    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.text(taxDetails.join(' · '), RIGHT_EDGE, rightY, { align: 'right' });
    rightY += 3.5;
  }

  // ── Sender line + Recipient ──
  let y = Math.max(logoBottomY, rightY) + 6;

  // Sender micro-line
  const senderParts = [business.business_name, business.address?.replace(/\n/g, ', ')].filter(Boolean);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text(senderParts.join(' · '), MARGIN, y);
  y += 1.5;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, MARGIN + 80, y);
  y += 4;

  // Recipient
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(customer.name, MARGIN, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  if (customer.address) {
    customer.address.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) { doc.text(trimmed, MARGIN, y); y += 4.2; }
    });
  }

  return y + 4;
};

// ── Meta row: evenly spaced fields band ──
interface MetaField {
  label: string;
  value: string;
  highlight?: boolean;
}

const renderMetaRow = (doc: jsPDF, y: number, fields: MetaField[]): number => {
  if (fields.length === 0) return y;

  // Top rule
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, RIGHT_EDGE, y);
  y += 4;

  const colWidth = CONTENT_WIDTH / fields.length;
  fields.forEach((field, i) => {
    const x = MARGIN + i * colWidth;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(field.label.toUpperCase(), x, y);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(field.highlight ? 180 : 20, field.highlight ? 40 : 20, field.highlight ? 40 : 20);
    doc.text(field.value || '–', x, y + 4.5);
  });
  y += 8;

  // Bottom rule
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, RIGHT_EDGE, y);

  return y + 6;
};

// ── Document title ──
const renderTitle = (doc: jsPDF, y: number, title: string, serviceTypeLabel?: string): number => {
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(title, MARGIN, y);
  y += 5;

  if (serviceTypeLabel) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Leistungsart: ${serviceTypeLabel}`, MARGIN, y);
    y += 5;
  }

  return y + 2;
};

// ── Items table ──
interface ItemsTableOptions {
  items: DocumentItem[];
  labels: { itemTitle: string; quantity: string; unit: string; unitPrice: string; taxRate: string; total: string };
  hidesTaxColumn?: boolean;
}

const renderItemsTable = (doc: jsPDF, y: number, opts: ItemsTableOptions): number => {
  if (opts.items.length === 0) return y;

  // Section label
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 140, 140);
  doc.text('POSITIONEN', MARGIN, y);
  y += 3;

  const tableHead = opts.hidesTaxColumn
    ? [['Pos.', opts.labels.itemTitle, opts.labels.quantity, opts.labels.unitPrice, opts.labels.total]]
    : [['Pos.', opts.labels.itemTitle, opts.labels.quantity, opts.labels.unitPrice, opts.labels.taxRate, opts.labels.total]];

  const tableBody = opts.items.map((item, i) => {
    const qtyCell = opts.hidesTaxColumn
      ? `${item.quantity.toFixed(2).replace('.', ',')} ${item.unit}`
      : `${item.quantity.toFixed(2).replace('.', ',')} ${item.unit}`;
    const row = [
      String(i + 1),
      item.description ? `${item.title}\n${item.description}` : item.title,
      qtyCell,
      formatCurrency(item.unit_price),
    ];
    if (!opts.hidesTaxColumn) row.push(`${item.tax_rate} %`);
    row.push(formatCurrency(item.total));
    return row;
  });

  const pageContentWidth = RIGHT_EDGE - MARGIN;
  const colStyles = opts.hidesTaxColumn
    ? {
        0: { cellWidth: 10, halign: 'center' as const },
        1: { cellWidth: pageContentWidth * 0.45, halign: 'left' as const },
        2: { halign: 'right' as const, cellWidth: pageContentWidth * 0.16 },
        3: { halign: 'right' as const, cellWidth: pageContentWidth * 0.16 },
        4: { halign: 'right' as const, cellWidth: pageContentWidth * 0.17, fontStyle: 'bold' as const },
      }
    : {
        0: { cellWidth: 10, halign: 'center' as const },
        1: { cellWidth: pageContentWidth * 0.37, halign: 'left' as const },
        2: { halign: 'right' as const, cellWidth: pageContentWidth * 0.14 },
        3: { halign: 'right' as const, cellWidth: pageContentWidth * 0.16 },
        4: { halign: 'right' as const, cellWidth: pageContentWidth * 0.09 },
        5: { halign: 'right' as const, cellWidth: pageContentWidth * 0.18, fontStyle: 'bold' as const },
      };

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, right: 2, bottom: 3.5, left: 2 },
      textColor: [30, 30, 30],
      lineColor: [230, 230, 230],
      lineWidth: 0,
    },
    headStyles: {
      fillColor: false as any,
      textColor: [100, 100, 100],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: { lineWidth: 0 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: colStyles,
  });

  const tableEndY = (doc as any).lastAutoTable.finalY;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, tableEndY + 1, RIGHT_EDGE, tableEndY + 1);

  return tableEndY + 8;
};

// ── Totals block ──
interface TotalsOptions {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  isSmallBusiness: boolean;
  labels: { subtotal: string; taxTotal: string; grandTotal: string };
  cycleLabel?: string;
}

const renderTotalsBlock = (doc: jsPDF, y: number, opts: TotalsOptions): number => {
  const labelX = RIGHT_EDGE - 55;

  if (!opts.isSmallBusiness) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(opts.labels.subtotal, labelX, y);
    doc.text(formatCurrency(opts.subtotal), RIGHT_EDGE, y, { align: 'right' });
    y += 4.5;
    doc.text(opts.labels.taxTotal, labelX, y);
    doc.text(formatCurrency(opts.taxTotal), RIGHT_EDGE, y, { align: 'right' });
    y += 5;
  }

  // Separator
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  doc.line(labelX, y, RIGHT_EDGE, y);
  y += 5;

  // Grand total
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(11);
  doc.text(opts.labels.grandTotal, labelX, y);
  doc.text(formatCurrency(opts.grandTotal), RIGHT_EDGE, y, { align: 'right' });
  y += 6;

  // Cycle label
  if (opts.cycleLabel) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(opts.cycleLabel, labelX, y);
    y += 4;
  }

  // §19 note
  if (opts.isSmallBusiness) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Gemäß §19 UStG wird keine Umsatzsteuer berechnet.', labelX, y);
    y += 5;
  }

  return y + 4;
};

// ── Bank details ──
const renderBankDetails = (doc: jsPDF, y: number, business: BusinessInfo, referenceNumber?: string): number => {
  if (!business.iban && !business.bank_name) return y;

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, RIGHT_EDGE, y);
  y += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 140, 140);
  doc.text('BANKVERBINDUNG', MARGIN, y);
  y += 4.5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  if (business.account_holder) { doc.text(business.account_holder, MARGIN, y); y += 4; }
  if (business.bank_name) { doc.text(business.bank_name, MARGIN, y); y += 4; }
  if (business.iban) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`IBAN: ${formatIban(business.iban)}`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    y += 4;
  }
  if (business.bic) { doc.text(`BIC: ${business.bic.toUpperCase()}`, MARGIN, y); y += 4; }
  if (referenceNumber) {
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(7.5);
    doc.text(`Verwendungszweck: ${referenceNumber}`, MARGIN, y);
    y += 4;
  }

  return y + 4;
};

// ── Page footer ──
const renderPageFooter = (doc: jsPDF, business: BusinessInfo): void => {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = 284;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, footerY - 4, RIGHT_EDGE, footerY - 4);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    const line1Parts = [
      business.business_name,
      business.owner_name ? `Inh. ${business.owner_name}` : '',
      business.address?.replace(/\n/g, ', '),
    ].filter(Boolean).join(' | ');
    const line2Parts = [
      business.phone,
      business.email,
      business.website,
      business.tax_number ? `St.-Nr.: ${business.tax_number}` : '',
      business.vat_id ? `USt-IdNr.: ${business.vat_id}` : '',
    ].filter(Boolean).join(' | ');
    doc.text(line1Parts, PAGE_WIDTH / 2, footerY - 0.5, { align: 'center' });
    if (line2Parts) {
      doc.text(line2Parts, PAGE_WIDTH / 2, footerY + 2.5, { align: 'center' });
    }
  }
};

// ── Text block helper ──
const renderTextBlock = (doc: jsPDF, y: number, text: string, opts?: { fontSize?: number; color?: number[] }): number => {
  const fontSize = opts?.fontSize ?? 9;
  const color = opts?.color ?? [50, 50, 50];
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * (fontSize * 0.45) + 4;
};

// ── Page break check ──
const checkPageBreak = (doc: jsPDF, currentY: number, needed: number): number => {
  if (currentY + needed > 270) {
    doc.addPage();
    return 20;
  }
  return currentY;
};

// ============================================================
// MAIN PDF GENERATOR (offer, invoice, confirmation)
// ============================================================

export const generatePdf = async (data: PdfData, returnBase64 = false): Promise<string | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // 1. HEADER
  let y = await renderHeader(doc, { business: data.business, customer: data.customer });

  // 2. TITLE
  y = renderTitle(doc, y, data.documentTitle, data.service_type_label);

  // 3. META ROW
  const numberLabel = data.type === 'invoice' ? 'Rechnungsnummer' : data.type === 'confirmation' ? 'Bestätigungsnr.' : 'Angebotsnummer';
  const metaFields: MetaField[] = [
    { label: numberLabel, value: data.documentNumber },
    { label: data.labels.date, value: data.date },
  ];
  if (data.type === 'invoice' && data.dueDate && data.labels.dueDate) {
    metaFields.push({ label: data.labels.dueDate, value: data.dueDate });
  }
  if (data.type === 'offer' && data.validityDate) {
    metaFields.push({ label: 'Gültig bis', value: data.validityDate });
  }
  y = renderMetaRow(doc, y, metaFields);

  // 4. CONFIRMATION-SPECIFIC: Reference info
  if (data.type === 'confirmation') {
    const refParts = [`Bezugnehmend auf das Angebot ${data.reference_offer_number || data.documentNumber}`];
    if (data.reference_offer_date) refParts.push(`vom ${data.reference_offer_date}`);
    refParts.push('bestätigen wir hiermit die Annahme des Angebots durch den Kunden.');
    y = renderTextBlock(doc, y, refParts.join(' '), { fontSize: 9.5, color: [30, 30, 30] });

    if (data.accepted_by_name) {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(`Name des Unterzeichners: ${data.accepted_by_name}`, MARGIN, y);
      y += 5;
    }
    if (data.accepted_at) {
      const timeStr = data.accepted_at_time ? ` um ${data.accepted_at_time} Uhr` : '';
      doc.text(`Angenommen am: ${data.accepted_at}${timeStr}`, MARGIN, y);
      y += 5;
    }
    y += 4;
  }

  // 5. INTRO TEXT
  if (data.intro_text) {
    y = renderTextBlock(doc, y, data.intro_text, { fontSize: 9.5, color: [30, 30, 30] });
  }

  // 6. ITEMS TABLE
  if (data.items.length > 0) {
    y = renderItemsTable(doc, y, {
      items: data.items,
      labels: data.labels,
      hidesTaxColumn: !!data.small_business_regulation,
    });

    // 7. TOTALS
    y = renderTotalsBlock(doc, y, {
      subtotal: data.subtotal,
      taxTotal: data.tax_total,
      grandTotal: data.grand_total,
      isSmallBusiness: !!data.small_business_regulation,
      labels: data.labels,
    });
  }

  // 8. POST-TABLE CONTENT
  if (data.notes) {
    y = renderTextBlock(doc, y, data.notes, { fontSize: 8.5, color: [100, 100, 100] });
  }

  // Offer-specific: validity
  if (data.type === 'offer' && data.validityDate) {
    y = renderTextBlock(doc, y, `Dieses Angebot ist gültig bis: ${data.validityDate}`, { fontSize: 8.5, color: [80, 80, 80] });
  }

  // Footer text
  if (data.footer_text) {
    y = renderTextBlock(doc, y, data.footer_text, { fontSize: 8.5, color: [80, 80, 80] });
  }

  // Invoice-specific: payment terms + bank
  if (data.type === 'invoice') {
    if (data.business.payment_terms) {
      y = renderTextBlock(doc, y, data.business.payment_terms, { fontSize: 8.5, color: [80, 80, 80] });
    }
    y = renderBankDetails(doc, y, data.business, data.documentNumber);
  }

  // Confirmation-specific: signature
  if (data.type === 'confirmation') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Unterschrift des Auftraggebers', MARGIN, y);
    y += 6;

    if (data.signature_image) {
      try {
        const sigImg = await loadImage(data.signature_image);
        if (sigImg) {
          const maxSigW = 70;
          const maxSigH = 30;
          const sigRatio = Math.min(maxSigW / sigImg.width, maxSigH / sigImg.height);
          const sigW = sigImg.width * sigRatio;
          const sigH = sigImg.height * sigRatio;
          doc.addImage(sigImg, 'PNG', MARGIN, y, sigW, sigH);
          y += sigH + 2;
        }
      } catch {
        // skip
      }
    }

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, MARGIN + 70, y);
    y += 4;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(data.accepted_by_name || '', MARGIN, y);
    y += 10;
  }

  // 9. CLOSING
  if (data.closing_text) {
    y = renderTextBlock(doc, y, data.closing_text, { fontSize: 9.5, color: [30, 30, 30] });
  }

  if (data.business.business_name) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(data.business.business_name, MARGIN, y);
    y += 5;
  }

  if (data.business.owner_name) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Inhaber: ${data.business.owner_name}`, MARGIN, y);
  }

  // 10. PAGE FOOTER
  renderPageFooter(doc, data.business);

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

export const generateReminderPdf = async (data: ReminderPdfData, returnBase64 = false): Promise<string | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // 1. HEADER
  let y = await renderHeader(doc, { business: data.business, customer: data.customer });

  // 2. TITLE
  y = renderTitle(doc, y, 'Zahlungserinnerung');

  // 3. META ROW
  y = renderMetaRow(doc, y, [
    { label: 'Rechnungsnummer', value: data.invoiceNumber },
    { label: 'Datum', value: data.reminderDate },
    { label: 'Fällig am', value: data.dueDate, highlight: true },
  ]);

  // 4. BODY TEXT
  const bodyText = `Sehr geehrte Damen und Herren,

zu unserer Rechnung ${data.invoiceNumber} vom ${data.invoiceDate} mit einem Gesamtbetrag von ${formatCurrency(data.grandTotal)} und Fälligkeitsdatum ${data.dueDate} konnten wir bisher leider keinen Zahlungseingang feststellen.

Wir bitten Sie höflich, den offenen Betrag zeitnah auf das unten angegebene Konto zu überweisen.

Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie diese Erinnerung bitte als gegenstandslos.`;

  y = renderTextBlock(doc, y, bodyText, { fontSize: 9.5, color: [30, 30, 30] });

  // 5. AMOUNT SUMMARY
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, RIGHT_EDGE, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text('Offener Betrag', MARGIN, y);
  doc.text(formatCurrency(data.grandTotal), RIGHT_EDGE, y, { align: 'right' });
  y += 4;
  doc.setDrawColor(60, 60, 60);
  doc.line(MARGIN, y, RIGHT_EDGE, y);
  y += 8;

  // 6. BANK DETAILS
  y = renderBankDetails(doc, y, data.business, data.invoiceNumber);

  // 7. CLOSING
  y = renderTextBlock(doc, y, 'Mit freundlichen Grüßen', { fontSize: 9.5, color: [30, 30, 30] });

  if (data.business.business_name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    doc.text(data.business.business_name, MARGIN, y);
    y += 5;
  }
  if (data.business.owner_name) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Inhaber: ${data.business.owner_name}`, MARGIN, y);
  }

  // 8. PAGE FOOTER
  renderPageFooter(doc, data.business);

  if (returnBase64) {
    return doc.output('datauristring').split(',')[1];
  }
  doc.save(`Zahlungserinnerung_${data.invoiceNumber}.pdf`);
};

// ============================================================
// CONTRACT PDF
// ============================================================

export const generateContractPdf = async (data: ContractPdfData, returnBase64 = false): Promise<string | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // 1. HEADER
  let y = await renderHeader(doc, { business: data.business, customer: { name: '', address: '' } });

  // 2. TITLE + META
  y = renderTitle(doc, y, data.title, `Wiederkehrend (${data.labels.frequencyLabel})`);
  y = renderMetaRow(doc, y, [
    { label: 'Vertragsnummer', value: data.contractNumber },
    { label: data.labels.date, value: data.date },
    { label: data.labels.refOffer, value: data.sourceOfferNumber },
  ]);

  // 3. PARTIES INTRO
  y = renderTextBlock(doc, y, data.labels.introText, { fontSize: 9.5, color: [30, 30, 30] });

  // Contractor
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(data.business.business_name, MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  if (data.business.address) {
    data.business.address.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) { doc.text(trimmed, MARGIN, y); y += 4.5; }
    });
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`– ${data.labels.contractorLabel} –`, MARGIN, y);
  y += 7;

  // Client
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(data.customer.name, MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  if (data.customer.address) {
    data.customer.address.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) { doc.text(trimmed, MARGIN, y); y += 4.5; }
    });
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`– ${data.labels.clientLabel} –`, MARGIN, y);
  y += 8;

  // §1 SCOPE
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(data.labels.sectionScope, MARGIN, y);
  y += 6;
  y = renderTextBlock(doc, y, data.labels.scopeIntro, { fontSize: 9, color: [30, 30, 30] });

  // Items table
  const isSmallBiz = !!data.small_business_regulation;
  y = renderItemsTable(doc, y, {
    items: data.items,
    labels: data.labels,
    hidesTaxColumn: isSmallBiz,
  });

  // §2 EXECUTION
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(data.labels.sectionExecution, MARGIN, y);
  y += 6;
  const execText = data.labels.executionText.replace('{frequency}', data.frequency).replace('{startDate}', data.startDate);
  y = renderTextBlock(doc, y, execText, { fontSize: 9, color: [30, 30, 30] });

  // §3 COMPENSATION
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(data.labels.sectionCompensation, MARGIN, y);
  y += 6;
  const compText = data.labels.compensationText.replace('{amount}', formatCurrency(data.grand_total)).replace('{cycle}', data.frequency);
  y = renderTextBlock(doc, y, compText, { fontSize: 9, color: [30, 30, 30] });

  // Totals
  y = renderTotalsBlock(doc, y, {
    subtotal: data.subtotal,
    taxTotal: data.tax_total,
    grandTotal: data.grand_total,
    isSmallBusiness: isSmallBiz,
    labels: data.labels,
    cycleLabel: `${data.labels.perCycle}: ${data.frequency}`,
  });

  // Payment terms
  if (data.labels.paymentTerms) {
    y = renderTextBlock(doc, y, data.labels.paymentTerms, { fontSize: 9, color: [30, 30, 30] });
  }

  // §4 DURATION
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(data.labels.sectionDuration, MARGIN, y);
  y += 6;
  const durText = data.endDate
    ? data.labels.durationText.replace('{startDate}', data.startDate).replace('{endDate}', data.endDate)
    : data.labels.durationOpenText.replace('{startDate}', data.startDate);
  y = renderTextBlock(doc, y, durText, { fontSize: 9, color: [30, 30, 30] });

  // §5 FINAL
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(data.labels.sectionFinal, MARGIN, y);
  y += 6;
  y = renderTextBlock(doc, y, data.labels.finalText, { fontSize: 9, color: [30, 30, 30] });
  y += 6;

  // SIGNATURE AREA
  if (data.signatureData) {
    y = checkPageBreak(doc, y, 60);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 120, 60);
    doc.text('✓ Digital unterzeichnet', MARGIN, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`Unterzeichnet von: ${data.signatureData.signedByName}`, MARGIN, y);
    y += 5;
    doc.text(`Digital unterzeichnet am: ${data.signatureData.signedAt}`, MARGIN, y);
    y += 8;

    const colWidth = (CONTENT_WIDTH - 20) / 2;
    const leftCol = MARGIN;
    const rightCol = MARGIN + colWidth + 20;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(data.labels.signatureContractor, leftCol, y);
    y += 4;
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(data.business.business_name, leftCol, y);
    if (data.business.owner_name) {
      doc.setFontSize(7.5);
      doc.text(data.business.owner_name, leftCol, y + 4);
    }

    const sigStartY = y - 4;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(data.labels.signatureClient, rightCol, sigStartY);

    if (data.signatureData.signatureImage) {
      try {
        const sigImg = await loadImage(data.signatureData.signatureImage);
        if (sigImg) {
          const maxW = colWidth;
          const maxH = 20;
          const ratio = Math.min(maxW / sigImg.width, maxH / sigImg.height);
          const w = sigImg.width * ratio;
          const h = sigImg.height * ratio;
          doc.addImage(sigImg, 'PNG', rightCol, sigStartY + 2, w, h);
          y = Math.max(y, sigStartY + 2 + h + 2);
        }
      } catch { /* fallback */ }
    }

    y += 2;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(rightCol, y, rightCol + colWidth, y);
    y += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(data.signatureData.signedByName, rightCol, y);
  } else {
    y = checkPageBreak(doc, y, 40);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`${data.labels.signaturePlace}, ${data.labels.signatureDateLabel}`, MARGIN, y);
    y += 14;

    const colWidth = (CONTENT_WIDTH - 20) / 2;
    const leftCol = MARGIN;
    const rightCol = MARGIN + colWidth + 20;

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
  }

  // PAGE FOOTER
  renderPageFooter(doc, data.business);

  if (returnBase64) {
    return doc.output('datauristring').split(',')[1];
  }
  doc.save(`${data.contractNumber}.pdf`);
};

// ============================================================
// CONTRACT CONFIRMATION PDF
// ============================================================

export const generateContractConfirmationPdf = async (data: ContractConfirmationPdfData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // 1. HEADER (no recipient in confirmation — parties shown in body)
  let y = await renderHeader(doc, { business: data.business, customer: { name: '', address: '' } });

  // 2. TITLE
  y = renderTitle(doc, y, 'Vertragsbestätigung');

  // 3. META
  y = renderMetaRow(doc, y, [
    { label: 'Vertragsnummer', value: data.contractNumber },
    { label: 'Datum', value: data.date },
  ]);

  // 4. CONFIRMATION TEXT
  const confirmText = `Hiermit wird bestätigt, dass der Vertrag ${data.contractNumber} („${data.title}") zwischen`;
  y = renderTextBlock(doc, y, confirmText, { fontSize: 10, color: [30, 30, 30] });

  // Parties
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(data.business.business_name, MARGIN, y);
  y += 4.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('(Auftragnehmer)', MARGIN, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('und', MARGIN, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(data.customer.name, MARGIN, y);
  y += 4.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('(Auftraggeber)', MARGIN, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('am folgenden Datum digital unterzeichnet wurde:', MARGIN, y);
  y += 8;

  // Signature details
  doc.setFont('helvetica', 'bold');
  doc.text(`Unterzeichnet von: ${data.signedByName}`, MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Datum/Uhrzeit: ${data.signedAt}`, MARGIN, y);
  y += 10;

  // Signature image
  if (data.signatureImage) {
    try {
      const sigImg = await loadImage(data.signatureImage);
      if (sigImg && sigImg.width > 0) {
        const sigW = 60;
        const sigH = Math.min((sigImg.height / sigImg.width) * sigW, 25);
        doc.addImage(sigImg, 'PNG', MARGIN, y, sigW, sigH);
        y += sigH + 3;
      }
    } catch { /* skip */ }
  }

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 70, y);
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Digitale Unterschrift des Auftraggebers', MARGIN, y);
  y += 12;

  // Contract summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text('Vertragszusammenfassung', MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(`Abrechnungszyklus: ${data.frequency}`, MARGIN, y); y += 5;
  doc.text(`Vertragsbeginn: ${data.startDate}`, MARGIN, y); y += 5;
  doc.text(`Vertragsende: ${data.endDate || 'Unbefristet'}`, MARGIN, y); y += 5;
  doc.text(`Betrag pro Zyklus: ${formatCurrency(data.grand_total)}`, MARGIN, y); y += 10;

  // Items table
  const isSmallBiz = !!data.small_business_regulation;
  y = renderItemsTable(doc, y, {
    items: data.items,
    labels: { itemTitle: 'Bezeichnung', quantity: 'Menge', unit: 'Einheit', unitPrice: 'Einzelpreis', taxRate: 'MwSt.', total: 'Gesamt' },
    hidesTaxColumn: isSmallBiz,
  });

  // Totals
  y = renderTotalsBlock(doc, y, {
    subtotal: data.subtotal,
    taxTotal: data.tax_total,
    grandTotal: data.grand_total,
    isSmallBusiness: isSmallBiz,
    labels: { subtotal: 'Zwischensumme', taxTotal: 'MwSt.', grandTotal: 'Gesamtbetrag' },
  });

  // PAGE FOOTER
  renderPageFooter(doc, data.business);

  doc.save(`Vertragsbestätigung_${data.contractNumber}.pdf`);
};
