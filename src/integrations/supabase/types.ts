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
        ]
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
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
