// German tax-compliant document category system
export interface DocumentSubcategory {
  value: string;
  label: string;
}

export interface DocumentCategoryGroup {
  group: string;
  label: string;
  color: string;
  subcategories: DocumentSubcategory[];
}

export const DOCUMENT_GROUPS: DocumentCategoryGroup[] = [
  {
    group: 'einnahmen',
    label: 'Einnahmen',
    color: 'bg-success/15 text-success',
    subcategories: [
      { value: 'ausgangsrechnungen', label: 'Ausgangsrechnungen' },
      { value: 'gutschriften', label: 'Gutschriften / Korrekturen' },
      { value: 'zahlungseingaenge', label: 'Zahlungseingänge' },
    ],
  },
  {
    group: 'ausgaben',
    label: 'Ausgaben',
    color: 'bg-destructive/15 text-destructive',
    subcategories: [
      { value: 'eingangsrechnungen', label: 'Eingangsrechnungen' },
      { value: 'bewirtung', label: 'Bewirtung' },
      { value: 'fahrtkosten', label: 'Fahrtkosten' },
      { value: 'reisekosten', label: 'Reisekosten' },
      { value: 'miete', label: 'Miete / Nebenkosten' },
      { value: 'versicherungen', label: 'Versicherungen' },
    ],
  },
  {
    group: 'bank',
    label: 'Bank & Kasse',
    color: 'bg-primary/15 text-primary',
    subcategories: [
      { value: 'kontoauszuege', label: 'Kontoauszüge' },
      { value: 'kreditkarte', label: 'Kreditkartenabrechnungen' },
      { value: 'paypal_stripe', label: 'PayPal / Stripe' },
      { value: 'kassenbuch', label: 'Kassenbuch' },
    ],
  },
  {
    group: 'vertraege',
    label: 'Verträge & Dauerunterlagen',
    color: 'bg-info/15 text-info',
    subcategories: [
      { value: 'mietvertraege', label: 'Mietverträge' },
      { value: 'darlehensvertraege', label: 'Darlehensverträge' },
      { value: 'arbeitsvertraege', label: 'Arbeitsverträge' },
      { value: 'kooperationsvertraege', label: 'Kooperationsverträge' },
    ],
  },
  {
    group: 'sonstiges',
    label: 'Sonstiges',
    color: 'bg-muted text-muted-foreground',
    subcategories: [
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
  },
];

// Flat list of all subcategory values
export const ALL_SUBCATEGORIES = DOCUMENT_GROUPS.flatMap(g =>
  g.subcategories.map(s => ({ ...s, group: g.group, groupLabel: g.label, color: g.color }))
);

// Get info for a category value (supports both old simple and new subcategory values)
export const getCategoryInfo = (value: string) => {
  // Try new subcategory system first
  const sub = ALL_SUBCATEGORIES.find(s => s.value === value);
  if (sub) return { label: sub.label, color: sub.color, group: sub.group, groupLabel: sub.groupLabel };

  // Fallback for old categories
  const legacyMap: Record<string, { group: string; groupLabel: string }> = {
    einnahmen: { group: 'einnahmen', groupLabel: 'Einnahmen' },
    ausgaben: { group: 'ausgaben', groupLabel: 'Ausgaben' },
    vertraege: { group: 'vertraege', groupLabel: 'Verträge' },
    sonstiges: { group: 'sonstiges', groupLabel: 'Sonstiges' },
  };
  const legacy = legacyMap[value];
  if (legacy) {
    const grp = DOCUMENT_GROUPS.find(g => g.group === legacy.group);
    return { label: legacy.groupLabel, color: grp?.color || 'bg-muted text-muted-foreground', group: legacy.group, groupLabel: legacy.groupLabel };
  }

  return { label: value, color: 'bg-muted text-muted-foreground', group: 'sonstiges', groupLabel: 'Sonstiges' };
};

export const STATUS_OPTIONS = [
  { value: 'neu', label: 'Neu', color: 'bg-info/15 text-info' },
  { value: 'geprueft', label: 'Geprüft', color: 'bg-warning/15 text-warning' },
  { value: 'verarbeitet', label: 'Verarbeitet', color: 'bg-success/15 text-success' },
];

export const getStatusInfo = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
