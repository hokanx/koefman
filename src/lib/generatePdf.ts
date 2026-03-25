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
  type: 'offer' | 'invoice';
  documentTitle: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
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
  const formatted = value.toFixed(2).replace('.', ',');
  return `${formatted} €`;
};

const formatIban = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const generatePdf = async (data: PdfData): Promise<void> => {
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
      const maxW = 40;
      const maxH = 18;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'PNG', rightEdge - w, headerY, w, h);
      logoBottomY = headerY + h;
    }
  }

  // Sender line on the left (same level as logo)
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

  // Business contact details on the right (below logo)
  let contactY = dividerY + 4;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  if (data.business.phone) { doc.text(data.business.phone, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.email) { doc.text(data.business.email, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.tax_number) { doc.text(`St.-Nr.: ${data.business.tax_number}`, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }
  if (data.business.vat_id) { doc.text(`USt-IdNr.: ${data.business.vat_id}`, rightEdge, contactY, { align: 'right' }); contactY += 3.5; }

  // ============================================================
  // 2. RECEIVER BLOCK — DIN 5008 window position
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

  const numberLabel = data.type === 'offer' ? 'Angebotsnummer' : 'Rechnungsnummer';

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  // Left column: document number
  doc.text(numberLabel, margin, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(data.documentNumber, margin, y + 4.5);

  // Right column: date (and due date for invoices)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const dateX = margin + 70;
  doc.text(data.labels.date, dateX, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(data.date, dateX, y + 4.5);

  // Due date column (invoices)
  if (data.dueDate && data.labels.dueDate) {
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
  // 5. INTRO TEXT
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
  // 6. ITEMS TABLE — minimal design
  // ============================================================

  // Strong separator above the table
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
    bodyStyles: {
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
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
    didDrawPage: () => {
      // Bottom line after header row is drawn by autoTable with plain theme
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = (doc as any).lastAutoTable.finalY;

  // Line below table
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(margin, tableEndY + 1, rightEdge, tableEndY + 1);

  y = tableEndY + 10;

  // ============================================================
  // 7. TOTALS — right-aligned
  // ============================================================
  const totalsLabelX = rightEdge - 55;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.labels.subtotal, totalsLabelX, y);
  doc.text(formatCurrency(data.subtotal), rightEdge, y, { align: 'right' });
  y += 5;

  doc.text(data.labels.taxTotal, totalsLabelX, y);
  doc.text(formatCurrency(data.tax_total), rightEdge, y, { align: 'right' });
  y += 6;

  // Grand total separator
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.4);
  doc.line(totalsLabelX, y - 1.5, rightEdge, y - 1.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(data.labels.grandTotal, totalsLabelX, y + 3);
  doc.text(formatCurrency(data.grand_total), rightEdge, y + 3, { align: 'right' });
  y += 14;

  // ============================================================
  // 8. POST-TABLE CONTENT — differentiated by type
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

  // Footer text (validity for offers, payment terms intro for invoices)
  if (data.footer_text) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const footerLines = doc.splitTextToSize(data.footer_text, contentWidth);
    doc.text(footerLines, margin, y);
    y += footerLines.length * 4 + 5;
  }

  // Payment terms (invoices primarily)
  if (data.business.payment_terms) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const termLines = doc.splitTextToSize(data.business.payment_terms, contentWidth);
    doc.text(termLines, margin, y);
    y += termLines.length * 4 + 5;
  }

  // Bank details (invoices only)
  if (data.type === 'invoice' && (data.business.iban || data.business.bank_name)) {
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

  // ============================================================
  // 9. CLOSING — signature block
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
  // 10. PAGE FOOTER
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

  doc.save(`${data.documentNumber}.pdf`);
};
