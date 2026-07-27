/**
 * Hand-maintained Supabase Database types for Increment 3.
 * Prefer regenerating with `npx supabase gen types typescript --local`
 * after `supabase db reset`; keep this file in sync with migrations.
 *
 * Shape must satisfy supabase-js GenericSchema (Tables/Views/Functions).
 */

export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UnitsSystem = "metric" | "imperial";
export type AnimationMode = "full" | "reduced" | "off";
export type ModuleCategory =
  "nutrition" | "training" | "recovery" | "body" | "lifestyle" | "custom";
export type CardVisualVariant =
  | "paper_cream"
  | "paper_yellow"
  | "paper_pink"
  | "window_cyan"
  | "window_purple"
  | "window_pink"
  | "window_orange"
  | "window_lime"
  | "window_blue";
export type DailyModuleStatusKind =
  "not_started" | "in_progress" | "completed" | "skipped";

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase?: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_path: string | null;
          timezone: string;
          locale: string;
          units_system: UnitsSystem;
          animation_mode: AnimationMode;
          onboarding_completed: boolean;
          onboarding_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_path?: string | null;
          timezone?: string;
          locale?: string;
          units_system?: UnitsSystem;
          animation_mode?: AnimationMode;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_path?: string | null;
          timezone?: string;
          locale?: string;
          units_system?: UnitsSystem;
          animation_mode?: AnimationMode;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      module_definitions: {
        Row: {
          id: string;
          key: string;
          display_name: string;
          description: string;
          category: ModuleCategory;
          default_enabled: boolean;
          default_order: number;
          visual_variant: CardVisualVariant;
          icon_key: string;
          supports_target: boolean;
          supports_calendar: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          display_name: string;
          description?: string;
          category: ModuleCategory;
          default_enabled?: boolean;
          default_order?: number;
          visual_variant?: CardVisualVariant;
          icon_key?: string;
          supports_target?: boolean;
          supports_calendar?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          display_name?: string;
          description?: string;
          category?: ModuleCategory;
          default_enabled?: boolean;
          default_order?: number;
          visual_variant?: CardVisualVariant;
          icon_key?: string;
          supports_target?: boolean;
          supports_calendar?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_modules: {
        Row: {
          id: string;
          user_id: string;
          module_definition_id: string;
          enabled: boolean;
          custom_label: string | null;
          target_value: number | null;
          target_unit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_definition_id: string;
          enabled?: boolean;
          custom_label?: string | null;
          target_value?: number | null;
          target_unit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module_definition_id?: string;
          enabled?: boolean;
          custom_label?: string | null;
          target_value?: number | null;
          target_unit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_modules_module_definition_id_fkey";
            columns: ["module_definition_id"];
            isOneToOne: false;
            referencedRelation: "module_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_modules_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      dashboard_layouts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_active: boolean;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          is_active?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_active?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      dashboard_cards: {
        Row: {
          id: string;
          dashboard_layout_id: string;
          user_module_id: string;
          position_index: number;
          desktop_column: number;
          desktop_row: number;
          desktop_span: number;
          tablet_position: number;
          mobile_position: number;
          rotation: number;
          visual_variant: CardVisualVariant;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dashboard_layout_id: string;
          user_module_id: string;
          position_index: number;
          desktop_column?: number;
          desktop_row?: number;
          desktop_span?: number;
          tablet_position?: number;
          mobile_position?: number;
          rotation?: number;
          visual_variant?: CardVisualVariant;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dashboard_layout_id?: string;
          user_module_id?: string;
          position_index?: number;
          desktop_column?: number;
          desktop_row?: number;
          desktop_span?: number;
          tablet_position?: number;
          mobile_position?: number;
          rotation?: number;
          visual_variant?: CardVisualVariant;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dashboard_cards_dashboard_layout_id_fkey";
            columns: ["dashboard_layout_id"];
            isOneToOne: false;
            referencedRelation: "dashboard_layouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dashboard_cards_user_module_id_fkey";
            columns: ["user_module_id"];
            isOneToOne: false;
            referencedRelation: "user_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_records: {
        Row: {
          id: string;
          user_id: string;
          local_date: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          local_date: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          local_date?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_module_statuses: {
        Row: {
          id: string;
          daily_record_id: string;
          user_module_id: string;
          status: DailyModuleStatusKind;
          progress_value: number | null;
          progress_target: number | null;
          summary_text: string | null;
          completed_at: string | null;
          revision: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          daily_record_id: string;
          user_module_id: string;
          status?: DailyModuleStatusKind;
          progress_value?: number | null;
          progress_target?: number | null;
          summary_text?: string | null;
          completed_at?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          daily_record_id?: string;
          user_module_id?: string;
          status?: DailyModuleStatusKind;
          progress_value?: number | null;
          progress_target?: number | null;
          summary_text?: string | null;
          completed_at?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_module_statuses_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_module_statuses_user_module_id_fkey";
            columns: ["user_module_id"];
            isOneToOne: false;
            referencedRelation: "user_modules";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_daily_module_status: {
        Args: {
          p_expected_revision: number;
          p_progress_target?: number | null;
          p_progress_value?: number | null;
          p_status: DailyModuleStatusKind;
          p_status_id: string;
          p_summary_text?: string | null;
        };
        Returns: {
          completed_at: string | null;
          created_at: string;
          daily_record_id: string;
          id: string;
          progress_target: number | null;
          progress_value: number | null;
          revision: number;
          status: DailyModuleStatusKind;
          summary_text: string | null;
          updated_at: string;
          user_module_id: string;
        };
      };
      bump_dashboard_layout_version: {
        Args: { p_expected_version: number; p_layout_id: string };
        Returns: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          user_id: string;
          version: number;
        };
      };
      ensure_user_board_defaults: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      animation_mode: AnimationMode;
      card_visual_variant: CardVisualVariant;
      daily_module_status_kind: DailyModuleStatusKind;
      module_category: ModuleCategory;
      units_system: UnitsSystem;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ModuleDefinition = Database["public"]["Tables"]["module_definitions"]["Row"];
export type UserModule = Database["public"]["Tables"]["user_modules"]["Row"];
export type DashboardLayout = Database["public"]["Tables"]["dashboard_layouts"]["Row"];
export type DashboardCard = Database["public"]["Tables"]["dashboard_cards"]["Row"];
export type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];
export type DailyModuleStatus =
  Database["public"]["Tables"]["daily_module_statuses"]["Row"];
