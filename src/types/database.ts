export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date:  string
          appointment_time:  string
          business_id:       number | null
          cancel_token:      string
          created_at:        string | null
          customer_email:    string | null
          customer_name:     string
          customer_phone:    string
          duration_minutes:  number
          id:                number
          notes:             string | null
          price:             number | null
          reminder_sent_at:  string | null
          service_id:        number | null
          service_name:      string
          source:            string | null
          staff_id:          number | null
          staff_name:        string
          status:            string | null
        }
        Insert: {
          appointment_date:   string
          appointment_time:   string
          business_id?:       number | null
          cancel_token?:      string
          created_at?:        string | null
          customer_email?:    string | null
          customer_name:      string
          customer_phone:     string
          duration_minutes?:  number
          id?:                number
          notes?:             string | null
          price?:             number | null
          reminder_sent_at?:  string | null
          service_id?:        number | null
          service_name:       string
          source?:            string | null
          staff_id?:          number | null
          staff_name:         string
          status?:            string | null
        }
        Update: {
          appointment_date?:   string
          appointment_time?:   string
          business_id?:        number | null
          cancel_token?:       string
          created_at?:         string | null
          customer_email?:     string | null
          customer_name?:      string
          customer_phone?:     string
          duration_minutes?:   number
          id?:                 number
          notes?:              string | null
          price?:              number | null
          reminder_sent_at?:   string | null
          service_id?:         number | null
          service_name?:       string
          source?:             string | null
          staff_id?:           number | null
          staff_name?:         string
          status?:             string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_closures: {
        Row: {
          id:          number
          business_id: number
          closed_date: string   // YYYY-MM-DD
          reason:      string | null
        }
        Insert: {
          id?:         number
          business_id: number
          closed_date: string
          reason?:     string | null
        }
        Update: {
          id?:         number
          business_id?: number
          closed_date?: string
          reason?:      string | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          id:           number
          business_id:  number
          dow:          number   // 0=Sun…6=Sat
          is_open:      boolean
          opening_time: string | null
          closing_time: string | null
        }
        Insert: {
          id?:          number
          business_id:  number
          dow:          number
          is_open?:     boolean
          opening_time?: string | null
          closing_time?: string | null
        }
        Update: {
          id?:          number
          business_id?: number
          dow?:         number
          is_open?:     boolean
          opening_time?: string | null
          closing_time?: string | null
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          business_id:                    number
          closing_time:                   string
          created_at:                     string | null
          id:                             number
          opening_time:                   string
          slot_minutes:                   number
          sms_notifications_enabled:      boolean
          whatsapp_notifications_enabled: boolean
          sms_reminder_enabled:           boolean
        }
        Insert: {
          business_id:                    number
          closing_time?:                  string
          created_at?:                    string | null
          id?:                            number
          opening_time?:                  string
          slot_minutes?:                  number
          sms_notifications_enabled?:     boolean
          whatsapp_notifications_enabled?: boolean
          sms_reminder_enabled?:          boolean
        }
        Update: {
          business_id?:                   number
          closing_time?:                  string
          created_at?:                    string | null
          id?:                            number
          opening_time?:                  string
          slot_minutes?:                  number
          sms_notifications_enabled?:     boolean
          whatsapp_notifications_enabled?: boolean
          sms_reminder_enabled?:          boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_type: string
          city: string | null
          created_at: string | null
          email: string | null
          id: number
          is_active: boolean | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          owner_id: string | null
          phone: string | null
          plan: string | null
          primary_color: string | null
          settings: Json | null
          slug: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          owner_id?: string | null
          phone?: string | null
          plan?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          owner_id?: string | null
          phone?: string | null
          plan?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          business_id: number | null
          created_at: string | null
          email: string | null
          full_name: string
          id: number
          last_visit_at: string | null
          notes: string | null
          phone: string
          visit_count: number | null
        }
        Insert: {
          business_id?: number | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: number
          last_visit_at?: string | null
          notes?: string | null
          phone: string
          visit_count?: number | null
        }
        Update: {
          business_id?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: number
          last_visit_at?: string | null
          notes?: string | null
          phone?: string
          visit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          business_id: number | null
          content: string
          created_at: string | null
          id: number
          is_active: boolean | null
          title: string
          type: string
        }
        Insert: {
          business_id?: number | null
          content: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          title: string
          type: string
        }
        Update: {
          business_id?: number | null
          content?: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: number | null
          created_at: string | null
          duration_minutes: number
          id: number
          price: number
          service_name: string
          status: string | null
        }
        Insert: {
          business_id?: number | null
          created_at?: string | null
          duration_minutes: number
          id?: number
          price: number
          service_name: string
          status?: string | null
        }
        Update: {
          business_id?: number | null
          created_at?: string | null
          duration_minutes?: number
          id?: number
          price?: number
          service_name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_working_days: {
        Row: {
          id:          number
          staff_id:    number
          business_id: number
          dow:         number   // 0=Sun…6=Sat
          is_working:  boolean
        }
        Insert: {
          id?:         number
          staff_id:    number
          business_id: number
          dow:         number
          is_working?: boolean
        }
        Update: {
          id?:         number
          staff_id?:   number
          business_id?: number
          dow?:        number
          is_working?: boolean
        }
        Relationships: []
      }
      staff: {
        Row: {
          business_id: number | null
          created_at: string | null
          full_name: string
          id: number
          phone: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          business_id?: number | null
          created_at?: string | null
          full_name: string
          id?: number
          phone?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          business_id?: number | null
          created_at?: string | null
          full_name?: string
          id?: number
          phone?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id:                       number
          business_id:              number
          provider:                 string
          provider_payment_id:      string | null
          provider_conversation_id: string | null
          plan_name:                string
          amount:                   number
          currency:                 string
          status:                   string
          payload_json:             Record<string, unknown> | null
          paid_at:                  string | null
          created_at:               string
          updated_at:               string
        }
        Insert: {
          business_id:              number
          provider?:                string
          provider_payment_id?:     string | null
          provider_conversation_id?: string | null
          plan_name:                string
          amount:                   number
          currency?:                string
          status?:                  string
          payload_json?:            Record<string, unknown> | null
          paid_at?:                 string | null
          created_at?:              string
          updated_at?:              string
        }
        Update: {
          provider?:                string
          provider_payment_id?:     string | null
          provider_conversation_id?: string | null
          plan_name?:               string
          amount?:                  number
          currency?:                string
          status?:                  string
          payload_json?:            Record<string, unknown> | null
          paid_at?:                 string | null
          updated_at?:              string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_period: string | null
          business_id: number | null
          created_at: string | null
          ends_at: string | null
          id: number
          plan_name: string
          started_at: string | null
          status: string | null
          trial_ends_at: string | null
        }
        Insert: {
          billing_period?: string | null
          business_id?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: number
          plan_name: string
          started_at?: string | null
          status?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          billing_period?: string | null
          business_id?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: number
          plan_name?: string
          started_at?: string | null
          status?: string | null
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          business_id: number | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
        }
        Insert: {
          business_id?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
        }
        Update: {
          business_id?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email:      string
        }
        Insert: {
          created_at?: string
          email:       string
        }
        Update: {
          created_at?: string
          email?:      string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_businesses: {
        Args: Record<string, never>
        Returns: {
          id:            number
          name:          string
          business_type: string | null
          slug:          string
          city:          string | null
          created_at:    string | null
          owner_email:   string | null
          plan_name:     string | null
          sub_status:    string | null
          trial_ends_at: string | null
          is_active:     boolean | null
        }[]
      }
      admin_get_business: {
        Args: { p_id: number }
        Returns: {
          id:             number
          name:           string
          business_type:  string | null
          slug:           string
          city:           string | null
          phone:          string | null
          is_active:      boolean | null
          created_at:     string | null
          owner_email:    string | null
          owner_id:       string | null
          plan_name:      string | null
          sub_id:         number | null
          sub_status:     string | null
          trial_ends_at:  string | null
          billing_period: string | null
          ends_at:        string | null
        }[]
      }
      admin_update_subscription: {
        Args: {
          calling_user_id: string
          p_business_id:   number
          p_plan_name:     string
          p_status:        string
        }
        Returns: Json
      }
      book_appointment: {
        Args: {
          p_business_id:     number
          p_service_id:      number
          p_service_name:    string
          p_service_duration: number
          p_staff_id:        number
          p_staff_name:      string
          p_customer_name:   string
          p_customer_phone:  string
          p_date:            string
          p_time:            string
          p_price:           number
          p_notes:           string | null
          p_customer_email?: string | null
        }
        Returns: {
          appointment_id?: number
          customer_id?:    number
          error?:          string
        }
      }
      manage_appointment_by_token: {
        Args: {
          p_token:    string
          p_action:   string
          p_new_date?: string | null
          p_new_time?: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]

// ─── Domain aliases ──────────────────────────────────────────────────────────

export type Business         = Tables<"businesses">
export type Appointment      = Tables<"appointments">
export type Service          = Tables<"services">
export type StaffMember        = Tables<"staff">
export type BusinessHour       = Tables<"business_hours">
export type BusinessClosure    = Tables<"business_closures">
export type StaffWorkingDay    = Tables<"staff_working_days">
export type Customer         = Tables<"customers">
export type Subscription     = Tables<"subscriptions">
export type BusinessSettings = Tables<"business_settings">
export type Payment          = Tables<"payments">
