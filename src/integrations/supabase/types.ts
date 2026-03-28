export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          account_holder: string | null
          address: string | null
          bank_name: string | null
          bic: string | null
          business_category: string
          business_name: string
          city: string | null
          country: string | null
          created_at: string
          currency: string
          default_closing_text: string | null
          default_invoice_footer_text: string | null
          default_invoice_intro_text: string | null
          default_offer_footer_text: string | null
          default_offer_intro_text: string | null
          default_offer_title: string | null
          default_tax_rate: number
          email: string | null
          house_number: string | null
          iban: string | null
          id: string
          intake_token: string | null
          invoice_number_prefix: string
          language: string
          logo_url: string | null
          offer_number_prefix: string
          owner_name: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          small_business_regulation: boolean
          street: string | null
          tax_number: string | null
          updated_at: string
          user_id: string
          vat_id: string | null
        }
        Insert: {
          account_holder?: string | null
          address?: string | null
          bank_name?: string | null
          bic?: string | null
          business_category?: string
          business_name?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          default_closing_text?: string | null
          default_invoice_footer_text?: string | null
          default_invoice_intro_text?: string | null
          default_offer_footer_text?: string | null
          default_offer_intro_text?: string | null
          default_offer_title?: string | null
          default_tax_rate?: number
          email?: string | null
          house_number?: string | null
          iban?: string | null
          id?: string
          intake_token?: string | null
          invoice_number_prefix?: string
          language?: string
          logo_url?: string | null
          offer_number_prefix?: string
          owner_name?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          small_business_regulation?: boolean
          street?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id: string
          vat_id?: string | null
        }
        Update: {
          account_holder?: string | null
          address?: string | null
          bank_name?: string | null
          bic?: string | null
          business_category?: string
          business_name?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          default_closing_text?: string | null
          default_invoice_footer_text?: string | null
          default_invoice_intro_text?: string | null
          default_offer_footer_text?: string | null
          default_offer_intro_text?: string | null
          default_offer_title?: string | null
          default_tax_rate?: number
          email?: string | null
          house_number?: string | null
          iban?: string | null
          id?: string
          intake_token?: string | null
          invoice_number_prefix?: string
          language?: string
          logo_url?: string | null
          offer_number_prefix?: string
          owner_name?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          small_business_regulation?: boolean
          street?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          vat_id?: string | null
        }
        Relationships: []
      }
      contract_acceptances: {
        Row: {
          accepted_at: string
          accepted_by_name: string
          contract_id: string
          created_at: string
          id: string
          ip_address: string | null
          signature_image: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_by_name: string
          contract_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_image?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_by_name?: string
          contract_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_acceptances_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          contract_id: string
          created_at: string
          description: string | null
          id: string
          quantity: number
          sort_order: number
          tax_rate: number
          title: string
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          title: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          title?: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_number: string
          created_at: string
          customer_id: string
          end_date: string | null
          frequency: string
          grand_total: number
          id: string
          notes: string | null
          public_token: string | null
          source_offer_id: string
          start_date: string
          status: string
          subtotal: number
          tax_total: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_number: string
          created_at?: string
          customer_id: string
          end_date?: string | null
          frequency?: string
          grand_total?: number
          id?: string
          notes?: string | null
          public_token?: string | null
          source_offer_id: string
          start_date?: string
          status?: string
          subtotal?: number
          tax_total?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_number?: string
          created_at?: string
          customer_id?: string
          end_date?: string | null
          frequency?: string
          grand_total?: number
          id?: string
          notes?: string | null
          public_token?: string | null
          source_offer_id?: string
          start_date?: string
          status?: string
          subtotal?: number
          tax_total?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_source_offer_id_fkey"
            columns: ["source_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_extensions: {
        Row: {
          business_category: string
          cleaning_frequency: string | null
          created_at: string
          customer_id: string
          id: string
          property_size: string | null
          repair_notes: string | null
          service_location: string | null
          service_notes: string | null
          updated_at: string
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          business_category?: string
          cleaning_frequency?: string | null
          created_at?: string
          customer_id: string
          id?: string
          property_size?: string | null
          repair_notes?: string | null
          service_location?: string | null
          service_notes?: string | null
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          business_category?: string
          cleaning_frequency?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          property_size?: string | null
          repair_notes?: string | null
          service_location?: string | null
          service_notes?: string | null
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_extensions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          customer_type: string
          email: string | null
          house_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          house_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          house_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_emails: {
        Row: {
          document_id: string
          document_type: string
          id: string
          recipient_email: string
          sent_at: string
          subject: string
          user_id: string
        }
        Insert: {
          document_id: string
          document_type: string
          id?: string
          recipient_email: string
          sent_at?: string
          subject: string
          user_id: string
        }
        Update: {
          document_id?: string
          document_type?: string
          id?: string
          recipient_email?: string
          sent_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          description: string | null
          extracted_data: Json | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category?: string
          created_at?: string
          description?: string | null
          extracted_data?: Json | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          description?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      global_service_template_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          quantity: number
          sort_order: number
          tax_rate: number
          template_id: string
          title: string
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          template_id: string
          title: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          template_id?: string
          title?: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_service_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "global_service_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      global_service_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      intake_submissions: {
        Row: {
          business_category: string | null
          city: string | null
          cleaning_frequency: string | null
          company_or_name: string
          contact_person: string | null
          converted_customer_id: string | null
          country: string | null
          created_at: string
          email: string | null
          house_number: string | null
          id: string
          notes: string | null
          owner_id: string
          phone: string | null
          postal_code: string | null
          property_size: string | null
          repair_notes: string | null
          service_location: string | null
          service_notes: string | null
          service_type: string | null
          status: string
          street: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          business_category?: string | null
          city?: string | null
          cleaning_frequency?: string | null
          company_or_name?: string
          contact_person?: string | null
          converted_customer_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          postal_code?: string | null
          property_size?: string | null
          repair_notes?: string | null
          service_location?: string | null
          service_notes?: string | null
          service_type?: string | null
          status?: string
          street?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          business_category?: string | null
          city?: string | null
          cleaning_frequency?: string | null
          company_or_name?: string
          contact_person?: string | null
          converted_customer_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          property_size?: string | null
          repair_notes?: string | null
          service_location?: string | null
          service_notes?: string | null
          service_type?: string | null
          status?: string
          street?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_submissions_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          tax_rate: number
          title: string
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          title: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          title?: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminders: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          reminder_level: number
          reminder_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          reminder_level?: number
          reminder_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          reminder_level?: number
          reminder_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          closing_text: string | null
          created_at: string
          customer_id: string
          date: string
          due_date: string
          footer_text: string | null
          grand_total: number
          id: string
          intro_text: string | null
          invoice_number: string
          notes: string | null
          source_offer_id: string | null
          source_recurring_id: string | null
          status: string
          subtotal: number
          tax_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          closing_text?: string | null
          created_at?: string
          customer_id: string
          date?: string
          due_date?: string
          footer_text?: string | null
          grand_total?: number
          id?: string
          intro_text?: string | null
          invoice_number: string
          notes?: string | null
          source_offer_id?: string | null
          source_recurring_id?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          closing_text?: string | null
          created_at?: string
          customer_id?: string
          date?: string
          due_date?: string
          footer_text?: string | null
          grand_total?: number
          id?: string
          intro_text?: string | null
          invoice_number?: string
          notes?: string | null
          source_offer_id?: string | null
          source_recurring_id?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_offer_id_fkey"
            columns: ["source_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_recurring_id_fkey"
            columns: ["source_recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_leads: {
        Row: {
          admin_notes: string | null
          company: string
          contact_method: string
          converted_customer_id: string | null
          created_at: string
          email: string
          id: string
          industry: string
          name: string
          needs: string[]
          phone: string | null
          situation: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          company?: string
          contact_method?: string
          converted_customer_id?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string
          name?: string
          needs?: string[]
          phone?: string | null
          situation?: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          company?: string
          contact_method?: string
          converted_customer_id?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string
          name?: string
          needs?: string[]
          phone?: string | null
          situation?: string
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_acceptances: {
        Row: {
          accepted_at: string
          accepted_by_name: string
          created_at: string
          id: string
          ip_address: string | null
          offer_id: string
          signature_image: string | null
          signature_text: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_by_name: string
          created_at?: string
          id?: string
          ip_address?: string | null
          offer_id: string
          signature_image?: string | null
          signature_text?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_by_name?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          offer_id?: string
          signature_image?: string | null
          signature_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_acceptances_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          offer_id: string
          quantity: number
          sort_order: number
          tax_rate: number
          title: string
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          offer_id: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          title: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          offer_id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          title?: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          closing_text: string | null
          created_at: string
          customer_id: string
          date: string
          footer_text: string | null
          grand_total: number
          id: string
          internal_notes: string | null
          intro_text: string | null
          notes: string | null
          offer_number: string
          public_token: string | null
          rejected_at: string | null
          rejected_reason: string | null
          status: string
          subtotal: number
          tax_total: number
          updated_at: string
          user_id: string
          validity_days: number | null
        }
        Insert: {
          closing_text?: string | null
          created_at?: string
          customer_id: string
          date?: string
          footer_text?: string | null
          grand_total?: number
          id?: string
          internal_notes?: string | null
          intro_text?: string | null
          notes?: string | null
          offer_number: string
          public_token?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          updated_at?: string
          user_id: string
          validity_days?: number | null
        }
        Update: {
          closing_text?: string | null
          created_at?: string
          customer_id?: string
          date?: string
          footer_text?: string | null
          grand_total?: number
          id?: string
          internal_notes?: string | null
          intro_text?: string | null
          notes?: string | null
          offer_number?: string
          public_token?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          updated_at?: string
          user_id?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          admin_notes: string | null
          client_status: string
          client_tags: string[] | null
          created_at: string
          email: string | null
          id: string
          plan_name: string
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string
          trial_end: string | null
        }
        Insert: {
          account_status?: string
          admin_notes?: string | null
          client_status?: string
          client_tags?: string[] | null
          created_at?: string
          email?: string | null
          id: string
          plan_name?: string
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          trial_end?: string | null
        }
        Update: {
          account_status?: string
          admin_notes?: string | null
          client_status?: string
          client_tags?: string[] | null
          created_at?: string
          email?: string | null
          id?: string
          plan_name?: string
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          trial_end?: string | null
        }
        Relationships: []
      }
      recurring_invoices: {
        Row: {
          auto_generate: boolean
          created_at: string
          customer_id: string
          end_date: string | null
          frequency: string
          id: string
          next_run_date: string
          source_contract_id: string | null
          source_invoice_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generate?: boolean
          created_at?: string
          customer_id: string
          end_date?: string | null
          frequency?: string
          id?: string
          next_run_date?: string
          source_contract_id?: string | null
          source_invoice_id: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generate?: boolean
          created_at?: string
          customer_id?: string
          end_date?: string | null
          frequency?: string
          id?: string
          next_run_date?: string
          source_contract_id?: string | null
          source_invoice_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_source_contract_id_fkey"
            columns: ["source_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_source_invoice_id_fkey"
            columns: ["source_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      service_template_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          quantity: number
          sort_order: number
          tax_rate: number
          template_id: string
          title: string
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          template_id: string
          title: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          sort_order?: number
          tax_rate?: number
          template_id?: string
          title?: string
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
