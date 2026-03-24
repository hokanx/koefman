export type CustomerType = 'private' | 'business';
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type InvoiceStatus = 'open' | 'paid' | 'overdue' | 'cancelled';
export type Language = 'de' | 'en' | 'ar';
export type BusinessCategory = 'garage' | 'cleaning' | 'general';

export interface Customer {
  id: string;
  user_id: string;
  customer_type: CustomerType;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerExtension {
  id: string;
  customer_id: string;
  business_category: BusinessCategory;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  repair_notes?: string;
  property_size?: string;
  cleaning_frequency?: string;
  service_location?: string;
  service_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  total: number;
  sort_order: number;
}

export interface Offer {
  id: string;
  user_id: string;
  customer_id: string;
  offer_number: string;
  date: string;
  status: OfferStatus;
  notes?: string;
  internal_notes?: string;
  intro_text?: string;
  footer_text?: string;
  closing_text?: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface OfferItem extends LineItem {
  offer_id: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string;
  source_offer_id?: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: InvoiceStatus;
  notes?: string;
  intro_text?: string;
  footer_text?: string;
  closing_text?: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface InvoiceItem extends LineItem {
  invoice_id: string;
}

export interface BusinessSettings {
  id: string;
  user_id: string;
  business_name: string;
  address?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  tax_number?: string;
  vat_id?: string;
  logo_url?: string;
  currency: string;
  default_tax_rate: number;
  payment_terms?: string;
  offer_number_prefix: string;
  invoice_number_prefix: string;
  language: Language;
  business_category: BusinessCategory;
  default_offer_intro_text?: string;
  default_offer_footer_text?: string;
  default_invoice_intro_text?: string;
  default_invoice_footer_text?: string;
  default_closing_text?: string;
  account_holder?: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  created_at: string;
  updated_at: string;
}

export const formatAddress = (obj: { street?: string; house_number?: string; postal_code?: string; city?: string; country?: string; address?: string }): string => {
  if (obj.street || obj.postal_code || obj.city) {
    const line1 = [obj.street, obj.house_number].filter(Boolean).join(' ');
    const line2 = [obj.postal_code, obj.city].filter(Boolean).join(' ');
    return [line1, line2, obj.country].filter(Boolean).join('\n');
  }
  return obj.address || '';
};
