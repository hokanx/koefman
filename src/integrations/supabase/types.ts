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
      diagnostic_submissions: {
        Row: {
          business_type: string
          call_completed: boolean
          call_date: string | null
          call_result: string | null
          commitment: string | null
          company: string | null
          company_size: string | null
          created_at: string
          email: string
          follow_up_notes: string | null
          free_text: string | null
          id: string
          importance: string | null
          intent_score: string | null
          internal_notes: string | null
          last_contacted_at: string | null
          lead_flow: string
          lead_status: string
          main_problem: string
          name: string
          next_follow_up_at: string | null
          problems: string[] | null
          qr_session_id: string | null
          revenue_clarity: string
          urgency: string | null
          variant: string | null
        }
        Insert: {
          business_type?: string
          call_completed?: boolean
          call_date?: string | null
          call_result?: string | null
          commitment?: string | null
          company?: string | null
          company_size?: string | null
          created_at?: string
          email?: string
          follow_up_notes?: string | null
          free_text?: string | null
          id?: string
          importance?: string | null
          intent_score?: string | null
          internal_notes?: string | null
          last_contacted_at?: string | null
          lead_flow?: string
          lead_status?: string
          main_problem?: string
          name?: string
          next_follow_up_at?: string | null
          problems?: string[] | null
          qr_session_id?: string | null
          revenue_clarity?: string
          urgency?: string | null
          variant?: string | null
        }
        Update: {
          business_type?: string
          call_completed?: boolean
          call_date?: string | null
          call_result?: string | null
          commitment?: string | null
          company?: string | null
          company_size?: string | null
          created_at?: string
          email?: string
          follow_up_notes?: string | null
          free_text?: string | null
          id?: string
          importance?: string | null
          intent_score?: string | null
          internal_notes?: string | null
          last_contacted_at?: string | null
          lead_flow?: string
          lead_status?: string
          main_problem?: string
          name?: string
          next_follow_up_at?: string | null
          problems?: string[] | null
          qr_session_id?: string | null
          revenue_clarity?: string
          urgency?: string | null
          variant?: string | null
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
      document_templates: {
        Row: {
          content_html: string | null
          content_json: Json | null
          content_text: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string | null
          scope_type: string
          template_type: string
          updated_at: string
          updated_by_user_id: string | null
          version_number: number
        }
        Insert: {
          content_html?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id?: string | null
          scope_type?: string
          template_type?: string
          updated_at?: string
          updated_by_user_id?: string | null
          version_number?: number
        }
        Update: {
          content_html?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string | null
          scope_type?: string
          template_type?: string
          updated_at?: string
          updated_by_user_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      funnel_events: {
        Row: {
          created_at: string
          event: string
          id: string
          source: string | null
          submission_id: string | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          source?: string | null
          submission_id?: string | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          source?: string | null
          submission_id?: string | null
          variant?: string | null
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
      lead_analyses: {
        Row: {
          analysis_status: string
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          error_message: string | null
          full_analysis_json: Json | null
          headline: string
          id: string
          main_issue: string
          next_step: string
          practical_meaning: string
          priority_1: string
          priority_2: string
          priority_3: string
          submission_id: string
        }
        Insert: {
          analysis_status?: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          error_message?: string | null
          full_analysis_json?: Json | null
          headline?: string
          id?: string
          main_issue?: string
          next_step?: string
          practical_meaning?: string
          priority_1?: string
          priority_2?: string
          priority_3?: string
          submission_id: string
        }
        Update: {
          analysis_status?: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          error_message?: string | null
          full_analysis_json?: Json | null
          headline?: string
          id?: string
          main_issue?: string
          next_step?: string
          practical_meaning?: string
          priority_1?: string
          priority_2?: string
          priority_3?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_analyses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      org_document_acceptances: {
        Row: {
          accepted_at: string
          accepted_by_name: string | null
          created_at: string
          document_id: string
          id: string
          ip_address: string | null
          signature_image: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_by_name?: string | null
          created_at?: string
          document_id: string
          id?: string
          ip_address?: string | null
          signature_image?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_by_name?: string | null
          created_at?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          signature_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_document_acceptances_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "org_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      org_document_emails: {
        Row: {
          created_at: string
          document_id: string
          id: string
          organization_id: string
          recipient_email: string
          sent_at: string
          sent_by_user_id: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          organization_id: string
          recipient_email: string
          sent_at?: string
          sent_by_user_id?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          organization_id?: string
          recipient_email?: string
          sent_at?: string
          sent_by_user_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_document_emails_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "org_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_document_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_documents: {
        Row: {
          amount_total: number | null
          created_at: string
          created_by_user_id: string | null
          currency: string
          document_number: string | null
          document_payload_json: Json | null
          document_type: string
          id: string
          notes: string | null
          organization_id: string
          public_token: string | null
          recipient_email: string | null
          recipient_name: string | null
          rendered_content_json: Json | null
          rendered_html: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          template_id: string | null
          template_snapshot_json: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          amount_total?: number | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          document_number?: string | null
          document_payload_json?: Json | null
          document_type?: string
          id?: string
          notes?: string | null
          organization_id: string
          public_token?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          rendered_content_json?: Json | null
          rendered_html?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          template_id?: string | null
          template_snapshot_json?: Json | null
          title?: string
          updated_at?: string
        }
        Update: {
          amount_total?: number | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          document_number?: string | null
          document_payload_json?: Json | null
          document_type?: string
          id?: string
          notes?: string | null
          organization_id?: string
          public_token?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          rendered_content_json?: Json | null
          rendered_html?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          template_id?: string | null
          template_snapshot_json?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      org_expenses: {
        Row: {
          amount_gross: number
          amount_net: number | null
          amount_tax: number | null
          booking_date: string | null
          category: string
          created_at: string
          created_by_user_id: string | null
          currency: string
          description: string | null
          expense_date: string
          export_status: string
          id: string
          linked_document_id: string | null
          notes: string | null
          organization_id: string
          receipt_file_name: string | null
          receipt_file_url: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount_gross?: number
          amount_net?: number | null
          amount_tax?: number | null
          booking_date?: string | null
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          export_status?: string
          id?: string
          linked_document_id?: string | null
          notes?: string | null
          organization_id: string
          receipt_file_name?: string | null
          receipt_file_url?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Update: {
          amount_gross?: number
          amount_net?: number | null
          amount_tax?: number | null
          booking_date?: string | null
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          export_status?: string
          id?: string
          linked_document_id?: string | null
          notes?: string | null
          organization_id?: string
          receipt_file_name?: string | null
          receipt_file_url?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_expenses_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "org_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_commercials: {
        Row: {
          commercial_status: string
          contract_duration_months: number
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          discount_scope: string
          discount_type: string | null
          discount_value: number | null
          final_monthly_fee: number
          final_setup_fee: number
          id: string
          monthly_fee_default: number
          notes: string | null
          organization_id: string
          setup_fee_default: number
          updated_at: string
        }
        Insert: {
          commercial_status?: string
          contract_duration_months?: number
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          discount_scope?: string
          discount_type?: string | null
          discount_value?: number | null
          final_monthly_fee?: number
          final_setup_fee?: number
          id?: string
          monthly_fee_default?: number
          notes?: string | null
          organization_id: string
          setup_fee_default?: number
          updated_at?: string
        }
        Update: {
          commercial_status?: string
          contract_duration_months?: number
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          discount_scope?: string
          discount_type?: string | null
          discount_value?: number | null
          final_monthly_fee?: number
          final_setup_fee?: number
          id?: string
          monthly_fee_default?: number
          notes?: string | null
          organization_id?: string
          setup_fee_default?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_commercials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_email_settings: {
        Row: {
          created_at: string
          footer_text: string | null
          id: string
          logo_url: string | null
          organization_id: string
          reply_to_email: string | null
          sender_name: string | null
          sending_mode: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          reply_to_email?: string | null
          sender_name?: string | null
          sending_mode?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          reply_to_email?: string | null
          sender_name?: string | null
          sending_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_email_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by_admin_id: string | null
          id: string
          is_internal: boolean
          name: string
          notes: string | null
          owner_user_id: string | null
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          is_internal?: boolean
          name: string
          notes?: string | null
          owner_user_id?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          is_internal?: boolean
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      period_completeness: {
        Row: {
          admin_override: boolean
          admin_override_by: string | null
          created_at: string
          id: string
          no_activity: boolean
          period_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_override?: boolean
          admin_override_by?: string | null
          created_at?: string
          id?: string
          no_activity?: boolean
          period_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_override?: boolean
          admin_override_by?: string | null
          created_at?: string
          id?: string
          no_activity?: boolean
          period_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      qr_sessions: {
        Row: {
          campaign_id: string
          converted: boolean
          created_at: string
          id: string
        }
        Insert: {
          campaign_id?: string
          converted?: boolean
          created_at?: string
          id?: string
        }
        Update: {
          campaign_id?: string
          converted?: boolean
          created_at?: string
          id?: string
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
      strategy_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          main_problem: string | null
          name: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          main_problem?: string | null
          name?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          main_problem?: string | null
          name?: string
          source?: string | null
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
