/**
 * Generated Supabase Database types (Increment 3–5).
 * Regenerate with: `npx supabase gen types typescript --local`
 * after `supabase db reset`; keep this file in sync with migrations.
 * Convenience Row/Enum aliases at the bottom are hand-maintained.
 */

export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      barcodes: {
        Row: {
          barcode_type: string | null;
          branded_product_id: string;
          created_at: string;
          id: string;
          normalized_barcode: string;
        };
        Insert: {
          barcode_type?: string | null;
          branded_product_id: string;
          created_at?: string;
          id?: string;
          normalized_barcode: string;
        };
        Update: {
          barcode_type?: string | null;
          branded_product_id?: string;
          created_at?: string;
          id?: string;
          normalized_barcode?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barcodes_branded_product_id_fkey";
            columns: ["branded_product_id"];
            isOneToOne: false;
            referencedRelation: "branded_products";
            referencedColumns: ["id"];
          },
        ];
      };
      branded_products: {
        Row: {
          allergens_text: string | null;
          brand_name: string | null;
          country_codes: string[];
          created_at: string;
          food_id: string;
          id: string;
          image_url: string | null;
          ingredients_text: string | null;
          last_fetched_at: string | null;
          manufacturer: string | null;
          package_quantity: number | null;
          package_unit: string | null;
          product_name: string;
          serving_grams: number | null;
          serving_size: number | null;
          serving_unit: string | null;
          source: Database["public"]["Enums"]["food_source"] | null;
          source_id: string | null;
          source_payload: Json | null;
          source_payload_hash: string | null;
          updated_at: string;
        };
        Insert: {
          allergens_text?: string | null;
          brand_name?: string | null;
          country_codes?: string[];
          created_at?: string;
          food_id: string;
          id?: string;
          image_url?: string | null;
          ingredients_text?: string | null;
          last_fetched_at?: string | null;
          manufacturer?: string | null;
          package_quantity?: number | null;
          package_unit?: string | null;
          product_name: string;
          serving_grams?: number | null;
          serving_size?: number | null;
          serving_unit?: string | null;
          source?: Database["public"]["Enums"]["food_source"] | null;
          source_id?: string | null;
          source_payload?: Json | null;
          source_payload_hash?: string | null;
          updated_at?: string;
        };
        Update: {
          allergens_text?: string | null;
          brand_name?: string | null;
          country_codes?: string[];
          created_at?: string;
          food_id?: string;
          id?: string;
          image_url?: string | null;
          ingredients_text?: string | null;
          last_fetched_at?: string | null;
          manufacturer?: string | null;
          package_quantity?: number | null;
          package_unit?: string | null;
          product_name?: string;
          serving_grams?: number | null;
          serving_size?: number | null;
          serving_unit?: string | null;
          source?: Database["public"]["Enums"]["food_source"] | null;
          source_id?: string | null;
          source_payload?: Json | null;
          source_payload_hash?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branded_products_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_module_statuses: {
        Row: {
          completed_at: string | null;
          created_at: string;
          daily_record_id: string;
          id: string;
          progress_target: number | null;
          progress_value: number | null;
          revision: number;
          status: Database["public"]["Enums"]["daily_module_status_kind"];
          summary_text: string | null;
          updated_at: string;
          user_module_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          daily_record_id: string;
          id?: string;
          progress_target?: number | null;
          progress_value?: number | null;
          revision?: number;
          status?: Database["public"]["Enums"]["daily_module_status_kind"];
          summary_text?: string | null;
          updated_at?: string;
          user_module_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          daily_record_id?: string;
          id?: string;
          progress_target?: number | null;
          progress_value?: number | null;
          revision?: number;
          status?: Database["public"]["Enums"]["daily_module_status_kind"];
          summary_text?: string | null;
          updated_at?: string;
          user_module_id?: string;
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
      daily_records: {
        Row: {
          created_at: string;
          id: string;
          local_date: string;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          local_date: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          local_date?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
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
      dashboard_cards: {
        Row: {
          created_at: string;
          dashboard_layout_id: string;
          desktop_column: number;
          desktop_row: number;
          desktop_span: number;
          id: string;
          mobile_position: number;
          position_index: number;
          rotation: number;
          tablet_position: number;
          updated_at: string;
          user_module_id: string;
          visual_variant: Database["public"]["Enums"]["card_visual_variant"];
        };
        Insert: {
          created_at?: string;
          dashboard_layout_id: string;
          desktop_column?: number;
          desktop_row?: number;
          desktop_span?: number;
          id?: string;
          mobile_position?: number;
          position_index: number;
          rotation?: number;
          tablet_position?: number;
          updated_at?: string;
          user_module_id: string;
          visual_variant?: Database["public"]["Enums"]["card_visual_variant"];
        };
        Update: {
          created_at?: string;
          dashboard_layout_id?: string;
          desktop_column?: number;
          desktop_row?: number;
          desktop_span?: number;
          id?: string;
          mobile_position?: number;
          position_index?: number;
          rotation?: number;
          tablet_position?: number;
          updated_at?: string;
          user_module_id?: string;
          visual_variant?: Database["public"]["Enums"]["card_visual_variant"];
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
      dashboard_layouts: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          user_id?: string;
          version?: number;
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
      food_aliases: {
        Row: {
          alias: string;
          created_at: string;
          food_id: string;
          id: string;
          locale: string;
          normalized_alias: string;
          source: Database["public"]["Enums"]["food_source"];
          updated_at: string;
        };
        Insert: {
          alias: string;
          created_at?: string;
          food_id: string;
          id?: string;
          locale?: string;
          normalized_alias: string;
          source?: Database["public"]["Enums"]["food_source"];
          updated_at?: string;
        };
        Update: {
          alias?: string;
          created_at?: string;
          food_id?: string;
          id?: string;
          locale?: string;
          normalized_alias?: string;
          source?: Database["public"]["Enums"]["food_source"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_aliases_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      food_nutrients: {
        Row: {
          amount_per_100g: number;
          created_at: string;
          food_id: string;
          id: string;
          nutrient_definition_id: string;
          source: Database["public"]["Enums"]["food_source"];
          source_reference: string | null;
          updated_at: string;
        };
        Insert: {
          amount_per_100g: number;
          created_at?: string;
          food_id: string;
          id?: string;
          nutrient_definition_id: string;
          source?: Database["public"]["Enums"]["food_source"];
          source_reference?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_per_100g?: number;
          created_at?: string;
          food_id?: string;
          id?: string;
          nutrient_definition_id?: string;
          source?: Database["public"]["Enums"]["food_source"];
          source_reference?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_nutrients_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "food_nutrients_nutrient_definition_id_fkey";
            columns: ["nutrient_definition_id"];
            isOneToOne: false;
            referencedRelation: "nutrient_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      food_portions: {
        Row: {
          created_at: string;
          food_id: string;
          gram_weight: number;
          id: string;
          is_default: boolean;
          label: string;
          source: Database["public"]["Enums"]["food_source"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          food_id: string;
          gram_weight: number;
          id?: string;
          is_default?: boolean;
          label: string;
          source: Database["public"]["Enums"]["food_source"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          food_id?: string;
          gram_weight?: number;
          id?: string;
          is_default?: boolean;
          label?: string;
          source?: Database["public"]["Enums"]["food_source"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_portions_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          brand_name: string | null;
          canonical_name: string;
          category: string | null;
          created_at: string;
          description: string | null;
          edible_portion_percent: number | null;
          food_state: Database["public"]["Enums"]["food_state"];
          id: string;
          normalized_name: string;
          provenance_notes: string | null;
          reviewed_at: string | null;
          source: Database["public"]["Enums"]["food_source"];
          source_dataset: string | null;
          source_id: string | null;
          source_organization: string | null;
          source_reference: string | null;
          source_updated_at: string | null;
          updated_at: string;
          user_editable: boolean;
          verified: boolean;
        };
        Insert: {
          brand_name?: string | null;
          canonical_name: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          edible_portion_percent?: number | null;
          food_state?: Database["public"]["Enums"]["food_state"];
          id?: string;
          normalized_name: string;
          provenance_notes?: string | null;
          reviewed_at?: string | null;
          source: Database["public"]["Enums"]["food_source"];
          source_dataset?: string | null;
          source_id?: string | null;
          source_organization?: string | null;
          source_reference?: string | null;
          source_updated_at?: string | null;
          updated_at?: string;
          user_editable?: boolean;
          verified?: boolean;
        };
        Update: {
          brand_name?: string | null;
          canonical_name?: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          edible_portion_percent?: number | null;
          food_state?: Database["public"]["Enums"]["food_state"];
          id?: string;
          normalized_name?: string;
          provenance_notes?: string | null;
          reviewed_at?: string | null;
          source?: Database["public"]["Enums"]["food_source"];
          source_dataset?: string | null;
          source_id?: string | null;
          source_organization?: string | null;
          source_reference?: string | null;
          source_updated_at?: string | null;
          updated_at?: string;
          user_editable?: boolean;
          verified?: boolean;
        };
        Relationships: [];
      };
      meal_log_items: {
        Row: {
          carbohydrate_g: number;
          created_at: string;
          display_name_snapshot: string;
          energy_kcal: number;
          fat_g: number;
          fiber_g: number;
          food_id: string | null;
          id: string;
          item_type: Database["public"]["Enums"]["meal_item_type"];
          meal_log_id: string;
          nutrient_snapshot_json: Json;
          protein_g: number;
          quantity: number;
          recipe_id: string | null;
          source_snapshot: Json;
          unit: string;
          updated_at: string;
        };
        Insert: {
          carbohydrate_g?: number;
          created_at?: string;
          display_name_snapshot: string;
          energy_kcal?: number;
          fat_g?: number;
          fiber_g?: number;
          food_id?: string | null;
          id?: string;
          item_type: Database["public"]["Enums"]["meal_item_type"];
          meal_log_id: string;
          nutrient_snapshot_json?: Json;
          protein_g?: number;
          quantity: number;
          recipe_id?: string | null;
          source_snapshot?: Json;
          unit: string;
          updated_at?: string;
        };
        Update: {
          carbohydrate_g?: number;
          created_at?: string;
          display_name_snapshot?: string;
          energy_kcal?: number;
          fat_g?: number;
          fiber_g?: number;
          food_id?: string | null;
          id?: string;
          item_type?: Database["public"]["Enums"]["meal_item_type"];
          meal_log_id?: string;
          nutrient_snapshot_json?: Json;
          protein_g?: number;
          quantity?: number;
          recipe_id?: string | null;
          source_snapshot?: Json;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_log_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_log_items_meal_log_id_fkey";
            columns: ["meal_log_id"];
            isOneToOne: false;
            referencedRelation: "meal_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_log_items_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_logs: {
        Row: {
          carbohydrate_g: number;
          consumed_at: string;
          created_at: string;
          daily_record_id: string;
          deleted_at: string | null;
          energy_kcal: number;
          fat_g: number;
          fiber_g: number;
          id: string;
          label: string | null;
          meal_type: Database["public"]["Enums"]["meal_type"];
          protein_g: number;
          source_template_id: string | null;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          carbohydrate_g?: number;
          consumed_at?: string;
          created_at?: string;
          daily_record_id: string;
          deleted_at?: string | null;
          energy_kcal?: number;
          fat_g?: number;
          fiber_g?: number;
          id?: string;
          label?: string | null;
          meal_type?: Database["public"]["Enums"]["meal_type"];
          protein_g?: number;
          source_template_id?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          carbohydrate_g?: number;
          consumed_at?: string;
          created_at?: string;
          daily_record_id?: string;
          deleted_at?: string | null;
          energy_kcal?: number;
          fat_g?: number;
          fiber_g?: number;
          id?: string;
          label?: string | null;
          meal_type?: Database["public"]["Enums"]["meal_type"];
          protein_g?: number;
          source_template_id?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meal_logs_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_logs_source_template_id_fkey";
            columns: ["source_template_id"];
            isOneToOne: false;
            referencedRelation: "meal_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_template_items: {
        Row: {
          created_at: string;
          food_id: string | null;
          id: string;
          item_type: Database["public"]["Enums"]["meal_item_type"];
          meal_template_id: string;
          nutrient_snapshot_json: Json;
          quantity: number;
          recipe_id: string | null;
          sort_order: number;
          unit: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          food_id?: string | null;
          id?: string;
          item_type: Database["public"]["Enums"]["meal_item_type"];
          meal_template_id: string;
          nutrient_snapshot_json?: Json;
          quantity: number;
          recipe_id?: string | null;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          food_id?: string | null;
          id?: string;
          item_type?: Database["public"]["Enums"]["meal_item_type"];
          meal_template_id?: string;
          nutrient_snapshot_json?: Json;
          quantity?: number;
          recipe_id?: string | null;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_template_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_template_items_meal_template_id_fkey";
            columns: ["meal_template_id"];
            isOneToOne: false;
            referencedRelation: "meal_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_template_items_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_templates: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          meal_type: Database["public"]["Enums"]["meal_type"];
          name: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          meal_type?: Database["public"]["Enums"]["meal_type"];
          name: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          meal_type?: Database["public"]["Enums"]["meal_type"];
          name?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meal_templates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      module_definitions: {
        Row: {
          category: Database["public"]["Enums"]["module_category"];
          created_at: string;
          default_enabled: boolean;
          default_order: number;
          description: string;
          display_name: string;
          icon_key: string;
          id: string;
          is_active: boolean;
          key: string;
          supports_calendar: boolean;
          supports_target: boolean;
          updated_at: string;
          visual_variant: Database["public"]["Enums"]["card_visual_variant"];
        };
        Insert: {
          category: Database["public"]["Enums"]["module_category"];
          created_at?: string;
          default_enabled?: boolean;
          default_order?: number;
          description?: string;
          display_name: string;
          icon_key?: string;
          id?: string;
          is_active?: boolean;
          key: string;
          supports_calendar?: boolean;
          supports_target?: boolean;
          updated_at?: string;
          visual_variant?: Database["public"]["Enums"]["card_visual_variant"];
        };
        Update: {
          category?: Database["public"]["Enums"]["module_category"];
          created_at?: string;
          default_enabled?: boolean;
          default_order?: number;
          description?: string;
          display_name?: string;
          icon_key?: string;
          id?: string;
          is_active?: boolean;
          key?: string;
          supports_calendar?: boolean;
          supports_target?: boolean;
          updated_at?: string;
          visual_variant?: Database["public"]["Enums"]["card_visual_variant"];
        };
        Relationships: [];
      };
      nutrient_definitions: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          daily_value_basis: number | null;
          display_name: string;
          display_order: number;
          id: string;
          stable_key: string;
          unit: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category: string;
          created_at?: string;
          daily_value_basis?: number | null;
          display_name: string;
          display_order?: number;
          id?: string;
          stable_key: string;
          unit: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          daily_value_basis?: number | null;
          display_name?: string;
          display_order?: number;
          id?: string;
          stable_key?: string;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nutrition_goals: {
        Row: {
          calorie_target: number | null;
          carbohydrate_g_target: number | null;
          created_at: string;
          effective_from: string;
          fat_g_target: number | null;
          fiber_g_target: number | null;
          id: string;
          protein_g_target: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          calorie_target?: number | null;
          carbohydrate_g_target?: number | null;
          created_at?: string;
          effective_from: string;
          fat_g_target?: number | null;
          fiber_g_target?: number | null;
          id?: string;
          protein_g_target?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          calorie_target?: number | null;
          carbohydrate_g_target?: number | null;
          created_at?: string;
          effective_from?: string;
          fat_g_target?: number | null;
          fiber_g_target?: number | null;
          id?: string;
          protein_g_target?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nutrition_goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      nutrition_label_captures: {
        Row: {
          barcode: string | null;
          confidence_summary: number | null;
          created_at: string;
          deleted_at: string | null;
          extraction_json: Json;
          id: string;
          language: string;
          ocr_text: string | null;
          private_image_path: string | null;
          retain_image: boolean;
          reviewed_values_json: Json;
          status: Database["public"]["Enums"]["nutrition_label_capture_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          barcode?: string | null;
          confidence_summary?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          extraction_json?: Json;
          id?: string;
          language?: string;
          ocr_text?: string | null;
          private_image_path?: string | null;
          retain_image?: boolean;
          reviewed_values_json?: Json;
          status?: Database["public"]["Enums"]["nutrition_label_capture_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          barcode?: string | null;
          confidence_summary?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          extraction_json?: Json;
          id?: string;
          language?: string;
          ocr_text?: string | null;
          private_image_path?: string | null;
          retain_image?: boolean;
          reviewed_values_json?: Json;
          status?: Database["public"]["Enums"]["nutrition_label_capture_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nutrition_label_captures_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      product_review_events: {
        Row: {
          branded_product_id: string | null;
          capture_id: string | null;
          created_at: string;
          details_json: Json;
          event_type: string;
          id: string;
          user_id: string;
        };
        Insert: {
          branded_product_id?: string | null;
          capture_id?: string | null;
          created_at?: string;
          details_json?: Json;
          event_type: string;
          id?: string;
          user_id: string;
        };
        Update: {
          branded_product_id?: string | null;
          capture_id?: string | null;
          created_at?: string;
          details_json?: Json;
          event_type?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_review_events_branded_product_id_fkey";
            columns: ["branded_product_id"];
            isOneToOne: false;
            referencedRelation: "branded_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_review_events_capture_id_fkey";
            columns: ["capture_id"];
            isOneToOne: false;
            referencedRelation: "nutrition_label_captures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_review_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          animation_mode: Database["public"]["Enums"]["animation_mode"];
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          id: string;
          locale: string;
          onboarding_completed: boolean;
          onboarding_step: number;
          timezone: string;
          units_system: Database["public"]["Enums"]["units_system"];
          updated_at: string;
        };
        Insert: {
          animation_mode?: Database["public"]["Enums"]["animation_mode"];
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          locale?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          timezone?: string;
          units_system?: Database["public"]["Enums"]["units_system"];
          updated_at?: string;
        };
        Update: {
          animation_mode?: Database["public"]["Enums"]["animation_mode"];
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          locale?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          timezone?: string;
          units_system?: Database["public"]["Enums"]["units_system"];
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          created_at: string;
          food_id: string;
          id: string;
          nutrient_snapshot_json: Json;
          portion_id: string | null;
          quantity: number;
          recipe_id: string;
          sort_order: number;
          unit: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          food_id: string;
          id?: string;
          nutrient_snapshot_json?: Json;
          portion_id?: string | null;
          quantity: number;
          recipe_id: string;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          food_id?: string;
          id?: string;
          nutrient_snapshot_json?: Json;
          portion_id?: string | null;
          quantity?: number;
          recipe_id?: string;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_portion_id_fkey";
            columns: ["portion_id"];
            isOneToOne: false;
            referencedRelation: "food_portions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          carbohydrate_g: number | null;
          created_at: string;
          default_serving_g: number | null;
          deleted_at: string | null;
          description: string | null;
          energy_kcal: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          final_cooked_weight_g: number | null;
          id: string;
          name: string;
          protein_g: number | null;
          serving_count: number;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          carbohydrate_g?: number | null;
          created_at?: string;
          default_serving_g?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          energy_kcal?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          final_cooked_weight_g?: number | null;
          id?: string;
          name: string;
          protein_g?: number | null;
          serving_count?: number;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          carbohydrate_g?: number | null;
          created_at?: string;
          default_serving_g?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          energy_kcal?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          final_cooked_weight_g?: number | null;
          id?: string;
          name?: string;
          protein_g?: number | null;
          serving_count?: number;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_custom_foods: {
        Row: {
          created_at: string;
          food_id: string;
          id: string;
          label_image_path: string | null;
          private: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          food_id: string;
          id?: string;
          label_image_path?: string | null;
          private?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          food_id?: string;
          id?: string;
          label_image_path?: string | null;
          private?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_custom_foods_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: true;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_custom_foods_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_modules: {
        Row: {
          created_at: string;
          custom_label: string | null;
          enabled: boolean;
          id: string;
          module_definition_id: string;
          target_unit: string | null;
          target_value: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          custom_label?: string | null;
          enabled?: boolean;
          id?: string;
          module_definition_id: string;
          target_unit?: string | null;
          target_value?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_label?: string | null;
          enabled?: boolean;
          id?: string;
          module_definition_id?: string;
          target_unit?: string | null;
          target_value?: number | null;
          updated_at?: string;
          user_id?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_daily_module_status: {
        Args: {
          p_expected_revision: number;
          p_progress_target?: number;
          p_progress_value?: number;
          p_status: Database["public"]["Enums"]["daily_module_status_kind"];
          p_status_id: string;
          p_summary_text?: string;
        };
        Returns: {
          completed_at: string | null;
          created_at: string;
          daily_record_id: string;
          id: string;
          progress_target: number | null;
          progress_value: number | null;
          revision: number;
          status: Database["public"]["Enums"]["daily_module_status_kind"];
          summary_text: string | null;
          updated_at: string;
          user_module_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "daily_module_statuses";
          isOneToOne: true;
          isSetofReturn: false;
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
        SetofOptions: {
          from: "*";
          to: "dashboard_layouts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      ensure_user_board_defaults: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      animation_mode: "full" | "reduced" | "off";
      card_visual_variant:
        | "paper_cream"
        | "paper_yellow"
        | "paper_pink"
        | "window_cyan"
        | "window_purple"
        | "window_pink"
        | "window_orange"
        | "window_lime"
        | "window_blue";
      daily_module_status_kind: "not_started" | "in_progress" | "completed" | "skipped";
      food_source:
        | "user_custom"
        | "mtfbwu_curated"
        | "open_food_facts"
        | "usda_foundation"
        | "usda_sr_legacy"
        | "usda_survey"
        | "usda_branded"
        | "branded_cache"
        | "other";
      food_state: "raw" | "cooked" | "dry" | "prepared" | "packaged";
      meal_item_type: "food" | "recipe";
      meal_type:
        | "breakfast"
        | "lunch"
        | "evening"
        | "pre_workout"
        | "shake"
        | "dinner"
        | "snack"
        | "custom";
      module_category:
        "nutrition" | "training" | "recovery" | "body" | "lifestyle" | "custom";
      nutrition_label_capture_status:
        | "draft"
        | "ocr_running"
        | "ocr_failed"
        | "awaiting_review"
        | "reviewed"
        | "saved"
        | "discarded";
      units_system: "metric" | "imperial";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      animation_mode: ["full", "reduced", "off"],
      card_visual_variant: [
        "paper_cream",
        "paper_yellow",
        "paper_pink",
        "window_cyan",
        "window_purple",
        "window_pink",
        "window_orange",
        "window_lime",
        "window_blue",
      ],
      daily_module_status_kind: ["not_started", "in_progress", "completed", "skipped"],
      food_source: [
        "user_custom",
        "mtfbwu_curated",
        "open_food_facts",
        "usda_foundation",
        "usda_sr_legacy",
        "usda_survey",
        "usda_branded",
        "branded_cache",
        "other",
      ],
      food_state: ["raw", "cooked", "dry", "prepared", "packaged"],
      meal_item_type: ["food", "recipe"],
      meal_type: [
        "breakfast",
        "lunch",
        "evening",
        "pre_workout",
        "shake",
        "dinner",
        "snack",
        "custom",
      ],
      module_category: [
        "nutrition",
        "training",
        "recovery",
        "body",
        "lifestyle",
        "custom",
      ],
      nutrition_label_capture_status: [
        "draft",
        "ocr_running",
        "ocr_failed",
        "awaiting_review",
        "reviewed",
        "saved",
        "discarded",
      ],
      units_system: ["metric", "imperial"],
    },
  },
} as const;

export type UnitsSystem = Database["public"]["Enums"]["units_system"];
export type AnimationMode = Database["public"]["Enums"]["animation_mode"];
export type ModuleCategory = Database["public"]["Enums"]["module_category"];
export type CardVisualVariant = Database["public"]["Enums"]["card_visual_variant"];
export type DailyModuleStatusKind =
  Database["public"]["Enums"]["daily_module_status_kind"];
export type FoodSource = Database["public"]["Enums"]["food_source"];
export type FoodState = Database["public"]["Enums"]["food_state"];
export type MealItemType = Database["public"]["Enums"]["meal_item_type"];
export type DbMealType = Database["public"]["Enums"]["meal_type"];
export type NutritionLabelCaptureStatus =
  Database["public"]["Enums"]["nutrition_label_capture_status"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ModuleDefinition = Database["public"]["Tables"]["module_definitions"]["Row"];
export type UserModule = Database["public"]["Tables"]["user_modules"]["Row"];
export type DashboardLayout = Database["public"]["Tables"]["dashboard_layouts"]["Row"];
export type DashboardCard = Database["public"]["Tables"]["dashboard_cards"]["Row"];
export type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];
export type DailyModuleStatus =
  Database["public"]["Tables"]["daily_module_statuses"]["Row"];
export type NutrientDefinition =
  Database["public"]["Tables"]["nutrient_definitions"]["Row"];
export type Food = Database["public"]["Tables"]["foods"]["Row"];
export type MealLog = Database["public"]["Tables"]["meal_logs"]["Row"];
export type MealLogItem = Database["public"]["Tables"]["meal_log_items"]["Row"];
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
export type NutritionGoal = Database["public"]["Tables"]["nutrition_goals"]["Row"];
export type BrandedProduct = Database["public"]["Tables"]["branded_products"]["Row"];
export type Barcode = Database["public"]["Tables"]["barcodes"]["Row"];
export type NutritionLabelCapture =
  Database["public"]["Tables"]["nutrition_label_captures"]["Row"];
export type ProductReviewEvent =
  Database["public"]["Tables"]["product_review_events"]["Row"];
