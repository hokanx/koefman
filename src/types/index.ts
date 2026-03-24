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
  created_at: string;
  updated_at: string;
}
