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
  let y = 20;

  // --- LOGO (top-left, if available) ---
  if (data.business.logo_url) {
    const img = await loadImage(data.business.logo_url);
    if (img) {
      const maxW = 50;
      const maxH = 20;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'PNG', margin, y, w, h);
      y += h + 5;
    }
  }

  // --- BUSINESS DETAILS (right column) ---
  const rightX = pageWidth - margin;
  let rightY = 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(data.business.business_name || '', rightX, rightY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  rightY += 5;
  if (data.business.address) {
    const addrLines = data.business.address.split('\n');
    addrLines.forEach((line) => {
      doc.text(line.trim(), rightX, rightY, { align: 'right' });
      rightY += 4;
    });
  }
  if (data.business.phone) { doc.text(data.business.phone, rightX, rightY, { align: 'right' }); rightY += 4; }
  if (data.business.email) { doc.text(data.business.email, rightX, rightY, { align: 'right' }); rightY += 4; }
  if (data.business.tax_number) { doc.text(`St.-Nr.: ${data.business.tax_number}`, rightX, rightY, { align: 'right' }); rightY += 4; }
  if (data.business.vat_id) { doc.text(`USt-IdNr.: ${data.business.vat_id}`, rightX, rightY, { align: 'right' }); rightY += 4; }

  // --- SENDER LINE (compact, single line above receiver) --- DIN 5008 ~27mm
  y = 27;
  const senderParts = [
    data.business.business_name,
    data.business.address?.replace(/\n/g, ' · '),
    data.business.phone,
    data.business.email,
  ].filter(Boolean);
  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text(senderParts.join(' · '), margin, y);

  // --- SENDER/RECEIVER SEPARATOR ---
  y += 1.5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + 85, y);

  // --- RECEIVER ADDRESS BLOCK --- DIN 5008 ~33.5mm
  y += 4;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name, margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  if (data.customer.address) {
    data.customer.address.split('\n').forEach((line) => {
      doc.text(line.trim(), margin, y);
      y += 5;
    });
  }

  // --- DOCUMENT TITLE --- below receiver block with clear spacing
  y = Math.max(y + 12, 72);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.documentTitle, margin, y);
  y += 10;

  // --- DOCUMENT META ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`${data.documentTitle}: ${data.documentNumber}`, margin, y);
  y += 5;
  doc.text(`${data.labels.date}: ${data.date}`, margin, y);
  y += 5;
  if (data.dueDate && data.labels.dueDate) {
    doc.text(`${data.labels.dueDate}: ${data.dueDate}`, margin, y);
    y += 5;
  }
  y += 5;

  // --- INTRO TEXT ---
  if (data.intro_text) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const introLines = doc.splitTextToSize(data.intro_text, contentWidth);
    doc.text(introLines, margin, y);
    y += introLines.length * 5 + 5;
  }

  // --- ITEMS TABLE ---
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
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 30, 30],
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 12 },
      2: { halign: 'right', cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 28 },
    },
    theme: 'grid',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // --- TOTALS ---
  const totalsX = pageWidth - margin;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(data.labels.subtotal, totalsX - 50, y);
  doc.text(formatCurrency(data.subtotal), totalsX, y, { align: 'right' });
  y += 6;
  doc.text(data.labels.taxTotal, totalsX - 50, y);
  doc.text(formatCurrency(data.tax_total), totalsX, y, { align: 'right' });
  y += 7;
  doc.setDrawColor(160, 160, 160);
  doc.line(totalsX - 55, y - 2, totalsX, y - 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(data.labels.grandTotal, totalsX - 50, y + 2);
  doc.text(formatCurrency(data.grand_total), totalsX, y + 2, { align: 'right' });
  y += 16;

  // --- NOTES ---
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 6;
  }

  // --- PAYMENT TERMS ---
  if (data.business.payment_terms) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const termLines = doc.splitTextToSize(data.business.payment_terms, contentWidth);
    doc.text(termLines, margin, y);
    y += termLines.length * 4 + 6;
  }

  // --- BANK DETAILS (invoices only) ---
  if (data.type === 'invoice' && (data.business.iban || data.business.bank_name)) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const bankLines: string[] = [];
    if (data.business.account_holder) bankLines.push(`Kontoinhaber: ${data.business.account_holder}`);
    if (data.business.bank_name) bankLines.push(`Bank: ${data.business.bank_name}`);
    if (data.business.iban) bankLines.push(`IBAN: ${formatIban(data.business.iban)}`);
    if (data.business.bic) bankLines.push(`BIC: ${data.business.bic.toUpperCase()}`);
    bankLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 4.5;
    });
    y += 4;
  }

  // --- FOOTER TEXT ---
  if (data.footer_text) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const footerLines = doc.splitTextToSize(data.footer_text, contentWidth);
    doc.text(footerLines, margin, y);
    y += footerLines.length * 4 + 5;
  }

  // --- CLOSING TEXT ---
  if (data.closing_text) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(data.closing_text, margin, y);
    y += 8;
  }

  // --- PAGE FOOTER ---
  const footerY = 282;
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
  const footerText = [
    data.business.business_name,
    data.business.address?.replace(/\n/g, ', '),
    data.business.tax_number ? `St.-Nr.: ${data.business.tax_number}` : '',
    data.business.vat_id ? `USt-IdNr.: ${data.business.vat_id}` : '',
  ].filter(Boolean).join(' | ');
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  doc.save(`${data.documentNumber}.pdf`);
};
