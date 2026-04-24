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
      dpo_hints: {
        Row: {
          hint_text: string
          id: string
          scenario_id: string
          session_player_id: string
          used_at: string | null
        }
        Insert: {
          hint_text: string
          id?: string
          scenario_id: string
          session_player_id: string
          used_at?: string | null
        }
        Update: {
          hint_text?: string
          id?: string
          scenario_id?: string
          session_player_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dpo_hints_session_player_id_fkey"
            columns: ["session_player_id"]
            isOneToOne: false
            referencedRelation: "session_players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          host_id: string | null
          id: string
          mode: string
          room_code: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          mode: string
          room_code?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          mode?: string
          room_code?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard: {
        Row: {
          compliance_pct: number
          display_name: string
          final_score: number
          id: string
          max_level_reached: number
          outcome: string
          player_id: string | null
          role: string
          session_id: string | null
          submitted_at: string | null
        }
        Insert: {
          compliance_pct: number
          display_name: string
          final_score: number
          id?: string
          max_level_reached: number
          outcome: string
          player_id?: string | null
          role: string
          session_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          compliance_pct?: number
          display_name?: string
          final_score?: number
          id?: string
          max_level_reached?: number
          outcome?: string
          player_id?: string | null
          role?: string
          session_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      level1_sessions: {
        Row: {
          created_at: string
          fiduciary_card_id: string | null
          fiduciary_choice: string | null
          fiduciary_is_correct: boolean | null
          id: string
          principal_card_id: string | null
          principal_choice: string | null
          principal_is_correct: boolean | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fiduciary_card_id?: string | null
          fiduciary_choice?: string | null
          fiduciary_is_correct?: boolean | null
          id?: string
          principal_card_id?: string | null
          principal_choice?: string | null
          principal_is_correct?: boolean | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fiduciary_card_id?: string | null
          fiduciary_choice?: string | null
          fiduciary_is_correct?: boolean | null
          id?: string
          principal_card_id?: string | null
          principal_choice?: string | null
          principal_is_correct?: boolean | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "level1_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      level2_sessions: {
        Row: {
          created_at: string
          fiduciary_card_id: string | null
          fiduciary_choice: string | null
          fiduciary_is_correct: boolean | null
          id: string
          principal_card_id: string | null
          principal_choice: string | null
          principal_is_correct: boolean | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fiduciary_card_id?: string | null
          fiduciary_choice?: string | null
          fiduciary_is_correct?: boolean | null
          id?: string
          principal_card_id?: string | null
          principal_choice?: string | null
          principal_is_correct?: boolean | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fiduciary_card_id?: string | null
          fiduciary_choice?: string | null
          fiduciary_is_correct?: boolean | null
          id?: string
          principal_card_id?: string | null
          principal_choice?: string | null
          principal_is_correct?: boolean | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "level2_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_answers: {
        Row: {
          answered_at: string
          choice: string
          id: string
          is_correct: boolean
          player_id: string
          round_id: string
          score_delta: number
          session_id: string
          session_player_id: string
        }
        Insert: {
          answered_at?: string
          choice: string
          id?: string
          is_correct: boolean
          player_id: string
          round_id: string
          score_delta: number
          session_id: string
          session_player_id: string
        }
        Update: {
          answered_at?: string
          choice?: string
          id?: string
          is_correct?: boolean
          player_id?: string
          round_id?: string
          score_delta?: number
          session_id?: string
          session_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "live_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_answers_session_player_id_fkey"
            columns: ["session_player_id"]
            isOneToOne: false
            referencedRelation: "session_players"
            referencedColumns: ["id"]
          },
        ]
      }
      live_rounds: {
        Row: {
          ended_at: string | null
          id: string
          pushed_at: string
          round_number: number
          scenario_id: string
          session_id: string
          status: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          pushed_at?: string
          round_number: number
          scenario_id: string
          session_id: string
          status?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          pushed_at?: string
          round_number?: number
          scenario_id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_rounds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_seed: string | null
          created_at: string | null
          display_name: string
          id: string
        }
        Insert: {
          avatar_seed?: string | null
          created_at?: string | null
          display_name: string
          id: string
        }
        Update: {
          avatar_seed?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      scenario_answers: {
        Row: {
          answered_at: string | null
          choice: string
          dpdp_concept: string
          id: string
          is_correct: boolean
          level: number
          role: string
          scenario_id: string
          score_delta: number
          session_player_id: string
        }
        Insert: {
          answered_at?: string | null
          choice: string
          dpdp_concept: string
          id?: string
          is_correct: boolean
          level: number
          role: string
          scenario_id: string
          score_delta: number
          session_player_id: string
        }
        Update: {
          answered_at?: string | null
          choice?: string
          dpdp_concept?: string
          id?: string
          is_correct?: boolean
          level?: number
          role?: string
          scenario_id?: string
          score_delta?: number
          session_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_answers_session_player_id_fkey"
            columns: ["session_player_id"]
            isOneToOne: false
            referencedRelation: "session_players"
            referencedColumns: ["id"]
          },
        ]
      }
      session_players: {
        Row: {
          completed_at: string | null
          compliance_meter: number
          current_level: number
          current_scenario_index: number
          dpo_tokens: number
          id: string
          joined_at: string | null
          player_id: string
          revenue: number
          role: string
          score: number
          session_id: string
          shift_timer: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          compliance_meter?: number
          current_level?: number
          current_scenario_index?: number
          dpo_tokens?: number
          id?: string
          joined_at?: string | null
          player_id: string
          revenue?: number
          role: string
          score?: number
          session_id: string
          shift_timer?: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          compliance_meter?: number
          current_level?: number
          current_scenario_index?: number
          dpo_tokens?: number
          id?: string
          joined_at?: string | null
          player_id?: string
          revenue?: number
          role?: string
          score?: number
          session_id?: string
          shift_timer?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
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
