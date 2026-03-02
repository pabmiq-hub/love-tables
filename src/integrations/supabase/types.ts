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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          event_id: string
          id: string
          participant_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          event_id: string
          id?: string
          participant_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          event_id?: string
          id?: string
          participant_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          avoid_encounters_mode: string
          avoid_previous_encounters: boolean
          completed_rounds: number[] | null
          created_at: string
          current_round: number | null
          custom_age_ranges: Json | null
          custom_dating_preferences: Json | null
          custom_genders: Json | null
          custom_preferences: Json | null
          date: string
          email_template: Json | null
          emails_sent_at: string | null
          event_location: string | null
          event_time: string | null
          gender_parity: boolean | null
          id: string
          language: string
          module: string | null
          name: string
          organizer_id: string | null
          original_participants_count: number | null
          participants_count: number
          professional_config: Json | null
          registration_description: string | null
          registration_requirements_enabled: boolean | null
          registration_subtitle: string | null
          rotation_mode: string
          round_duration: number
          round_elapsed_seconds: number | null
          round_paused_at: string | null
          round_started_at: string | null
          rounds: number
          scheduled_email_at: string | null
          selection_closed_at: string | null
          selection_deadline_hours: number | null
          slot_quotas: Json | null
          status: string
          table_size: number
          tables: Json | null
          updated_at: string
        }
        Insert: {
          avoid_encounters_mode?: string
          avoid_previous_encounters?: boolean
          completed_rounds?: number[] | null
          created_at?: string
          current_round?: number | null
          custom_age_ranges?: Json | null
          custom_dating_preferences?: Json | null
          custom_genders?: Json | null
          custom_preferences?: Json | null
          date: string
          email_template?: Json | null
          emails_sent_at?: string | null
          event_location?: string | null
          event_time?: string | null
          gender_parity?: boolean | null
          id?: string
          language?: string
          module?: string | null
          name: string
          organizer_id?: string | null
          original_participants_count?: number | null
          participants_count?: number
          professional_config?: Json | null
          registration_description?: string | null
          registration_requirements_enabled?: boolean | null
          registration_subtitle?: string | null
          rotation_mode?: string
          round_duration?: number
          round_elapsed_seconds?: number | null
          round_paused_at?: string | null
          round_started_at?: string | null
          rounds?: number
          scheduled_email_at?: string | null
          selection_closed_at?: string | null
          selection_deadline_hours?: number | null
          slot_quotas?: Json | null
          status?: string
          table_size?: number
          tables?: Json | null
          updated_at?: string
        }
        Update: {
          avoid_encounters_mode?: string
          avoid_previous_encounters?: boolean
          completed_rounds?: number[] | null
          created_at?: string
          current_round?: number | null
          custom_age_ranges?: Json | null
          custom_dating_preferences?: Json | null
          custom_genders?: Json | null
          custom_preferences?: Json | null
          date?: string
          email_template?: Json | null
          emails_sent_at?: string | null
          event_location?: string | null
          event_time?: string | null
          gender_parity?: boolean | null
          id?: string
          language?: string
          module?: string | null
          name?: string
          organizer_id?: string | null
          original_participants_count?: number | null
          participants_count?: number
          professional_config?: Json | null
          registration_description?: string | null
          registration_requirements_enabled?: boolean | null
          registration_subtitle?: string | null
          rotation_mode?: string
          round_duration?: number
          round_elapsed_seconds?: number | null
          round_paused_at?: string | null
          round_started_at?: string | null
          rounds?: number
          scheduled_email_at?: string | null
          selection_closed_at?: string | null
          selection_deadline_hours?: number | null
          slot_quotas?: Json | null
          status?: string
          table_size?: number
          tables?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      global_participants: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          events_attended: number
          id: string
          organizer_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email?: string | null
          events_attended?: number
          id?: string
          organizer_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          events_attended?: number
          id?: string
          organizer_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_plans: string[] | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_plans?: string[] | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_plans?: string[] | null
        }
        Relationships: []
      }
      organizer_email_connections: {
        Row: {
          access_token: string | null
          created_at: string
          email_address: string
          id: string
          is_active: boolean
          organizer_id: string
          provider: string
          refresh_token: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email_address: string
          id?: string
          is_active?: boolean
          organizer_id: string
          provider?: string
          refresh_token: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email_address?: string
          id?: string
          is_active?: boolean
          organizer_id?: string
          provider?: string
          refresh_token?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_email_connections_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_features: {
        Row: {
          created_at: string | null
          feature_code: string
          id: string
          is_enabled: boolean | null
          organizer_id: string
        }
        Insert: {
          created_at?: string | null
          feature_code: string
          id?: string
          is_enabled?: boolean | null
          organizer_id: string
        }
        Update: {
          created_at?: string | null
          feature_code?: string
          id?: string
          is_enabled?: boolean | null
          organizer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_features_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          active_modules: string[] | null
          company_name: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          id: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          subscription_ends_at: string | null
          subscription_starts_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_modules?: string[] | null
          company_name?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_modules?: string[] | null
          company_name?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_encounters: {
        Row: {
          encountered_at: string
          event_id: string
          global_participant_1_id: string
          global_participant_2_id: string
          id: string
          organizer_id: string
          round_number: number
          table_number: number
        }
        Insert: {
          encountered_at?: string
          event_id: string
          global_participant_1_id: string
          global_participant_2_id: string
          id?: string
          organizer_id: string
          round_number: number
          table_number: number
        }
        Update: {
          encountered_at?: string
          event_id?: string
          global_participant_1_id?: string
          global_participant_2_id?: string
          id?: string
          organizer_id?: string
          round_number?: number
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "participant_encounters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_encounters_global_participant_1_id_fkey"
            columns: ["global_participant_1_id"]
            isOneToOne: false
            referencedRelation: "global_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_encounters_global_participant_2_id_fkey"
            columns: ["global_participant_2_id"]
            isOneToOne: false
            referencedRelation: "global_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_exclusions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          participant_1_id: string
          participant_2_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          participant_1_id: string
          participant_2_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          participant_1_id?: string
          participant_2_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_exclusions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_exclusions_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_exclusions_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_selections: {
        Row: {
          created_at: string
          event_id: string
          id: string
          selected_id: string
          selection_type: string | null
          selector_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          selected_id: string
          selection_type?: string | null
          selector_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          selected_id?: string
          selection_type?: string | null
          selector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_selections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_selections_selected_id_fkey"
            columns: ["selected_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_selections_selector_id_fkey"
            columns: ["selector_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          age: number | null
          age_range: string | null
          birth_date: string | null
          business_interests: string[] | null
          checked_in: boolean | null
          company_name: string | null
          company_size: string | null
          created_at: string
          dating_preference: string | null
          email: string | null
          entity_type: string | null
          event_id: string
          gender: string | null
          global_participant_id: string | null
          id: string
          is_returning_participant: boolean | null
          name: string
          needs: string[] | null
          phone: string | null
          preference: string | null
          preferred_age_range: string | null
          sector: string | null
          selection_submitted_at: string | null
          solutions: string[] | null
          verification_code: string | null
          verification_email_sent_at: string | null
        }
        Insert: {
          age?: number | null
          age_range?: string | null
          birth_date?: string | null
          business_interests?: string[] | null
          checked_in?: boolean | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          dating_preference?: string | null
          email?: string | null
          entity_type?: string | null
          event_id: string
          gender?: string | null
          global_participant_id?: string | null
          id?: string
          is_returning_participant?: boolean | null
          name: string
          needs?: string[] | null
          phone?: string | null
          preference?: string | null
          preferred_age_range?: string | null
          sector?: string | null
          selection_submitted_at?: string | null
          solutions?: string[] | null
          verification_code?: string | null
          verification_email_sent_at?: string | null
        }
        Update: {
          age?: number | null
          age_range?: string | null
          birth_date?: string | null
          business_interests?: string[] | null
          checked_in?: boolean | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          dating_preference?: string | null
          email?: string | null
          entity_type?: string | null
          event_id?: string
          gender?: string | null
          global_participant_id?: string | null
          id?: string
          is_returning_participant?: boolean | null
          name?: string
          needs?: string[] | null
          phone?: string | null
          preference?: string | null
          preferred_age_range?: string | null
          sector?: string | null
          selection_submitted_at?: string | null
          solutions?: string[] | null
          verification_code?: string | null
          verification_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_global_participant_id_fkey"
            columns: ["global_participant_id"]
            isOneToOne: false
            referencedRelation: "global_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          feature_code: string
          id: string
          is_limited: boolean | null
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          feature_code: string
          id?: string
          is_limited?: boolean | null
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          feature_code?: string
          id?: string
          is_limited?: boolean | null
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_active_events: number | null
          max_events: number | null
          max_participants_per_event: number | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          sort_order: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_active_events?: number | null
          max_events?: number | null
          max_participants_per_event?: number | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_active_events?: number | null
          max_events?: number | null
          max_participants_per_event?: number | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      check_event_limits: { Args: { _user_id: string }; Returns: boolean }
      get_organizer_id: { Args: { _user_id: string }; Returns: string }
      get_organizer_status: { Args: { _user_id: string }; Returns: string }
      has_feature: {
        Args: { _feature_code: string; _user_id: string }
        Returns: boolean
      }
      has_module: {
        Args: { _module_code: string; _user_id: string }
        Returns: boolean
      }
      increment_participants: { Args: { event_id: string }; Returns: undefined }
      is_event_organizer: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "organizer"
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
      app_role: ["admin", "user", "super_admin", "organizer"],
    },
  },
} as const
