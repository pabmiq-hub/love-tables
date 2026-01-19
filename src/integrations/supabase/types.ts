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
          gender_parity: boolean | null
          id: string
          name: string
          organizer_id: string | null
          original_participants_count: number | null
          participants_count: number
          rotation_mode: string
          round_duration: number
          round_elapsed_seconds: number | null
          round_paused_at: string | null
          round_started_at: string | null
          rounds: number
          scheduled_email_at: string | null
          status: string
          table_size: number
          tables: Json | null
          updated_at: string
        }
        Insert: {
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
          gender_parity?: boolean | null
          id?: string
          name: string
          organizer_id?: string | null
          original_participants_count?: number | null
          participants_count?: number
          rotation_mode?: string
          round_duration?: number
          round_elapsed_seconds?: number | null
          round_paused_at?: string | null
          round_started_at?: string | null
          rounds?: number
          scheduled_email_at?: string | null
          status?: string
          table_size?: number
          tables?: Json | null
          updated_at?: string
        }
        Update: {
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
          gender_parity?: boolean | null
          id?: string
          name?: string
          organizer_id?: string | null
          original_participants_count?: number | null
          participants_count?: number
          rotation_mode?: string
          round_duration?: number
          round_elapsed_seconds?: number | null
          round_paused_at?: string | null
          round_started_at?: string | null
          rounds?: number
          scheduled_email_at?: string | null
          status?: string
          table_size?: number
          tables?: Json | null
          updated_at?: string
        }
        Relationships: []
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
          checked_in: boolean | null
          created_at: string
          dating_preference: string | null
          email: string | null
          event_id: string
          gender: string | null
          id: string
          name: string
          phone: string | null
          preference: string | null
          preferred_age_range: string | null
          selection_submitted_at: string | null
        }
        Insert: {
          age?: number | null
          age_range?: string | null
          checked_in?: boolean | null
          created_at?: string
          dating_preference?: string | null
          email?: string | null
          event_id: string
          gender?: string | null
          id?: string
          name: string
          phone?: string | null
          preference?: string | null
          preferred_age_range?: string | null
          selection_submitted_at?: string | null
        }
        Update: {
          age?: number | null
          age_range?: string | null
          checked_in?: boolean | null
          created_at?: string
          dating_preference?: string | null
          email?: string | null
          event_id?: string
          gender?: string | null
          id?: string
          name?: string
          phone?: string | null
          preference?: string | null
          preferred_age_range?: string | null
          selection_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      increment_participants: { Args: { event_id: string }; Returns: undefined }
      is_event_organizer: {
        Args: { _event_id: string; _user_id: string }
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
