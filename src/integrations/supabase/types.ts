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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_reminder: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          message: string
          scheduled_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          message: string
          scheduled_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          message?: string
          scheduled_at?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          bookkeeper: string | null
          client_name: string | null
          created_at: string
          cycle_month: string | null
          id: string
          message: string | null
          page: string | null
          success: boolean
          triggered_by: string | null
        }
        Insert: {
          action: string
          bookkeeper?: string | null
          client_name?: string | null
          created_at?: string
          cycle_month?: string | null
          id?: string
          message?: string | null
          page?: string | null
          success?: boolean
          triggered_by?: string | null
        }
        Update: {
          action?: string
          bookkeeper?: string | null
          client_name?: string | null
          created_at?: string
          cycle_month?: string | null
          id?: string
          message?: string | null
          page?: string | null
          success?: boolean
          triggered_by?: string | null
        }
        Relationships: []
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          reaction: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          archived: boolean | null
          created_at: string | null
          created_by: string
          id: string
          message: string
          scheduled_at: string | null
          title: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          created_by: string
          id?: string
          message: string
          scheduled_at?: string | null
          title: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string
          id?: string
          message?: string
          scheduled_at?: string | null
          title?: string
        }
        Relationships: []
      }
      bookkeeper_performance: {
        Row: {
          avg_completion_pct: number
          bookkeeper: string
          compliant: number
          created_at: string
          date: string
          id: string
          non_compliant: number
          on_hold: number
          outstanding_statements: number
          pending_mer: number
          total_clients: number
          uncategorized_total: number
        }
        Insert: {
          avg_completion_pct?: number
          bookkeeper: string
          compliant?: number
          created_at?: string
          date: string
          id?: string
          non_compliant?: number
          on_hold?: number
          outstanding_statements?: number
          pending_mer?: number
          total_clients?: number
          uncategorized_total?: number
        }
        Update: {
          avg_completion_pct?: number
          bookkeeper?: string
          compliant?: number
          created_at?: string
          date?: string
          id?: string
          non_compliant?: number
          on_hold?: number
          outstanding_statements?: number
          pending_mer?: number
          total_clients?: number
          uncategorized_total?: number
        }
        Relationships: []
      }
      client_comments: {
        Row: {
          comment: string
          created_at: string
          deleted_at: string | null
          ghl_contact_id: string
          id: string
          is_deleted: boolean
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          comment: string
          created_at?: string
          deleted_at?: string | null
          ghl_contact_id: string
          id?: string
          is_deleted?: boolean
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          comment?: string
          created_at?: string
          deleted_at?: string | null
          ghl_contact_id?: string
          id?: string
          is_deleted?: boolean
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      client_status_history: {
        Row: {
          changed_by: string | null
          client_name: string
          ghl_contact_id: string
          id: string
          recorded_at: string
          source: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          client_name: string
          ghl_contact_id: string
          id?: string
          recorded_at?: string
          source?: string
          status: string
        }
        Update: {
          changed_by?: string | null
          client_name?: string
          ghl_contact_id?: string
          id?: string
          recorded_at?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      mer_history: {
        Row: {
          action: string | null
          bank_transactions: string | null
          bookkeeper: string | null
          books_closed_in_qb: boolean | null
          client_name: string
          client_type: string | null
          created_at: string
          financials_sent_to_client: boolean | null
          id: string
          last_reconciled_date: string | null
          mer_key: string | null
          month: string | null
          notes: string | null
          prev_month_notes_approved: boolean | null
          source: string | null
          statement_request_status: string | null
          status: string | null
          submitted_by: string | null
          timestamp: string | null
          transactions_without_payees: number | null
          unapplied_payments: number | null
          uncategorized_transactions: number | null
          undeposited_funds: number | null
        }
        Insert: {
          action?: string | null
          bank_transactions?: string | null
          bookkeeper?: string | null
          books_closed_in_qb?: boolean | null
          client_name: string
          client_type?: string | null
          created_at?: string
          financials_sent_to_client?: boolean | null
          id?: string
          last_reconciled_date?: string | null
          mer_key?: string | null
          month?: string | null
          notes?: string | null
          prev_month_notes_approved?: boolean | null
          source?: string | null
          statement_request_status?: string | null
          status?: string | null
          submitted_by?: string | null
          timestamp?: string | null
          transactions_without_payees?: number | null
          unapplied_payments?: number | null
          uncategorized_transactions?: number | null
          undeposited_funds?: number | null
        }
        Update: {
          action?: string | null
          bank_transactions?: string | null
          bookkeeper?: string | null
          books_closed_in_qb?: boolean | null
          client_name?: string
          client_type?: string | null
          created_at?: string
          financials_sent_to_client?: boolean | null
          id?: string
          last_reconciled_date?: string | null
          mer_key?: string | null
          month?: string | null
          notes?: string | null
          prev_month_notes_approved?: boolean | null
          source?: string | null
          statement_request_status?: string | null
          status?: string | null
          submitted_by?: string | null
          timestamp?: string | null
          transactions_without_payees?: number | null
          unapplied_payments?: number | null
          uncategorized_transactions?: number | null
          undeposited_funds?: number | null
        }
        Relationships: []
      }
      reminder_dismissals: {
        Row: {
          dismissed_at: string | null
          reminder_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          reminder_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          reminder_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_dismissals_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "active_reminder"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          message: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          message: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          message?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
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
      app_role: "admin" | "bookkeeper" | "developer"
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
      app_role: ["admin", "bookkeeper", "developer"],
    },
  },
} as const
