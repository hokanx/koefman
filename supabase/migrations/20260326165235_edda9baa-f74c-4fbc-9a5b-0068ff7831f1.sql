
-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  source_offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Dienstleistungsvertrag',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract_items table
CREATE TABLE public.contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Stück',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 19,
  total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;

-- Contracts RLS
CREATE POLICY "Users can view own contracts" ON public.contracts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contracts" ON public.contracts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contracts" ON public.contracts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Contract items RLS
CREATE POLICY "Users can view own contract items" ON public.contract_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can insert own contract items" ON public.contract_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can update own contract items" ON public.contract_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can delete own contract items" ON public.contract_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid()));

-- Add source_contract_id to recurring_invoices
ALTER TABLE public.recurring_invoices ADD COLUMN source_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL;
