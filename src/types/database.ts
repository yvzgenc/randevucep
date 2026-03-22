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
          appointment_date: string
          appointment_time: string
          business_id: number | null
          created_at: string | null
          customer_name: string
          customer_phone: string
          id: number
          notes: string | null
          price: number | null
          service_id: number | null
          service_name: string
          source: string | null
          staff_id: number | null
          staff_name: string
          status: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          business_id?: number | null
          created_at?: string | null
          customer_name: string
          customer_phone: string
          id?: number
          notes?: string | null
          price?: number | null
          service_id?: number | null
          service_name: string
          source?: string | null
          staff_id?: number | null
          staff_name: string
          status?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          business_id?: number | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          id?: number
          notes?: string | null
          price?: number | null
          service_id?: number | null
          service_name?: string
          source?: string | null
          staff_id?: number | null
          staff_name?: string
          status?: string | null
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
      business_settings: {
        Row: {
          business_id: number
          closing_time: string
          created_at: string | null
          id: number
          opening_time: string
          slot_minutes: number
        }
        Insert: {
          business_id: number
          closing_time?: string
          created_at?: string | null
          id?: number
          opening_time?: string
          slot_minutes?: number
        }
        Update: {
          business_id?: number
          closing_time?: string
          created_at?: string | null
          id?: number
          opening_time?: string
          slot_minutes?: number
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
export type StaffMember      = Tables<"staff">
export type Customer         = Tables<"customers">
export type Subscription     = Tables<"subscriptions">
export type BusinessSettings = Tables<"business_settings">
