
-- Intake submissions (references customers)
DELETE FROM public.intake_submissions WHERE owner_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Customer extensions
DELETE FROM public.customer_extensions WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');

-- Invoice items & reminders
DELETE FROM public.invoice_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');
DELETE FROM public.invoice_reminders WHERE invoice_id IN (SELECT id FROM public.invoices WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');

-- Offer items & acceptances
DELETE FROM public.offer_items WHERE offer_id IN (SELECT id FROM public.offers WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');
DELETE FROM public.offer_acceptances WHERE offer_id IN (SELECT id FROM public.offers WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');

-- Contract items & acceptances
DELETE FROM public.contract_items WHERE contract_id IN (SELECT id FROM public.contracts WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');
DELETE FROM public.contract_acceptances WHERE contract_id IN (SELECT id FROM public.contracts WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');

-- Recurring invoices (references invoices + contracts + customers)
DELETE FROM public.recurring_invoices WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Invoices (references customers + offers)
DELETE FROM public.invoices WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Offers (references customers)
DELETE FROM public.offers WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Contracts (references customers + offers)
DELETE FROM public.contracts WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Customers
DELETE FROM public.customers WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Service template items & templates
DELETE FROM public.service_template_items WHERE template_id IN (SELECT id FROM public.service_templates WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa');
DELETE FROM public.service_templates WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Documents & document emails
DELETE FROM public.document_emails WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';
DELETE FROM public.documents WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Period completeness
DELETE FROM public.period_completeness WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Funnel events linked to submission
DELETE FROM public.funnel_events WHERE submission_id = 'c09d4591-1d4a-4e20-bbe3-b957712453bf';

-- Lead analyses
DELETE FROM public.lead_analyses WHERE submission_id = 'c09d4591-1d4a-4e20-bbe3-b957712453bf';

-- Diagnostic submissions
DELETE FROM public.diagnostic_submissions WHERE email = 'hokanhazem@icloud.com';

-- Strategy requests
DELETE FROM public.strategy_requests WHERE email = 'hokanhazem@icloud.com';

-- Business settings
DELETE FROM public.business_settings WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Notifications
DELETE FROM public.notifications WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- User roles
DELETE FROM public.user_roles WHERE user_id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Profile
DELETE FROM public.profiles WHERE id = '09376aa2-01c7-46fc-9b98-88188b5676aa';

-- Auth user
DELETE FROM auth.users WHERE id = '09376aa2-01c7-46fc-9b98-88188b5676aa';
