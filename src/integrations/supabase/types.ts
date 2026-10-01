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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      smm_brands: {
        Row: {
          colors: Json
          created_at: string
          id: string
          logo_url: string | null
          name: string
          tone: string
          user_id: string
        }
        Insert: {
          colors?: Json
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          tone?: string
          user_id: string
        }
        Update: {
          colors?: Json
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          tone?: string
          user_id?: string
        }
        Relationships: []
      }
      smm_post_assets: {
        Row: {
          created_at: string
          height: number | null
          id: string
          image_url: string
          post_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          image_url: string
          post_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          image_url?: string
          post_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smm_post_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "smm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_posts: {
        Row: {
          brand_id: string
          caption: string
          created_at: string
          hashtags: string[]
          id: string
          platforms: string[]
          status: string
          template_id: string | null
          topic: string
        }
        Insert: {
          brand_id: string
          caption?: string
          created_at?: string
          hashtags?: string[]
          id?: string
          platforms?: string[]
          status?: string
          template_id?: string | null
          topic?: string
        }
        Update: {
          brand_id?: string
          caption?: string
          created_at?: string
          hashtags?: string[]
          id?: string
          platforms?: string[]
          status?: string
          template_id?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "smm_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smm_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "smm_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_publish_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          platform: string
          response: Json | null
          schedule_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          platform: string
          response?: Json | null
          schedule_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          platform?: string
          response?: Json | null
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_publish_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "smm_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_schedules: {
        Row: {
          attempts: number
          created_at: string
          id: string
          platform: string
          post_id: string
          scheduled_at: string
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          platform: string
          post_id: string
          scheduled_at: string
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          platform?: string
          post_id?: string
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_schedules_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "smm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_social_accounts: {
        Row: {
          access_token_encrypted: string | null
          account_name: string | null
          brand_id: string
          created_at: string
          expires_at: string | null
          external_id: string | null
          id: string
          platform: string
          status: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_name?: string | null
          brand_id: string
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          platform: string
          status?: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_name?: string | null
          brand_id?: string
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          platform?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_social_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "smm_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_templates: {
        Row: {
          category: string
          created_at: string
          css: string
          html: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          css?: string
          html?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          css?: string
          html?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      smm_owns_brand: { Args: { _brand_id: string }; Returns: boolean }
      smm_owns_post: { Args: { _post_id: string }; Returns: boolean }
      smm_owns_schedule: { Args: { _schedule_id: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
