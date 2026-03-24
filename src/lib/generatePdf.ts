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

  // --- LOGO / BUSINESS HEADER ---
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

  // Sender line (small, above recipient)
  const senderParts = [data.business.business_name, data.business.address?.replace(/\n/g, ', '), data.business.phone, data.business.email].filter(Boolean);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(senderParts.join(' · '), margin, y + 30);

  // Business details block (right side)
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const rightX = pageWidth - margin;
  let rightY = 20;
  doc.setFont('helvetica', 'bold');
  doc.text(data.business.business_name || '', rightX, rightY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  rightY += 5;
  if (data.business.address) {
    const addrLines = data.business.address.split('\n');
    addrLines.forEach((line) => {
      doc.text(line, rightX, rightY, { align: 'right' });
      rightY += 4;
    });
  }
  if (data.business.phone) { doc.text(data.business.phone, rightX, rightY, { align: 'right' }); rightY += 4; }
  if (data.business.email) { doc.text(data.business.email, rightX, rightY, { align: 'right' }); rightY += 4; }
  if (data.business.tax_number) { doc.text(`St.-Nr.: ${data.business.tax_number}`, rightX, rightY, { align: 'right' }); rightY += 4; }
  if (data.business.vat_id) { doc.text(`USt-IdNr.: ${data.business.vat_id}`, rightX, rightY, { align: 'right' }); rightY += 4; }

  // --- RECIPIENT BLOCK (DIN 5008 position ~45mm from top) ---
  y = 45;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name, margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  if (data.customer.address) {
    data.customer.address.split('\n').forEach((line) => {
      doc.text(line, margin, y);
      y += 5;
    });
  }

  // --- DOCUMENT TITLE ---
  y = Math.max(y + 10, 80);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.documentTitle, margin, y);
  y += 8;

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
    item.quantity.toFixed(2),
    item.unit,
    `€${item.unit_price.toFixed(2)}`,
    `${item.tax_rate}%`,
    `€${item.total.toFixed(2)}`,
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
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 25 },
    },
    theme: 'grid',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // --- TOTALS ---
  const totalsX = pageWidth - margin;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(data.labels.subtotal, totalsX - 45, y);
  doc.text(`€${data.subtotal.toFixed(2)}`, totalsX, y, { align: 'right' });
  y += 6;
  doc.text(data.labels.taxTotal, totalsX - 45, y);
  doc.text(`€${data.tax_total.toFixed(2)}`, totalsX, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(180, 180, 180);
  doc.line(totalsX - 50, y - 2, totalsX, y - 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(data.labels.grandTotal, totalsX - 45, y + 2);
  doc.text(`€${data.grand_total.toFixed(2)}`, totalsX, y + 2, { align: 'right' });
  y += 15;

  // --- NOTES ---
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 5;
  }

  // --- PAYMENT TERMS ---
  if (data.business.payment_terms) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const termLines = doc.splitTextToSize(data.business.payment_terms, contentWidth);
    doc.text(termLines, margin, y);
    y += termLines.length * 4 + 5;
  }

  // --- BANK DETAILS (invoices only) ---
  if (data.type === 'invoice' && (data.business.iban || data.business.bank_name)) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const bankLines: string[] = [];
    if (data.business.account_holder) bankLines.push(`Kontoinhaber: ${data.business.account_holder}`);
    if (data.business.bank_name) bankLines.push(`Bank: ${data.business.bank_name}`);
    if (data.business.iban) bankLines.push(`IBAN: ${data.business.iban}`);
    if (data.business.bic) bankLines.push(`BIC: ${data.business.bic}`);
    bankLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 4;
    });
    y += 3;
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

  // --- FOOTER ---
  const footerY = 280;
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
  const footerText = [data.business.business_name, data.business.address?.replace(/\n/g, ', '), data.business.tax_number ? `St.-Nr.: ${data.business.tax_number}` : '', data.business.vat_id ? `USt-IdNr.: ${data.business.vat_id}` : ''].filter(Boolean).join(' | ');
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  doc.save(`${data.documentNumber}.pdf`);
};
