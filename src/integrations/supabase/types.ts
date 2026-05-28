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
      activity_log: {
        Row: {
          action: string
          bookkeeper: string | null
          client_name: string | null
          created_at: string
          cycle_month: string | null
          id: string
          message: string | null
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
          success?: boolean
          triggered_by?: string | null
        }
        Relationships: []
      }
      client_status_history: {
        Row: {
          client_name: string
          ghl_contact_id: string
          id: string
          recorded_at: string
          source: string
          status: string
        }
        Insert: {
          client_name: string
          ghl_contact_id: string
          id?: string
          recorded_at?: string
          source?: string
          status: string
        }
        Update: {
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
