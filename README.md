# KÖFMAN Simple Office

Build a mobile-first SaaS web app called “KÖFMAN”.

Core concept:

KÖFMAN is a simple, beginner-friendly, multilingual office management system for small service businesses. It should reduce paperwork, save time, and lower management costs. The first target businesses are:

1. Car repair garages

2. Cleaning companies

The app must feel extremely easy to use, with low cognitive load, clear wording, and a clean modern interface. Avoid technical jargon. Use short labels, simple actions, and clear page hierarchy.

==================================================

PRIMARY GOALS

==================================================

Build a fully functional MVP with:

1. Customer management

2. Offers / quotations

3. Invoices

4. Dashboard overview

5. Settings

6. Full mobile responsiveness

7. Full multilingual support:

   - German

   - Arabic

   - English

The product must be usable on phone, tablet, and desktop, with mobile-first behavior.

==================================================

UX / UI PRINCIPLES

==================================================

Design rules:

- Mobile-first layout

- Very simple interface

- Beginner-friendly wording

- Clear call-to-actions

- Minimal clutter

- Large tap targets on mobile

- Strong readability and contrast

- Keep forms visually short and easy

- Break longer forms into logical sections

- Use cards on mobile instead of crowded tables where possible

- Avoid overwhelming dashboards

- Use icons only when they help clarity

- Arabic must support RTL properly

- German and English use LTR

- Language switching must work across the app

- The app should remember the chosen language

Tone of text:

- Simple

- Friendly

- Professional

- Non-technical

- Suitable for business owners with limited software experience

Use black / dark premium aesthetics, but ensure excellent readability and accessible contrast.

==================================================

ROUTES / PAGES

==================================================

Create these main routes:

/login

/dashboard

/customers

/customers/new

/customers/:id

/offers

/offers/new

/offers/:id

/invoices

/invoices/new

/invoices/:id

/settings

If useful, also add:

/profile

/not-found

==================================================

AUTHENTICATION

==================================================

Use Supabase authentication.

Requirements:

- Email + password login

- Protected routes after login

- Redirect unauthenticated users to /login

- Persist session

- Clean error messages in all 3 languages

==================================================

MULTILINGUAL SYSTEM

==================================================

Implement a proper i18n structure with:

- German (default)

- English

- Arabic

Requirements:

- Central translation files

- Easy to extend later

- Full Arabic RTL support

- Language switcher in header or settings

- Persist selected language

- All labels, buttons, empty states, statuses, form fields, page titles, and messages must be translated

Avoid hardcoded text in components.

Suggested structure:

- src/i18n/de.ts

- src/i18n/en.ts

- src/i18n/ar.ts

- LanguageContext or equivalent

==================================================

MAIN MODULES

==================================================

--------------------------------------------------

1. DASHBOARD

--------------------------------------------------

Build a simple dashboard with:

- Total customers

- Total offers

- Total invoices

- Open invoices

- Paid invoices

- Overdue invoices

- Recent activity

Use simple cards and beginner-friendly wording.

On mobile:

- Stack cards vertically

- Keep spacing comfortable

- Avoid dense data tables

--------------------------------------------------

2. CUSTOMERS

--------------------------------------------------

Build a customer management module.

Customer fields:

- Full name / company name

- Contact person (optional)

- Phone

- Email

- Address

- Notes

- Customer type:

  - Private customer

  - Business customer

Features:

- Customer list

- Search customers

- Create customer

- Edit customer

- View customer details

- See related offers and invoices on customer detail page

UI notes:

- On mobile, customer list should be card-based

- Search must be easy and visible

- Empty states should guide the user clearly

--------------------------------------------------

3. OFFERS

--------------------------------------------------

Build an offer / quotation module.

Offer fields:

- Offer number

- Date

- Customer

- Status:

  - Draft

  - Sent

  - Accepted

  - Rejected

- Notes

- Internal notes (optional)

- Line items

Each line item should support:

- Title

- Description (optional)

- Quantity

- Unit

- Unit price

- Tax rate

- Total

Offer totals:

- Subtotal

- Tax

- Grand total

Features:

- Create offer

- Edit offer

- View offer

- Duplicate offer

- Convert offer to invoice

- PDF export

- Offer list with filters by status

Important UX:

- Make line item creation easy

- Add “Add item” button clearly

- Show live total calculation

- Use simple words like:

  - Add item

  - Total

  - Save draft

  - Create invoice

--------------------------------------------------

4. INVOICES

--------------------------------------------------

Build invoice module.

Invoice fields:

- Invoice number

- Date

- Due date

- Customer

- Status:

  - Open

  - Paid

  - Overdue

  - Cancelled

- Notes

- Line items

Each invoice item supports:

- Title

- Description (optional)

- Quantity

- Unit

- Unit price

- Tax rate

- Total

Invoice totals:

- Subtotal

- Tax

- Grand total

Features:

- Create invoice manually

- Create invoice from accepted offer

- Edit invoice

- View invoice

- Mark as paid

- PDF export

- Invoice list with search and status filter

Add logic:

- If due date is in the past and status is still open, display overdue

- Prevent accidental duplicate invoice creation from same offer unless user confirms

--------------------------------------------------

5. SETTINGS

--------------------------------------------------

Build a settings page with:

Business profile:

- Business name

- Address

- Email

- Phone

- Tax number / VAT ID

- Logo upload

Document settings:

- Offer number format

- Invoice number format

- Currency

- Default tax rate

- Payment terms

Language settings:

- German

- English

- Arabic

Appearance:

- Dark mode default

- Keep design clean and premium

==================================================

INDUSTRY EXTENSION LAYER

==================================================

The app must support shared core logic plus simple optional industry fields.

Create a clean structure that allows extension without breaking the shared core.

For garages, support optional fields such as:

- Vehicle plate number

- Vehicle brand

- Vehicle model

- Repair notes

For cleaning companies, support optional fields such as:

- Property size in m²

- Cleaning frequency

- Service location

- Service notes

These fields should be optional and appear only when relevant.

Possible approach:

- customer_profiles or job metadata

- or type-based conditional fields

Keep it simple and scalable.

==================================================

DATABASE / SUPABASE

==================================================

Use Supabase as backend.

Create schema for these core tables:

1. profiles

- id

- email

- created_at

2. business_settings

- id

- user_id

- business_name

- address

- email

- phone

- tax_number

- vat_id

- logo_url

- currency

- default_tax_rate

- payment_terms

- offer_number_prefix

- invoice_number_prefix

- language

- created_at

- updated_at

3. customers

- id

- user_id

- customer_type

- name

- contact_person

- phone

- email

- address

- notes

- created_at

- updated_at

4. customer_extensions

- id

- customer_id

- business_category

- vehicle_plate

- vehicle_brand

- vehicle_model

- repair_notes

- property_size

- cleaning_frequency

- service_location

- service_notes

- created_at

- updated_at

5. offers

- id

- user_id

- customer_id

- offer_number

- date

- status

- notes

- internal_notes

- subtotal

- tax_total

- grand_total

- created_at

- updated_at

6. offer_items

- id

- offer_id

- title

- description

- quantity

- unit

- unit_price

- tax_rate

- total

- sort_order

- created_at

7. invoices

- id

- user_id

- customer_id

- source_offer_id (nullable)

- invoice_number

- date

- due_date

- status

- notes

- subtotal

- tax_total

- grand_total

- created_at

- updated_at

8. invoice_items

- id

- invoice_id

- title

- description

- quantity

- unit

- unit_price

- tax_rate

- total

- sort_order

- created_at

==================================================

SECURITY / DATA RULES

==================================================

Implement proper row-level security policies so each user only sees their own data.

Requirements:

- users can only access their own customers

- users can only access their own offers

- users can only access their own invoices

- users can only access their own settings

Add safe defaults and clean policy structure.

==================================================

MOBILE-FIRST BEHAVIOR

==================================================

This is critical.

Requirements:

- Build for phone screens first

- Use bottom spacing and comfortable vertical rhythm

- Forms should be easy to complete with thumbs

- Lists should become cards on mobile

- Avoid horizontal scroll

- Header and navigation should stay simple

- Use a collapsible mobile navigation or bottom navigation if appropriate

- All actions must be accessible on small screens

- PDF-related actions can sit in an action menu if needed

- Buttons should be full-width on mobile where useful

==================================================

COMPONENTS

==================================================

Create reusable components such as:

- AppLayout

- ProtectedRoute

- LanguageSwitcher

- StatCard

- EmptyState

- SearchBar

- StatusBadge

- CustomerCard

- OfferCard

- InvoiceCard

- LineItemsEditor

- ConfirmDialog

- FormSection

- MobileActionBar

==================================================

DIN 5008 DOCUMENT STANDARD + LOGO SUPPORT

==================================================

This is a core requirement.

All generated business documents, especially:

- offers / quotations

- invoices

must be designed in a clean, professional German business layout inspired by DIN 5008 principles.

Requirements:

- structured sender and recipient placement

- clean and readable alignment

- professional spacing and hierarchy

- clearly separated document sections

- visible document title (e.g. Angebot / Rechnung)

- clear numbering

- date placement

- customer information block

- item table with totals

- tax display

- footer or final section for payment and business details

- layout should look appropriate for German business use

- output must be suitable for PDF export and real client use

Important:

- Keep the document visually professional and trustworthy

- Do not make it look overly decorative

- Prioritize readability, structure, and clean spacing

- The result should feel close to formal German business correspondence standards

==================================================

LOGO UPLOAD + DOCUMENT BRANDING

==================================================

The system must support logo upload in settings and apply the logo automatically to exported documents.

Business settings must include:

- logo upload

- logo preview

- replace logo

- remove logo

Requirements:

- uploaded logo is stored and linked to the business profile

- logo should appear automatically on exported offers and invoices

- logo placement must remain clean and professional

- logo must not break the DIN 5008 style layout

- support common file types such as PNG, JPG, and SVG if possible

- if no logo is uploaded, the document should still look polished and complete

- logo should scale properly on desktop and mobile generated PDFs

- prevent distorted logo rendering

- preserve strong spacing around the logo area

==================================================

PDF EXPORT REQUIREMENTS

==================================================

Implement high-quality PDF export for offers and invoices.

Requirements:

- exported PDF must include business details

- exported PDF must include uploaded logo when available

- exported PDF must follow a formal, professional, DIN 5008-inspired business layout

- exported PDF must include customer details, numbering, dates, line items, totals, tax, and notes when available

- exported documents must be print-friendly

- exported documents must remain readable on A4 format

- exported documents must work for real business use, not just demo presentation

Add clear fallback behavior:

- if logo is missing, render a clean text-based business header

- if some business details are missing, show safe defaults or prompt the user to complete settings

==================================================

SETTINGS PAGE ADDITION

==================================================

In the settings page, make logo and document configuration a clear section.

Include:

- Logo upload

- Business name

- Address

- Email

- Phone

- Tax number / VAT ID

- Offer number format

- Invoice number format

- Currency

- Default tax rate

- Payment terms

Add a beginner-friendly explanation such as:

"Your logo and business details will be used in your PDFs."

==================================================

FORM EXPERIENCE

==================================================

This is very important.

For all forms:

- use clear labels

- use inline validation

- use helpful placeholder examples only where useful

- avoid long intimidating blocks

- group related fields

- show success messages after save

- show friendly error messages

- auto-calculate totals

- preserve draft state where possible

- prevent accidental data loss

==================================================

DEFAULT WORDING EXAMPLES

==================================================

Use simple wording like:

- Customers

- New customer

- Save

- Cancel

- Add item

- Total

- Mark as paid

- Open invoice

- Sent

- Paid

- Overdue

- Settings

- Business details

Do not use complicated accounting jargon in the interface.

==================================================

VISUAL DIRECTION

==================================================

Design style:

- clean

- premium

- dark modern interface

- simple spacing

- rounded cards

- clear hierarchy

- easy to scan

- not flashy

- minimal but trustworthy

==================================================

TECHNICAL QUALITY

==================================================

Requirements:

- clean component structure

- scalable folder organization

- no duplicated translation logic

- no hardcoded multilingual text in page components

- proper state handling

- clear types

- robust mobile responsiveness

- good loading and empty states

==================================================

DELIVERABLE

==================================================

Generate the full app structure, pages, components, multilingual setup, Supabase integration scaffolding, protected routing, and mobile-friendly UI for this MVP.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://koefman.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c777d900-cc37-4953-a97c-1256012cd438).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
