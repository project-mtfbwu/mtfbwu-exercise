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
      account_deletion_requests: {
        Row: {
          cleanup_detail: Json;
          cleanup_stage: string | null;
          completed_at: string | null;
          confirmation_phrase: string;
          created_at: string;
          id: string;
          last_error: string | null;
          requested_at: string;
          scheduled_purge_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cleanup_detail?: Json;
          cleanup_stage?: string | null;
          completed_at?: string | null;
          confirmation_phrase?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          requested_at?: string;
          scheduled_purge_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cleanup_detail?: Json;
          cleanup_stage?: string | null;
          completed_at?: string | null;
          confirmation_phrase?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          requested_at?: string;
          scheduled_purge_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      account_export_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          failed_file_count: number;
          file_count: number;
          id: string;
          last_error: string | null;
          manifest_summary: Json;
          status: string;
          storage_path: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          failed_file_count?: number;
          file_count?: number;
          id?: string;
          last_error?: string | null;
          manifest_summary?: Json;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          failed_file_count?: number;
          file_count?: number;
          id?: string;
          last_error?: string | null;
          manifest_summary?: Json;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_export_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
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
      body_measurement_entries: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          local_date: string;
          note: string | null;
          recorded_at: string;
          source: Database["public"]["Enums"]["progress_record_source"];
          timezone: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date: string;
          note?: string | null;
          recorded_at?: string;
          source?: Database["public"]["Enums"]["progress_record_source"];
          timezone?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date?: string;
          note?: string | null;
          recorded_at?: string;
          source?: Database["public"]["Enums"]["progress_record_source"];
          timezone?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "body_measurement_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      body_measurement_values: {
        Row: {
          body_measurement_entry_id: string;
          created_at: string;
          id: string;
          normalized_value: number;
          side: Database["public"]["Enums"]["measurement_value_side"];
          unit: string;
          updated_at: string;
          user_measurement_definition_id: string;
          value: number;
        };
        Insert: {
          body_measurement_entry_id: string;
          created_at?: string;
          id?: string;
          normalized_value: number;
          side?: Database["public"]["Enums"]["measurement_value_side"];
          unit: string;
          updated_at?: string;
          user_measurement_definition_id: string;
          value: number;
        };
        Update: {
          body_measurement_entry_id?: string;
          created_at?: string;
          id?: string;
          normalized_value?: number;
          side?: Database["public"]["Enums"]["measurement_value_side"];
          unit?: string;
          updated_at?: string;
          user_measurement_definition_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "body_measurement_values_body_measurement_entry_id_fkey";
            columns: ["body_measurement_entry_id"];
            isOneToOne: false;
            referencedRelation: "body_measurement_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "body_measurement_values_user_measurement_definition_id_fkey";
            columns: ["user_measurement_definition_id"];
            isOneToOne: false;
            referencedRelation: "user_measurement_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      body_weight_entries: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          local_date: string;
          normalized_kg: number | null;
          note: string | null;
          recorded_at: string;
          source: Database["public"]["Enums"]["progress_record_source"];
          timezone: string;
          updated_at: string;
          user_id: string;
          weight_unit: string;
          weight_value: number | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date: string;
          normalized_kg?: number | null;
          note?: string | null;
          recorded_at?: string;
          source?: Database["public"]["Enums"]["progress_record_source"];
          timezone?: string;
          updated_at?: string;
          user_id: string;
          weight_unit?: string;
          weight_value?: number | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date?: string;
          normalized_kg?: number | null;
          note?: string | null;
          recorded_at?: string;
          source?: Database["public"]["Enums"]["progress_record_source"];
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          weight_unit?: string;
          weight_value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "body_weight_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      daily_overview_preferences: {
        Row: {
          created_at: string;
          id: string;
          show_completion_percentage: boolean;
          show_module_counts: boolean;
          summary_order: Json;
          updated_at: string;
          user_id: string;
          visible_sections: Json;
        };
        Insert: {
          created_at?: string;
          id?: string;
          show_completion_percentage?: boolean;
          show_module_counts?: boolean;
          summary_order?: Json;
          updated_at?: string;
          user_id: string;
          visible_sections?: Json;
        };
        Update: {
          created_at?: string;
          id?: string;
          show_completion_percentage?: boolean;
          show_module_counts?: boolean;
          summary_order?: Json;
          updated_at?: string;
          user_id?: string;
          visible_sections?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "daily_overview_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
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
      equipment_types: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          stable_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          stable_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          stable_key?: string;
        };
        Relationships: [];
      };
      exercise_aliases: {
        Row: {
          alias: string;
          created_at: string;
          exercise_definition_id: string;
          id: string;
          normalized_alias: string;
          updated_at: string;
        };
        Insert: {
          alias: string;
          created_at?: string;
          exercise_definition_id: string;
          id?: string;
          normalized_alias: string;
          updated_at?: string;
        };
        Update: {
          alias?: string;
          created_at?: string;
          exercise_definition_id?: string;
          id?: string;
          normalized_alias?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_aliases_exercise_definition_id_fkey";
            columns: ["exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "exercise_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_definitions: {
        Row: {
          active: boolean;
          bodyweight: boolean;
          created_at: string;
          description: string | null;
          distance_based: boolean;
          exercise_type: Database["public"]["Enums"]["exercise_type"];
          id: string;
          movement_pattern_id: string | null;
          name: string;
          normalized_name: string;
          primary_equipment_id: string | null;
          source: Database["public"]["Enums"]["exercise_source"];
          source_id: string | null;
          stable_key: string;
          timed: boolean;
          unilateral: boolean;
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          active?: boolean;
          bodyweight?: boolean;
          created_at?: string;
          description?: string | null;
          distance_based?: boolean;
          exercise_type?: Database["public"]["Enums"]["exercise_type"];
          id?: string;
          movement_pattern_id?: string | null;
          name: string;
          normalized_name: string;
          primary_equipment_id?: string | null;
          source?: Database["public"]["Enums"]["exercise_source"];
          source_id?: string | null;
          stable_key: string;
          timed?: boolean;
          unilateral?: boolean;
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          active?: boolean;
          bodyweight?: boolean;
          created_at?: string;
          description?: string | null;
          distance_based?: boolean;
          exercise_type?: Database["public"]["Enums"]["exercise_type"];
          id?: string;
          movement_pattern_id?: string | null;
          name?: string;
          normalized_name?: string;
          primary_equipment_id?: string | null;
          source?: Database["public"]["Enums"]["exercise_source"];
          source_id?: string | null;
          stable_key?: string;
          timed?: boolean;
          unilateral?: boolean;
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_definitions_movement_pattern_id_fkey";
            columns: ["movement_pattern_id"];
            isOneToOne: false;
            referencedRelation: "movement_patterns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercise_definitions_primary_equipment_id_fkey";
            columns: ["primary_equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment_types";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_muscle_groups: {
        Row: {
          created_at: string;
          exercise_definition_id: string;
          muscle_group_id: string;
          role: Database["public"]["Enums"]["exercise_muscle_role"];
        };
        Insert: {
          created_at?: string;
          exercise_definition_id: string;
          muscle_group_id: string;
          role?: Database["public"]["Enums"]["exercise_muscle_role"];
        };
        Update: {
          created_at?: string;
          exercise_definition_id?: string;
          muscle_group_id?: string;
          role?: Database["public"]["Enums"]["exercise_muscle_role"];
        };
        Relationships: [
          {
            foreignKeyName: "exercise_muscle_groups_exercise_definition_id_fkey";
            columns: ["exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "exercise_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercise_muscle_groups_muscle_group_id_fkey";
            columns: ["muscle_group_id"];
            isOneToOne: false;
            referencedRelation: "muscle_groups";
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
      hydration_entries: {
        Row: {
          amount_ml: number;
          created_at: string;
          daily_record_id: string | null;
          deleted_at: string | null;
          id: string;
          local_date: string;
          note: string | null;
          occurred_at: string;
          source: Database["public"]["Enums"]["tracker_event_source"];
          updated_at: string;
          user_id: string;
          vessel_label: string | null;
        };
        Insert: {
          amount_ml: number;
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          local_date: string;
          note?: string | null;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["tracker_event_source"];
          updated_at?: string;
          user_id: string;
          vessel_label?: string | null;
        };
        Update: {
          amount_ml?: number;
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          local_date?: string;
          note?: string | null;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["tracker_event_source"];
          updated_at?: string;
          user_id?: string;
          vessel_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hydration_entries_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hydration_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      measurement_definitions: {
        Row: {
          active: boolean;
          category: Database["public"]["Enums"]["measurement_category"];
          created_at: string;
          default_unit: string;
          display_name: string;
          display_order: number;
          id: string;
          stable_key: string;
          supports_side: boolean;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category?: Database["public"]["Enums"]["measurement_category"];
          created_at?: string;
          default_unit: string;
          display_name: string;
          display_order?: number;
          id?: string;
          stable_key: string;
          supports_side?: boolean;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: Database["public"]["Enums"]["measurement_category"];
          created_at?: string;
          default_unit?: string;
          display_name?: string;
          display_order?: number;
          id?: string;
          stable_key?: string;
          supports_side?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      meditation_sessions: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          daily_record_id: string | null;
          deleted_at: string | null;
          duration_seconds: number;
          id: string;
          local_date: string;
          meditation_type: Database["public"]["Enums"]["meditation_type"];
          note: string | null;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          duration_seconds: number;
          id?: string;
          local_date: string;
          meditation_type?: Database["public"]["Enums"]["meditation_type"];
          note?: string | null;
          started_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          duration_seconds?: number;
          id?: string;
          local_date?: string;
          meditation_type?: Database["public"]["Enums"]["meditation_type"];
          note?: string | null;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meditation_sessions_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meditation_sessions_user_id_fkey";
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
      movement_patterns: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          stable_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          stable_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          stable_key?: string;
        };
        Relationships: [];
      };
      muscle_groups: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          stable_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          stable_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          stable_key?: string;
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
      personal_records: {
        Row: {
          achieved_at: string;
          confirmed: boolean;
          created_at: string;
          dismissed: boolean;
          exercise_definition_id: string | null;
          exercise_label_snapshot: string;
          id: string;
          notes: string | null;
          record_type: string;
          status: string;
          unit: string;
          updated_at: string;
          user_exercise_id: string | null;
          user_id: string;
          value: number;
          workout_set_id: string | null;
        };
        Insert: {
          achieved_at?: string;
          confirmed?: boolean;
          created_at?: string;
          dismissed?: boolean;
          exercise_definition_id?: string | null;
          exercise_label_snapshot: string;
          id?: string;
          notes?: string | null;
          record_type: string;
          status?: string;
          unit: string;
          updated_at?: string;
          user_exercise_id?: string | null;
          user_id: string;
          value: number;
          workout_set_id?: string | null;
        };
        Update: {
          achieved_at?: string;
          confirmed?: boolean;
          created_at?: string;
          dismissed?: boolean;
          exercise_definition_id?: string | null;
          exercise_label_snapshot?: string;
          id?: string;
          notes?: string | null;
          record_type?: string;
          status?: string;
          unit?: string;
          updated_at?: string;
          user_exercise_id?: string | null;
          user_id?: string;
          value?: number;
          workout_set_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_definition_id_fkey";
            columns: ["exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "exercise_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_user_exercise_id_fkey";
            columns: ["user_exercise_id"];
            isOneToOne: false;
            referencedRelation: "user_exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_workout_set_id_fkey";
            columns: ["workout_set_id"];
            isOneToOne: false;
            referencedRelation: "workout_sets";
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
      profile_preferences: {
        Row: {
          created_at: string;
          default_dashboard_date_mode: string;
          id: string;
          length_unit: string;
          preferred_name: string | null;
          show_streaks: boolean;
          show_weekly_summary: boolean;
          time_format: string;
          updated_at: string;
          user_id: string;
          volume_unit: string;
          week_starts_on: number;
          weight_unit: string;
        };
        Insert: {
          created_at?: string;
          default_dashboard_date_mode?: string;
          id?: string;
          length_unit?: string;
          preferred_name?: string | null;
          show_streaks?: boolean;
          show_weekly_summary?: boolean;
          time_format?: string;
          updated_at?: string;
          user_id: string;
          volume_unit?: string;
          week_starts_on?: number;
          weight_unit?: string;
        };
        Update: {
          created_at?: string;
          default_dashboard_date_mode?: string;
          id?: string;
          length_unit?: string;
          preferred_name?: string | null;
          show_streaks?: boolean;
          show_weekly_summary?: boolean;
          time_format?: string;
          updated_at?: string;
          user_id?: string;
          volume_unit?: string;
          week_starts_on?: number;
          weight_unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          analytics_consent: boolean;
          animation_mode: Database["public"]["Enums"]["animation_mode"];
          avatar_path: string | null;
          created_at: string;
          deletion_requested_at: string | null;
          display_name: string;
          id: string;
          locale: string;
          onboarding_completed: boolean;
          onboarding_step: number;
          onboarding_version: number;
          timezone: string;
          units_system: Database["public"]["Enums"]["units_system"];
          updated_at: string;
        };
        Insert: {
          analytics_consent?: boolean;
          animation_mode?: Database["public"]["Enums"]["animation_mode"];
          avatar_path?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          display_name?: string;
          id: string;
          locale?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          onboarding_version?: number;
          timezone?: string;
          units_system?: Database["public"]["Enums"]["units_system"];
          updated_at?: string;
        };
        Update: {
          analytics_consent?: boolean;
          animation_mode?: Database["public"]["Enums"]["animation_mode"];
          avatar_path?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          display_name?: string;
          id?: string;
          locale?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          onboarding_version?: number;
          timezone?: string;
          units_system?: Database["public"]["Enums"]["units_system"];
          updated_at?: string;
        };
        Relationships: [];
      };
      progress_comparisons: {
        Row: {
          comparison_type: Database["public"]["Enums"]["progress_comparison_type"];
          created_at: string;
          deleted_at: string | null;
          id: string;
          left_date: string | null;
          left_photo_set_id: string | null;
          measurement_keys: string[] | null;
          right_date: string | null;
          right_photo_set_id: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          comparison_type?: Database["public"]["Enums"]["progress_comparison_type"];
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          left_date?: string | null;
          left_photo_set_id?: string | null;
          measurement_keys?: string[] | null;
          right_date?: string | null;
          right_photo_set_id?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comparison_type?: Database["public"]["Enums"]["progress_comparison_type"];
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          left_date?: string | null;
          left_photo_set_id?: string | null;
          measurement_keys?: string[] | null;
          right_date?: string | null;
          right_photo_set_id?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_comparisons_left_photo_set_id_fkey";
            columns: ["left_photo_set_id"];
            isOneToOne: false;
            referencedRelation: "progress_photo_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_comparisons_right_photo_set_id_fkey";
            columns: ["right_photo_set_id"];
            isOneToOne: false;
            referencedRelation: "progress_photo_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_comparisons_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_notes: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          local_date: string;
          note_type: Database["public"]["Enums"]["progress_note_type"];
          updated_at: string;
          user_id: string;
          value_text: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date: string;
          note_type?: Database["public"]["Enums"]["progress_note_type"];
          updated_at?: string;
          user_id: string;
          value_text: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date?: string;
          note_type?: Database["public"]["Enums"]["progress_note_type"];
          updated_at?: string;
          user_id?: string;
          value_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_photo_sets: {
        Row: {
          captured_at: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          local_date: string;
          note: string | null;
          retained: boolean;
          source: Database["public"]["Enums"]["progress_record_source"];
          timezone: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          captured_at?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date: string;
          note?: string | null;
          retained?: boolean;
          source?: Database["public"]["Enums"]["progress_record_source"];
          timezone?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          captured_at?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          local_date?: string;
          note?: string | null;
          retained?: boolean;
          source?: Database["public"]["Enums"]["progress_record_source"];
          timezone?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_photo_sets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_photos: {
        Row: {
          captured_at: string;
          checksum: string | null;
          created_at: string;
          custom_label: string | null;
          deleted_at: string | null;
          file_size_bytes: number | null;
          height: number | null;
          id: string;
          mime_type: string;
          private_storage_path: string;
          processed: boolean;
          progress_photo_set_id: string;
          slot: Database["public"]["Enums"]["progress_photo_slot"];
          updated_at: string;
          width: number | null;
        };
        Insert: {
          captured_at?: string;
          checksum?: string | null;
          created_at?: string;
          custom_label?: string | null;
          deleted_at?: string | null;
          file_size_bytes?: number | null;
          height?: number | null;
          id?: string;
          mime_type?: string;
          private_storage_path: string;
          processed?: boolean;
          progress_photo_set_id: string;
          slot: Database["public"]["Enums"]["progress_photo_slot"];
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          captured_at?: string;
          checksum?: string | null;
          created_at?: string;
          custom_label?: string | null;
          deleted_at?: string | null;
          file_size_bytes?: number | null;
          height?: number | null;
          id?: string;
          mime_type?: string;
          private_storage_path?: string;
          processed?: boolean;
          progress_photo_set_id?: string;
          slot?: Database["public"]["Enums"]["progress_photo_slot"];
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "progress_photos_progress_photo_set_id_fkey";
            columns: ["progress_photo_set_id"];
            isOneToOne: false;
            referencedRelation: "progress_photo_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_summary_preferences: {
        Row: {
          created_at: string;
          default_date_range: Database["public"]["Enums"]["progress_date_range"];
          id: string;
          selected_measurement_keys: string[];
          show_measurements: boolean;
          show_photos: boolean;
          show_weight: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          default_date_range?: Database["public"]["Enums"]["progress_date_range"];
          id?: string;
          selected_measurement_keys?: string[];
          show_measurements?: boolean;
          show_photos?: boolean;
          show_weight?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          default_date_range?: Database["public"]["Enums"]["progress_date_range"];
          id?: string;
          selected_measurement_keys?: string[];
          show_measurements?: boolean;
          show_photos?: boolean;
          show_weight?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_summary_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      rehab_alert_events: {
        Row: {
          acknowledged_at: string | null;
          alert_type: Database["public"]["Enums"]["rehab_alert_type"];
          created_at: string;
          id: string;
          message_snapshot: string;
          rehab_session_id: string;
          rehab_set_id: string | null;
          severity: Database["public"]["Enums"]["rehab_restriction_severity"];
          user_id: string;
        };
        Insert: {
          acknowledged_at?: string | null;
          alert_type?: Database["public"]["Enums"]["rehab_alert_type"];
          created_at?: string;
          id?: string;
          message_snapshot: string;
          rehab_session_id: string;
          rehab_set_id?: string | null;
          severity?: Database["public"]["Enums"]["rehab_restriction_severity"];
          user_id: string;
        };
        Update: {
          acknowledged_at?: string | null;
          alert_type?: Database["public"]["Enums"]["rehab_alert_type"];
          created_at?: string;
          id?: string;
          message_snapshot?: string;
          rehab_session_id?: string;
          rehab_set_id?: string | null;
          severity?: Database["public"]["Enums"]["rehab_restriction_severity"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_alert_events_rehab_session_id_fkey";
            columns: ["rehab_session_id"];
            isOneToOne: false;
            referencedRelation: "rehab_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_alert_events_rehab_set_id_fkey";
            columns: ["rehab_set_id"];
            isOneToOne: false;
            referencedRelation: "rehab_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_alert_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_body_areas: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          stable_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          stable_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          stable_key?: string;
        };
        Relationships: [];
      };
      rehab_clinician_sources: {
        Row: {
          clinic_name: string | null;
          clinician_name: string | null;
          confirmed_by_user: boolean;
          created_at: string;
          document_date: string | null;
          document_title: string | null;
          id: string;
          notes: string | null;
          source_type: Database["public"]["Enums"]["rehab_clinician_source_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          clinic_name?: string | null;
          clinician_name?: string | null;
          confirmed_by_user?: boolean;
          created_at?: string;
          document_date?: string | null;
          document_title?: string | null;
          id?: string;
          notes?: string | null;
          source_type?: Database["public"]["Enums"]["rehab_clinician_source_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          clinic_name?: string | null;
          clinician_name?: string | null;
          confirmed_by_user?: boolean;
          created_at?: string;
          document_date?: string | null;
          document_title?: string | null;
          id?: string;
          notes?: string | null;
          source_type?: Database["public"]["Enums"]["rehab_clinician_source_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_clinician_sources_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_exercise_aliases: {
        Row: {
          alias: string;
          created_at: string;
          id: string;
          normalized_alias: string;
          rehab_exercise_definition_id: string;
          updated_at: string;
        };
        Insert: {
          alias: string;
          created_at?: string;
          id?: string;
          normalized_alias: string;
          rehab_exercise_definition_id: string;
          updated_at?: string;
        };
        Update: {
          alias?: string;
          created_at?: string;
          id?: string;
          normalized_alias?: string;
          rehab_exercise_definition_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_exercise_aliases_rehab_exercise_definition_id_fkey";
            columns: ["rehab_exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "rehab_exercise_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_exercise_definitions: {
        Row: {
          active: boolean;
          assistance_supported: boolean;
          bilateral: boolean;
          body_area_id: string | null;
          created_at: string;
          description: string | null;
          duration_supported: boolean;
          exercise_category: Database["public"]["Enums"]["rehab_exercise_category"];
          hold_supported: boolean;
          id: string;
          load_supported: boolean;
          movement_id: string | null;
          name: string;
          normalized_name: string;
          rom_tracking_supported: boolean;
          source: Database["public"]["Enums"]["rehab_exercise_source"];
          source_id: string | null;
          stable_key: string;
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          active?: boolean;
          assistance_supported?: boolean;
          bilateral?: boolean;
          body_area_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_supported?: boolean;
          exercise_category?: Database["public"]["Enums"]["rehab_exercise_category"];
          hold_supported?: boolean;
          id?: string;
          load_supported?: boolean;
          movement_id?: string | null;
          name: string;
          normalized_name: string;
          rom_tracking_supported?: boolean;
          source?: Database["public"]["Enums"]["rehab_exercise_source"];
          source_id?: string | null;
          stable_key: string;
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          active?: boolean;
          assistance_supported?: boolean;
          bilateral?: boolean;
          body_area_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_supported?: boolean;
          exercise_category?: Database["public"]["Enums"]["rehab_exercise_category"];
          hold_supported?: boolean;
          id?: string;
          load_supported?: boolean;
          movement_id?: string | null;
          name?: string;
          normalized_name?: string;
          rom_tracking_supported?: boolean;
          source?: Database["public"]["Enums"]["rehab_exercise_source"];
          source_id?: string | null;
          stable_key?: string;
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_exercise_definitions_body_area_id_fkey";
            columns: ["body_area_id"];
            isOneToOne: false;
            referencedRelation: "rehab_body_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_exercise_definitions_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "rehab_movements";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_movements: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          stable_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          stable_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          stable_key?: string;
        };
        Relationships: [];
      };
      rehab_plan_days: {
        Row: {
          created_at: string;
          day_index: number;
          description: string | null;
          estimated_duration_minutes: number | null;
          id: string;
          name: string;
          rehab_plan_phase_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_index?: number;
          description?: string | null;
          estimated_duration_minutes?: number | null;
          id?: string;
          name: string;
          rehab_plan_phase_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_index?: number;
          description?: string | null;
          estimated_duration_minutes?: number | null;
          id?: string;
          name?: string;
          rehab_plan_phase_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_plan_days_rehab_plan_phase_id_fkey";
            columns: ["rehab_plan_phase_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plan_phases";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_plan_exercises: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          instructions_snapshot: string;
          rehab_exercise_definition_id: string | null;
          rehab_plan_day_id: string;
          side: Database["public"]["Enums"]["rehab_side"];
          stop_conditions_snapshot: string;
          updated_at: string;
          user_rehab_exercise_id: string | null;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          instructions_snapshot?: string;
          rehab_exercise_definition_id?: string | null;
          rehab_plan_day_id: string;
          side?: Database["public"]["Enums"]["rehab_side"];
          stop_conditions_snapshot?: string;
          updated_at?: string;
          user_rehab_exercise_id?: string | null;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          instructions_snapshot?: string;
          rehab_exercise_definition_id?: string | null;
          rehab_plan_day_id?: string;
          side?: Database["public"]["Enums"]["rehab_side"];
          stop_conditions_snapshot?: string;
          updated_at?: string;
          user_rehab_exercise_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_plan_exercises_rehab_exercise_definition_id_fkey";
            columns: ["rehab_exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "rehab_exercise_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_plan_exercises_rehab_plan_day_id_fkey";
            columns: ["rehab_plan_day_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plan_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_plan_exercises_user_rehab_exercise_id_fkey";
            columns: ["user_rehab_exercise_id"];
            isOneToOne: false;
            referencedRelation: "user_rehab_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_plan_phases: {
        Row: {
          clinician_notes: string | null;
          created_at: string;
          display_order: number;
          end_date: string | null;
          id: string;
          name: string;
          phase_type: Database["public"]["Enums"]["rehab_phase_type"];
          rehab_plan_id: string;
          start_date: string | null;
          updated_at: string;
        };
        Insert: {
          clinician_notes?: string | null;
          created_at?: string;
          display_order?: number;
          end_date?: string | null;
          id?: string;
          name: string;
          phase_type?: Database["public"]["Enums"]["rehab_phase_type"];
          rehab_plan_id: string;
          start_date?: string | null;
          updated_at?: string;
        };
        Update: {
          clinician_notes?: string | null;
          created_at?: string;
          display_order?: number;
          end_date?: string | null;
          id?: string;
          name?: string;
          phase_type?: Database["public"]["Enums"]["rehab_phase_type"];
          rehab_plan_id?: string;
          start_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_plan_phases_rehab_plan_id_fkey";
            columns: ["rehab_plan_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_plans: {
        Row: {
          active: boolean;
          body_area_id: string | null;
          clinician_source_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          objective: string | null;
          side: Database["public"]["Enums"]["rehab_side"];
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          active?: boolean;
          body_area_id?: string | null;
          clinician_source_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          objective?: string | null;
          side?: Database["public"]["Enums"]["rehab_side"];
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          active?: boolean;
          body_area_id?: string | null;
          clinician_source_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          objective?: string | null;
          side?: Database["public"]["Enums"]["rehab_side"];
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_plans_body_area_id_fkey";
            columns: ["body_area_id"];
            isOneToOne: false;
            referencedRelation: "rehab_body_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_plans_clinician_source_id_fkey";
            columns: ["clinician_source_id"];
            isOneToOne: false;
            referencedRelation: "rehab_clinician_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_restrictions: {
        Row: {
          active: boolean;
          body_area_id: string | null;
          created_at: string;
          display_order: number;
          effective_from: string;
          effective_until: string | null;
          id: string;
          numeric_max: number | null;
          numeric_min: number | null;
          rehab_plan_id: string;
          restriction_type: Database["public"]["Enums"]["rehab_restriction_type"];
          severity: Database["public"]["Enums"]["rehab_restriction_severity"];
          side: Database["public"]["Enums"]["rehab_side"];
          source: string;
          unit: string | null;
          updated_at: string;
          value_text: string;
        };
        Insert: {
          active?: boolean;
          body_area_id?: string | null;
          created_at?: string;
          display_order?: number;
          effective_from?: string;
          effective_until?: string | null;
          id?: string;
          numeric_max?: number | null;
          numeric_min?: number | null;
          rehab_plan_id: string;
          restriction_type?: Database["public"]["Enums"]["rehab_restriction_type"];
          severity?: Database["public"]["Enums"]["rehab_restriction_severity"];
          side?: Database["public"]["Enums"]["rehab_side"];
          source?: string;
          unit?: string | null;
          updated_at?: string;
          value_text: string;
        };
        Update: {
          active?: boolean;
          body_area_id?: string | null;
          created_at?: string;
          display_order?: number;
          effective_from?: string;
          effective_until?: string | null;
          id?: string;
          numeric_max?: number | null;
          numeric_min?: number | null;
          rehab_plan_id?: string;
          restriction_type?: Database["public"]["Enums"]["rehab_restriction_type"];
          severity?: Database["public"]["Enums"]["rehab_restriction_severity"];
          side?: Database["public"]["Enums"]["rehab_side"];
          source?: string;
          unit?: string | null;
          updated_at?: string;
          value_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_restrictions_body_area_id_fkey";
            columns: ["body_area_id"];
            isOneToOne: false;
            referencedRelation: "rehab_body_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_restrictions_rehab_plan_id_fkey";
            columns: ["rehab_plan_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_session_exercises: {
        Row: {
          completed_at: string | null;
          created_at: string;
          exercise_name_snapshot: string;
          exercise_order: number;
          id: string;
          instructions_snapshot: string;
          notes: string | null;
          rehab_session_id: string;
          side: Database["public"]["Enums"]["rehab_side"];
          source_exercise_id: string | null;
          started_at: string | null;
          stop_conditions_snapshot: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          exercise_name_snapshot: string;
          exercise_order?: number;
          id?: string;
          instructions_snapshot?: string;
          notes?: string | null;
          rehab_session_id: string;
          side?: Database["public"]["Enums"]["rehab_side"];
          source_exercise_id?: string | null;
          started_at?: string | null;
          stop_conditions_snapshot?: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          exercise_name_snapshot?: string;
          exercise_order?: number;
          id?: string;
          instructions_snapshot?: string;
          notes?: string | null;
          rehab_session_id?: string;
          side?: Database["public"]["Enums"]["rehab_side"];
          source_exercise_id?: string | null;
          started_at?: string | null;
          stop_conditions_snapshot?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_session_exercises_rehab_session_id_fkey";
            columns: ["rehab_session_id"];
            isOneToOne: false;
            referencedRelation: "rehab_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_session_observations: {
        Row: {
          body_area: string | null;
          created_at: string;
          id: string;
          observation_type: Database["public"]["Enums"]["rehab_observation_type"];
          recorded_at: string;
          rehab_session_id: string;
          severity: Database["public"]["Enums"]["rehab_restriction_severity"];
          side: Database["public"]["Enums"]["rehab_side"];
          value_numeric: number | null;
          value_text: string | null;
        };
        Insert: {
          body_area?: string | null;
          created_at?: string;
          id?: string;
          observation_type?: Database["public"]["Enums"]["rehab_observation_type"];
          recorded_at?: string;
          rehab_session_id: string;
          severity?: Database["public"]["Enums"]["rehab_restriction_severity"];
          side?: Database["public"]["Enums"]["rehab_side"];
          value_numeric?: number | null;
          value_text?: string | null;
        };
        Update: {
          body_area?: string | null;
          created_at?: string;
          id?: string;
          observation_type?: Database["public"]["Enums"]["rehab_observation_type"];
          recorded_at?: string;
          rehab_session_id?: string;
          severity?: Database["public"]["Enums"]["rehab_restriction_severity"];
          side?: Database["public"]["Enums"]["rehab_side"];
          value_numeric?: number | null;
          value_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_session_observations_rehab_session_id_fkey";
            columns: ["rehab_session_id"];
            isOneToOne: false;
            referencedRelation: "rehab_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_sessions: {
        Row: {
          clinician_source_snapshot: Json;
          completed_at: string | null;
          created_at: string;
          daily_record_id: string;
          deleted_at: string | null;
          duration_seconds: number | null;
          id: string;
          restriction_snapshot_json: Json;
          scheduled_rehab_session_id: string | null;
          session_snapshot_json: Json;
          side: Database["public"]["Enums"]["rehab_side"];
          source_plan_day_id: string | null;
          source_plan_id: string | null;
          source_plan_version: number | null;
          started_at: string;
          status: Database["public"]["Enums"]["rehab_session_status"];
          title: string;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          clinician_source_snapshot?: Json;
          completed_at?: string | null;
          created_at?: string;
          daily_record_id: string;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          restriction_snapshot_json?: Json;
          scheduled_rehab_session_id?: string | null;
          session_snapshot_json?: Json;
          side?: Database["public"]["Enums"]["rehab_side"];
          source_plan_day_id?: string | null;
          source_plan_id?: string | null;
          source_plan_version?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["rehab_session_status"];
          title: string;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          clinician_source_snapshot?: Json;
          completed_at?: string | null;
          created_at?: string;
          daily_record_id?: string;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          restriction_snapshot_json?: Json;
          scheduled_rehab_session_id?: string | null;
          session_snapshot_json?: Json;
          side?: Database["public"]["Enums"]["rehab_side"];
          source_plan_day_id?: string | null;
          source_plan_id?: string | null;
          source_plan_version?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["rehab_session_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_sessions_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_sessions_scheduled_rehab_session_id_fkey";
            columns: ["scheduled_rehab_session_id"];
            isOneToOne: false;
            referencedRelation: "scheduled_rehab_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_sessions_source_plan_day_id_fkey";
            columns: ["source_plan_day_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plan_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_sessions_source_plan_id_fkey";
            columns: ["source_plan_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehab_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_set_prescriptions: {
        Row: {
          assistance_amount: string | null;
          assistance_type: string | null;
          completion_rule: Database["public"]["Enums"]["rehab_completion_rule"];
          created_at: string;
          id: string;
          notes: string | null;
          pain_limit: number | null;
          rehab_plan_exercise_id: string;
          rest_seconds: number | null;
          rom_max_degrees: number | null;
          rom_min_degrees: number | null;
          set_index: number;
          target_duration_seconds: number | null;
          target_hold_seconds: number | null;
          target_load: number | null;
          target_load_unit: string | null;
          target_reps: number | null;
          tempo_concentric_seconds: number | null;
          tempo_eccentric_seconds: number | null;
          tempo_pause_bottom_seconds: number | null;
          tempo_pause_top_seconds: number | null;
          updated_at: string;
        };
        Insert: {
          assistance_amount?: string | null;
          assistance_type?: string | null;
          completion_rule?: Database["public"]["Enums"]["rehab_completion_rule"];
          created_at?: string;
          id?: string;
          notes?: string | null;
          pain_limit?: number | null;
          rehab_plan_exercise_id: string;
          rest_seconds?: number | null;
          rom_max_degrees?: number | null;
          rom_min_degrees?: number | null;
          set_index?: number;
          target_duration_seconds?: number | null;
          target_hold_seconds?: number | null;
          target_load?: number | null;
          target_load_unit?: string | null;
          target_reps?: number | null;
          tempo_concentric_seconds?: number | null;
          tempo_eccentric_seconds?: number | null;
          tempo_pause_bottom_seconds?: number | null;
          tempo_pause_top_seconds?: number | null;
          updated_at?: string;
        };
        Update: {
          assistance_amount?: string | null;
          assistance_type?: string | null;
          completion_rule?: Database["public"]["Enums"]["rehab_completion_rule"];
          created_at?: string;
          id?: string;
          notes?: string | null;
          pain_limit?: number | null;
          rehab_plan_exercise_id?: string;
          rest_seconds?: number | null;
          rom_max_degrees?: number | null;
          rom_min_degrees?: number | null;
          set_index?: number;
          target_duration_seconds?: number | null;
          target_hold_seconds?: number | null;
          target_load?: number | null;
          target_load_unit?: string | null;
          target_reps?: number | null;
          tempo_concentric_seconds?: number | null;
          tempo_eccentric_seconds?: number | null;
          tempo_pause_bottom_seconds?: number | null;
          tempo_pause_top_seconds?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_set_prescriptions_rehab_plan_exercise_id_fkey";
            columns: ["rehab_plan_exercise_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plan_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      rehab_sets: {
        Row: {
          assistance_amount: string | null;
          assistance_type: string | null;
          completed_at: string | null;
          confidence: number | null;
          created_at: string;
          duration_seconds: number | null;
          hold_seconds: number | null;
          id: string;
          instability: Database["public"]["Enums"]["rehab_instability_level"] | null;
          load: number | null;
          load_unit: string | null;
          notes: string | null;
          pain_after: number | null;
          pain_before: number | null;
          pain_during: number | null;
          rehab_session_exercise_id: string;
          reps: number | null;
          rom_achieved: number | null;
          set_index: number;
          side: Database["public"]["Enums"]["rehab_side"];
          status: Database["public"]["Enums"]["rehab_set_status"];
          swelling: Database["public"]["Enums"]["rehab_swelling_level"] | null;
          tempo_snapshot: string | null;
          updated_at: string;
        };
        Insert: {
          assistance_amount?: string | null;
          assistance_type?: string | null;
          completed_at?: string | null;
          confidence?: number | null;
          created_at?: string;
          duration_seconds?: number | null;
          hold_seconds?: number | null;
          id?: string;
          instability?: Database["public"]["Enums"]["rehab_instability_level"] | null;
          load?: number | null;
          load_unit?: string | null;
          notes?: string | null;
          pain_after?: number | null;
          pain_before?: number | null;
          pain_during?: number | null;
          rehab_session_exercise_id: string;
          reps?: number | null;
          rom_achieved?: number | null;
          set_index?: number;
          side?: Database["public"]["Enums"]["rehab_side"];
          status?: Database["public"]["Enums"]["rehab_set_status"];
          swelling?: Database["public"]["Enums"]["rehab_swelling_level"] | null;
          tempo_snapshot?: string | null;
          updated_at?: string;
        };
        Update: {
          assistance_amount?: string | null;
          assistance_type?: string | null;
          completed_at?: string | null;
          confidence?: number | null;
          created_at?: string;
          duration_seconds?: number | null;
          hold_seconds?: number | null;
          id?: string;
          instability?: Database["public"]["Enums"]["rehab_instability_level"] | null;
          load?: number | null;
          load_unit?: string | null;
          notes?: string | null;
          pain_after?: number | null;
          pain_before?: number | null;
          pain_during?: number | null;
          rehab_session_exercise_id?: string;
          reps?: number | null;
          rom_achieved?: number | null;
          set_index?: number;
          side?: Database["public"]["Enums"]["rehab_side"];
          status?: Database["public"]["Enums"]["rehab_set_status"];
          swelling?: Database["public"]["Enums"]["rehab_swelling_level"] | null;
          tempo_snapshot?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehab_sets_rehab_session_exercise_id_fkey";
            columns: ["rehab_session_exercise_id"];
            isOneToOne: false;
            referencedRelation: "rehab_session_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_rehab_sessions: {
        Row: {
          created_at: string;
          id: string;
          local_date: string;
          rehab_plan_day_id: string | null;
          status: Database["public"]["Enums"]["scheduled_rehab_status"];
          timezone: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          local_date: string;
          rehab_plan_day_id?: string | null;
          status?: Database["public"]["Enums"]["scheduled_rehab_status"];
          timezone?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          local_date?: string;
          rehab_plan_day_id?: string | null;
          status?: Database["public"]["Enums"]["scheduled_rehab_status"];
          timezone?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_rehab_sessions_rehab_plan_day_id_fkey";
            columns: ["rehab_plan_day_id"];
            isOneToOne: false;
            referencedRelation: "rehab_plan_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_rehab_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_workouts: {
        Row: {
          created_at: string;
          id: string;
          local_date: string;
          notes: string | null;
          status: Database["public"]["Enums"]["scheduled_workout_status"];
          timezone: string;
          title: string;
          updated_at: string;
          user_id: string;
          workout_plan_day_id: string | null;
          workout_plan_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          local_date: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["scheduled_workout_status"];
          timezone?: string;
          title: string;
          updated_at?: string;
          user_id: string;
          workout_plan_day_id?: string | null;
          workout_plan_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          local_date?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["scheduled_workout_status"];
          timezone?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          workout_plan_day_id?: string | null;
          workout_plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_workouts_workout_plan_day_id_fkey";
            columns: ["workout_plan_day_id"];
            isOneToOne: false;
            referencedRelation: "workout_plan_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_workouts_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      sleep_sessions: {
        Row: {
          bedtime_at: string;
          created_at: string;
          deleted_at: string | null;
          duration_seconds: number;
          id: string;
          interruptions: number | null;
          nap: boolean;
          note: string | null;
          quality: Database["public"]["Enums"]["sleep_quality"] | null;
          sleep_date: string;
          source: Database["public"]["Enums"]["tracker_event_source"];
          timezone: string;
          updated_at: string;
          user_id: string;
          wake_at: string;
        };
        Insert: {
          bedtime_at: string;
          created_at?: string;
          deleted_at?: string | null;
          duration_seconds: number;
          id?: string;
          interruptions?: number | null;
          nap?: boolean;
          note?: string | null;
          quality?: Database["public"]["Enums"]["sleep_quality"] | null;
          sleep_date: string;
          source?: Database["public"]["Enums"]["tracker_event_source"];
          timezone?: string;
          updated_at?: string;
          user_id: string;
          wake_at: string;
        };
        Update: {
          bedtime_at?: string;
          created_at?: string;
          deleted_at?: string | null;
          duration_seconds?: number;
          id?: string;
          interruptions?: number | null;
          nap?: boolean;
          note?: string | null;
          quality?: Database["public"]["Enums"]["sleep_quality"] | null;
          sleep_date?: string;
          source?: Database["public"]["Enums"]["tracker_event_source"];
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          wake_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sleep_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      supplement_definitions: {
        Row: {
          active: boolean;
          created_at: string;
          default_unit: string | null;
          display_name: string;
          form: Database["public"]["Enums"]["supplement_form"];
          id: string;
          stable_key: string | null;
          system_owned: boolean;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          default_unit?: string | null;
          display_name: string;
          form?: Database["public"]["Enums"]["supplement_form"];
          id?: string;
          stable_key?: string | null;
          system_owned?: boolean;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          default_unit?: string | null;
          display_name?: string;
          form?: Database["public"]["Enums"]["supplement_form"];
          id?: string;
          stable_key?: string | null;
          system_owned?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      supplement_intakes: {
        Row: {
          amount: number | null;
          created_at: string;
          daily_record_id: string | null;
          deleted_at: string | null;
          id: string;
          local_date: string;
          note: string | null;
          status: Database["public"]["Enums"]["supplement_intake_status"];
          taken_at: string;
          unit: string | null;
          updated_at: string;
          user_id: string;
          user_supplement_id: string;
        };
        Insert: {
          amount?: number | null;
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          local_date: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["supplement_intake_status"];
          taken_at?: string;
          unit?: string | null;
          updated_at?: string;
          user_id: string;
          user_supplement_id: string;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          local_date?: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["supplement_intake_status"];
          taken_at?: string;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
          user_supplement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplement_intakes_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplement_intakes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplement_intakes_user_supplement_id_fkey";
            columns: ["user_supplement_id"];
            isOneToOne: false;
            referencedRelation: "user_supplements";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_daily_summaries: {
        Row: {
          calculated_at: string;
          completed: boolean;
          created_at: string;
          event_count: number;
          id: string;
          local_date: string;
          target_snapshot_json: Json;
          total_duration_seconds: number | null;
          total_numeric: number | null;
          updated_at: string;
          user_id: string;
          user_tracker_id: string;
        };
        Insert: {
          calculated_at?: string;
          completed?: boolean;
          created_at?: string;
          event_count?: number;
          id?: string;
          local_date: string;
          target_snapshot_json?: Json;
          total_duration_seconds?: number | null;
          total_numeric?: number | null;
          updated_at?: string;
          user_id: string;
          user_tracker_id: string;
        };
        Update: {
          calculated_at?: string;
          completed?: boolean;
          created_at?: string;
          event_count?: number;
          id?: string;
          local_date?: string;
          target_snapshot_json?: Json;
          total_duration_seconds?: number | null;
          total_numeric?: number | null;
          updated_at?: string;
          user_id?: string;
          user_tracker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_daily_summaries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_daily_summaries_user_tracker_id_fkey";
            columns: ["user_tracker_id"];
            isOneToOne: false;
            referencedRelation: "user_trackers";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_definitions: {
        Row: {
          active: boolean;
          created_at: string;
          default_unit: string | null;
          description: string | null;
          display_name: string;
          display_order: number;
          id: string;
          stable_key: string;
          supports_duration: boolean;
          supports_multiple_events: boolean;
          supports_streak: boolean;
          supports_target: boolean;
          tracker_type: Database["public"]["Enums"]["tracker_type"];
          updated_at: string;
          value_type: Database["public"]["Enums"]["tracker_value_type"];
          visual_variant: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          default_unit?: string | null;
          description?: string | null;
          display_name: string;
          display_order?: number;
          id?: string;
          stable_key: string;
          supports_duration?: boolean;
          supports_multiple_events?: boolean;
          supports_streak?: boolean;
          supports_target?: boolean;
          tracker_type: Database["public"]["Enums"]["tracker_type"];
          updated_at?: string;
          value_type: Database["public"]["Enums"]["tracker_value_type"];
          visual_variant?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          default_unit?: string | null;
          description?: string | null;
          display_name?: string;
          display_order?: number;
          id?: string;
          stable_key?: string;
          supports_duration?: boolean;
          supports_multiple_events?: boolean;
          supports_streak?: boolean;
          supports_target?: boolean;
          tracker_type?: Database["public"]["Enums"]["tracker_type"];
          updated_at?: string;
          value_type?: Database["public"]["Enums"]["tracker_value_type"];
          visual_variant?: string;
        };
        Relationships: [];
      };
      tracker_events: {
        Row: {
          created_at: string;
          daily_record_id: string | null;
          deleted_at: string | null;
          duration_seconds: number | null;
          id: string;
          local_date: string;
          note: string | null;
          occurred_at: string;
          source: Database["public"]["Enums"]["tracker_event_source"];
          timezone: string;
          unit: string | null;
          updated_at: string;
          user_id: string;
          user_tracker_id: string;
          value_boolean: boolean | null;
          value_numeric: number | null;
          value_text: string | null;
        };
        Insert: {
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          local_date: string;
          note?: string | null;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["tracker_event_source"];
          timezone?: string;
          unit?: string | null;
          updated_at?: string;
          user_id: string;
          user_tracker_id: string;
          value_boolean?: boolean | null;
          value_numeric?: number | null;
          value_text?: string | null;
        };
        Update: {
          created_at?: string;
          daily_record_id?: string | null;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          local_date?: string;
          note?: string | null;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["tracker_event_source"];
          timezone?: string;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
          user_tracker_id?: string;
          value_boolean?: boolean | null;
          value_numeric?: number | null;
          value_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_events_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_events_user_tracker_id_fkey";
            columns: ["user_tracker_id"];
            isOneToOne: false;
            referencedRelation: "user_trackers";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_reminders: {
        Row: {
          created_at: string;
          days_of_week: number[];
          enabled: boolean;
          id: string;
          local_time: string;
          reminder_type: Database["public"]["Enums"]["tracker_reminder_type"];
          timezone: string;
          updated_at: string;
          user_id: string;
          user_supplement_id: string | null;
          user_tracker_id: string | null;
        };
        Insert: {
          created_at?: string;
          days_of_week?: number[];
          enabled?: boolean;
          id?: string;
          local_time: string;
          reminder_type?: Database["public"]["Enums"]["tracker_reminder_type"];
          timezone?: string;
          updated_at?: string;
          user_id: string;
          user_supplement_id?: string | null;
          user_tracker_id?: string | null;
        };
        Update: {
          created_at?: string;
          days_of_week?: number[];
          enabled?: boolean;
          id?: string;
          local_time?: string;
          reminder_type?: Database["public"]["Enums"]["tracker_reminder_type"];
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          user_supplement_id?: string | null;
          user_tracker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_reminders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_reminders_user_supplement_id_fkey";
            columns: ["user_supplement_id"];
            isOneToOne: false;
            referencedRelation: "user_supplements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_reminders_user_tracker_id_fkey";
            columns: ["user_tracker_id"];
            isOneToOne: false;
            referencedRelation: "user_trackers";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_streaks: {
        Row: {
          calculated_at: string;
          created_at: string;
          current_streak: number;
          id: string;
          last_completed_date: string | null;
          longest_streak: number;
          updated_at: string;
          user_id: string;
          user_tracker_id: string;
        };
        Insert: {
          calculated_at?: string;
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_completed_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id: string;
          user_tracker_id: string;
        };
        Update: {
          calculated_at?: string;
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_completed_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id?: string;
          user_tracker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_streaks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_streaks_user_tracker_id_fkey";
            columns: ["user_tracker_id"];
            isOneToOne: true;
            referencedRelation: "user_trackers";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_targets: {
        Row: {
          confirmed_by_user: boolean;
          created_at: string;
          days_of_week: number[] | null;
          effective_from: string;
          effective_until: string | null;
          id: string;
          target_frequency: Database["public"]["Enums"]["tracker_target_frequency"];
          target_max: number | null;
          target_min: number | null;
          target_unit: string | null;
          target_value: number | null;
          updated_at: string;
          user_tracker_id: string;
        };
        Insert: {
          confirmed_by_user?: boolean;
          created_at?: string;
          days_of_week?: number[] | null;
          effective_from: string;
          effective_until?: string | null;
          id?: string;
          target_frequency?: Database["public"]["Enums"]["tracker_target_frequency"];
          target_max?: number | null;
          target_min?: number | null;
          target_unit?: string | null;
          target_value?: number | null;
          updated_at?: string;
          user_tracker_id: string;
        };
        Update: {
          confirmed_by_user?: boolean;
          created_at?: string;
          days_of_week?: number[] | null;
          effective_from?: string;
          effective_until?: string | null;
          id?: string;
          target_frequency?: Database["public"]["Enums"]["tracker_target_frequency"];
          target_max?: number | null;
          target_min?: number | null;
          target_unit?: string | null;
          target_value?: number | null;
          updated_at?: string;
          user_tracker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_targets_user_tracker_id_fkey";
            columns: ["user_tracker_id"];
            isOneToOne: false;
            referencedRelation: "user_trackers";
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
      user_exercises: {
        Row: {
          created_at: string;
          custom_name: string | null;
          custom_video_url: string | null;
          exercise_definition_id: string | null;
          id: string;
          private_notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          custom_name?: string | null;
          custom_video_url?: string | null;
          exercise_definition_id?: string | null;
          id?: string;
          private_notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_name?: string | null;
          custom_video_url?: string | null;
          exercise_definition_id?: string | null;
          id?: string;
          private_notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_exercises_exercise_definition_id_fkey";
            columns: ["exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "exercise_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_exercises_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_measurement_definitions: {
        Row: {
          created_at: string;
          custom_name: string | null;
          display_order: number;
          enabled: boolean;
          id: string;
          measurement_definition_id: string | null;
          side_mode: Database["public"]["Enums"]["measurement_side_mode"];
          unit: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          custom_name?: string | null;
          display_order?: number;
          enabled?: boolean;
          id?: string;
          measurement_definition_id?: string | null;
          side_mode?: Database["public"]["Enums"]["measurement_side_mode"];
          unit: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_name?: string | null;
          display_order?: number;
          enabled?: boolean;
          id?: string;
          measurement_definition_id?: string | null;
          side_mode?: Database["public"]["Enums"]["measurement_side_mode"];
          unit?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_measurement_definitions_measurement_definition_id_fkey";
            columns: ["measurement_definition_id"];
            isOneToOne: false;
            referencedRelation: "measurement_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_measurement_definitions_user_id_fkey";
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
      user_rehab_exercises: {
        Row: {
          created_at: string;
          custom_name: string | null;
          id: string;
          instructions: string | null;
          private_video_path: string | null;
          rehab_exercise_definition_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          instructions?: string | null;
          private_video_path?: string | null;
          rehab_exercise_definition_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          instructions?: string | null;
          private_video_path?: string | null;
          rehab_exercise_definition_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_rehab_exercises_rehab_exercise_definition_id_fkey";
            columns: ["rehab_exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "rehab_exercise_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_rehab_exercises_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_supplements: {
        Row: {
          active: boolean;
          brand: string | null;
          created_at: string;
          custom_name: string | null;
          id: string;
          instructions_text: string | null;
          serving_amount: number | null;
          serving_unit: string | null;
          supplement_definition_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          brand?: string | null;
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          instructions_text?: string | null;
          serving_amount?: number | null;
          serving_unit?: string | null;
          supplement_definition_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          brand?: string | null;
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          instructions_text?: string | null;
          serving_amount?: number | null;
          serving_unit?: string | null;
          supplement_definition_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_supplements_supplement_definition_id_fkey";
            columns: ["supplement_definition_id"];
            isOneToOne: false;
            referencedRelation: "supplement_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_supplements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_trackers: {
        Row: {
          archived_at: string | null;
          color_token: string | null;
          created_at: string;
          custom_description: string | null;
          custom_name: string | null;
          display_order: number;
          enabled: boolean;
          icon_key: string | null;
          id: string;
          tracker_definition_id: string | null;
          unit: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          color_token?: string | null;
          created_at?: string;
          custom_description?: string | null;
          custom_name?: string | null;
          display_order?: number;
          enabled?: boolean;
          icon_key?: string | null;
          id?: string;
          tracker_definition_id?: string | null;
          unit?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          color_token?: string | null;
          created_at?: string;
          custom_description?: string | null;
          custom_name?: string | null;
          display_order?: number;
          enabled?: boolean;
          icon_key?: string | null;
          id?: string;
          tracker_definition_id?: string | null;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_trackers_tracker_definition_id_fkey";
            columns: ["tracker_definition_id"];
            isOneToOne: false;
            referencedRelation: "tracker_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_trackers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_block_exercises: {
        Row: {
          created_at: string;
          exercise_definition_id: string | null;
          id: string;
          notes: string | null;
          sort_order: number;
          updated_at: string;
          user_exercise_id: string | null;
          workout_block_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_definition_id?: string | null;
          id?: string;
          notes?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_exercise_id?: string | null;
          workout_block_id: string;
        };
        Update: {
          created_at?: string;
          exercise_definition_id?: string | null;
          id?: string;
          notes?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_exercise_id?: string | null;
          workout_block_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_block_exercises_exercise_definition_id_fkey";
            columns: ["exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "exercise_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_block_exercises_user_exercise_id_fkey";
            columns: ["user_exercise_id"];
            isOneToOne: false;
            referencedRelation: "user_exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_block_exercises_workout_block_id_fkey";
            columns: ["workout_block_id"];
            isOneToOne: false;
            referencedRelation: "workout_blocks";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["workout_block_type"];
          created_at: string;
          id: string;
          notes: string | null;
          rest_seconds: number | null;
          rounds: number | null;
          sort_order: number;
          title: string | null;
          transition_seconds: number | null;
          updated_at: string;
          workout_plan_day_id: string;
        };
        Insert: {
          block_type?: Database["public"]["Enums"]["workout_block_type"];
          created_at?: string;
          id?: string;
          notes?: string | null;
          rest_seconds?: number | null;
          rounds?: number | null;
          sort_order?: number;
          title?: string | null;
          transition_seconds?: number | null;
          updated_at?: string;
          workout_plan_day_id: string;
        };
        Update: {
          block_type?: Database["public"]["Enums"]["workout_block_type"];
          created_at?: string;
          id?: string;
          notes?: string | null;
          rest_seconds?: number | null;
          rounds?: number | null;
          sort_order?: number;
          title?: string | null;
          transition_seconds?: number | null;
          updated_at?: string;
          workout_plan_day_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_blocks_workout_plan_day_id_fkey";
            columns: ["workout_plan_day_id"];
            isOneToOne: false;
            referencedRelation: "workout_plan_days";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plan_days: {
        Row: {
          created_at: string;
          day_of_week: number | null;
          id: string;
          name: string;
          notes: string | null;
          rest_day: boolean;
          sort_order: number;
          updated_at: string;
          workout_plan_id: string;
        };
        Insert: {
          created_at?: string;
          day_of_week?: number | null;
          id?: string;
          name?: string;
          notes?: string | null;
          rest_day?: boolean;
          sort_order?: number;
          updated_at?: string;
          workout_plan_id: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number | null;
          id?: string;
          name?: string;
          notes?: string | null;
          rest_day?: boolean;
          sort_order?: number;
          updated_at?: string;
          workout_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plan_days_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: {
          active: boolean;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          objective: string | null;
          source: string;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          objective?: string | null;
          source?: string;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          objective?: string | null;
          source?: string;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_session_exercises: {
        Row: {
          block_order: number;
          block_type_snapshot: string | null;
          completed_at: string | null;
          created_at: string;
          display_name_snapshot: string;
          exercise_definition_id: string | null;
          exercise_order: number;
          id: string;
          notes: string | null;
          sort_order: number;
          started_at: string | null;
          updated_at: string;
          user_exercise_id: string | null;
          workout_session_id: string;
        };
        Insert: {
          block_order?: number;
          block_type_snapshot?: string | null;
          completed_at?: string | null;
          created_at?: string;
          display_name_snapshot: string;
          exercise_definition_id?: string | null;
          exercise_order?: number;
          id?: string;
          notes?: string | null;
          sort_order?: number;
          started_at?: string | null;
          updated_at?: string;
          user_exercise_id?: string | null;
          workout_session_id: string;
        };
        Update: {
          block_order?: number;
          block_type_snapshot?: string | null;
          completed_at?: string | null;
          created_at?: string;
          display_name_snapshot?: string;
          exercise_definition_id?: string | null;
          exercise_order?: number;
          id?: string;
          notes?: string | null;
          sort_order?: number;
          started_at?: string | null;
          updated_at?: string;
          user_exercise_id?: string | null;
          workout_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_session_exercises_exercise_definition_id_fkey";
            columns: ["exercise_definition_id"];
            isOneToOne: false;
            referencedRelation: "exercise_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_session_exercises_user_exercise_id_fkey";
            columns: ["user_exercise_id"];
            isOneToOne: false;
            referencedRelation: "user_exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_session_exercises_workout_session_id_fkey";
            columns: ["workout_session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_session_notes: {
        Row: {
          body: string;
          body_area: string | null;
          created_at: string;
          id: string;
          note_type: string;
          updated_at: string;
          user_id: string;
          value_text: string | null;
          workout_session_id: string;
        };
        Insert: {
          body: string;
          body_area?: string | null;
          created_at?: string;
          id?: string;
          note_type?: string;
          updated_at?: string;
          user_id: string;
          value_text?: string | null;
          workout_session_id: string;
        };
        Update: {
          body?: string;
          body_area?: string | null;
          created_at?: string;
          id?: string;
          note_type?: string;
          updated_at?: string;
          user_id?: string;
          value_text?: string | null;
          workout_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_session_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_session_notes_workout_session_id_fkey";
            columns: ["workout_session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          daily_record_id: string;
          duration_seconds: number | null;
          id: string;
          notes: string | null;
          scheduled_workout_id: string | null;
          session_rpe: number | null;
          snapshot_json: Json;
          source_plan_version: number | null;
          started_at: string;
          status: Database["public"]["Enums"]["workout_session_status"];
          title: string;
          total_volume: number | null;
          updated_at: string;
          user_id: string;
          version: number;
          workout_plan_day_id: string | null;
          workout_plan_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          daily_record_id: string;
          duration_seconds?: number | null;
          id?: string;
          notes?: string | null;
          scheduled_workout_id?: string | null;
          session_rpe?: number | null;
          snapshot_json?: Json;
          source_plan_version?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["workout_session_status"];
          title?: string;
          total_volume?: number | null;
          updated_at?: string;
          user_id: string;
          version?: number;
          workout_plan_day_id?: string | null;
          workout_plan_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          daily_record_id?: string;
          duration_seconds?: number | null;
          id?: string;
          notes?: string | null;
          scheduled_workout_id?: string | null;
          session_rpe?: number | null;
          snapshot_json?: Json;
          source_plan_version?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["workout_session_status"];
          title?: string;
          total_volume?: number | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
          workout_plan_day_id?: string | null;
          workout_plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_daily_record_id_fkey";
            columns: ["daily_record_id"];
            isOneToOne: false;
            referencedRelation: "daily_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_scheduled_workout_id_fkey";
            columns: ["scheduled_workout_id"];
            isOneToOne: false;
            referencedRelation: "scheduled_workouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_workout_plan_day_id_fkey";
            columns: ["workout_plan_day_id"];
            isOneToOne: false;
            referencedRelation: "workout_plan_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_set_prescriptions: {
        Row: {
          completion_rule: Database["public"]["Enums"]["workout_set_completion_rule"];
          created_at: string;
          id: string;
          notes: string | null;
          rest_seconds: number | null;
          set_index: number;
          set_role: Database["public"]["Enums"]["workout_set_role"];
          target_distance_meters: number | null;
          target_duration_seconds: number | null;
          target_reps_max: number | null;
          target_reps_min: number | null;
          target_rir: number | null;
          target_rpe: number | null;
          target_weight_kg: number | null;
          tempo_concentric_seconds: number | null;
          tempo_eccentric_seconds: number | null;
          tempo_pause_bottom_seconds: number | null;
          tempo_pause_top_seconds: number | null;
          updated_at: string;
          workout_block_exercise_id: string;
        };
        Insert: {
          completion_rule?: Database["public"]["Enums"]["workout_set_completion_rule"];
          created_at?: string;
          id?: string;
          notes?: string | null;
          rest_seconds?: number | null;
          set_index?: number;
          set_role?: Database["public"]["Enums"]["workout_set_role"];
          target_distance_meters?: number | null;
          target_duration_seconds?: number | null;
          target_reps_max?: number | null;
          target_reps_min?: number | null;
          target_rir?: number | null;
          target_rpe?: number | null;
          target_weight_kg?: number | null;
          tempo_concentric_seconds?: number | null;
          tempo_eccentric_seconds?: number | null;
          tempo_pause_bottom_seconds?: number | null;
          tempo_pause_top_seconds?: number | null;
          updated_at?: string;
          workout_block_exercise_id: string;
        };
        Update: {
          completion_rule?: Database["public"]["Enums"]["workout_set_completion_rule"];
          created_at?: string;
          id?: string;
          notes?: string | null;
          rest_seconds?: number | null;
          set_index?: number;
          set_role?: Database["public"]["Enums"]["workout_set_role"];
          target_distance_meters?: number | null;
          target_duration_seconds?: number | null;
          target_reps_max?: number | null;
          target_reps_min?: number | null;
          target_rir?: number | null;
          target_rpe?: number | null;
          target_weight_kg?: number | null;
          tempo_concentric_seconds?: number | null;
          tempo_eccentric_seconds?: number | null;
          tempo_pause_bottom_seconds?: number | null;
          tempo_pause_top_seconds?: number | null;
          updated_at?: string;
          workout_block_exercise_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_set_prescriptions_workout_block_exercise_id_fkey";
            columns: ["workout_block_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_block_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sets: {
        Row: {
          completed_at: string | null;
          created_at: string;
          distance_meters: number | null;
          distance_unit: string | null;
          duration_seconds: number | null;
          id: string;
          load_unit: string;
          notes: string | null;
          reps: number | null;
          rest_seconds_actual: number | null;
          rir: number | null;
          rpe: number | null;
          set_index: number;
          set_role: Database["public"]["Enums"]["workout_set_role"];
          status: Database["public"]["Enums"]["workout_set_status"];
          tempo_snapshot: string | null;
          updated_at: string;
          weight_kg: number | null;
          workout_session_exercise_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          distance_meters?: number | null;
          distance_unit?: string | null;
          duration_seconds?: number | null;
          id?: string;
          load_unit?: string;
          notes?: string | null;
          reps?: number | null;
          rest_seconds_actual?: number | null;
          rir?: number | null;
          rpe?: number | null;
          set_index?: number;
          set_role?: Database["public"]["Enums"]["workout_set_role"];
          status?: Database["public"]["Enums"]["workout_set_status"];
          tempo_snapshot?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
          workout_session_exercise_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          distance_meters?: number | null;
          distance_unit?: string | null;
          duration_seconds?: number | null;
          id?: string;
          load_unit?: string;
          notes?: string | null;
          reps?: number | null;
          rest_seconds_actual?: number | null;
          rir?: number | null;
          rpe?: number | null;
          set_index?: number;
          set_role?: Database["public"]["Enums"]["workout_set_role"];
          status?: Database["public"]["Enums"]["workout_set_status"];
          tempo_snapshot?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
          workout_session_exercise_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_session_exercise_id_fkey";
            columns: ["workout_session_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_session_exercises";
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
      archive_rehab_plan: {
        Args: { p_expected_version: number; p_plan_id: string };
        Returns: {
          active: boolean;
          body_area_id: string | null;
          clinician_source_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          objective: string | null;
          side: Database["public"]["Enums"]["rehab_side"];
          updated_at: string;
          user_id: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "rehab_plans";
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
      execute_account_domain_purge: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      recalculate_tracker_daily_summary: {
        Args: { p_local_date: string; p_user_tracker_id: string };
        Returns: undefined;
      };
      request_account_deletion: {
        Args: never;
        Returns: {
          cleanup_detail: Json;
          cleanup_stage: string | null;
          completed_at: string | null;
          confirmation_phrase: string;
          created_at: string;
          id: string;
          last_error: string | null;
          requested_at: string;
          scheduled_purge_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "account_deletion_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
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
      exercise_muscle_role: "primary" | "secondary" | "stabilizer";
      exercise_source: "mtfbwu_curated" | "free_exercise_db" | "other";
      exercise_type:
        | "strength"
        | "cardio"
        | "mobility"
        | "plyometric"
        | "isometric"
        | "balance"
        | "conditioning"
        | "other"
        | "hypertrophy"
        | "skill"
        | "custom"
        | "bodyweight";
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
      measurement_category:
        "weight" | "circumference" | "width" | "composition" | "custom";
      measurement_side_mode: "not_applicable" | "left_right" | "single_value";
      measurement_value_side: "left" | "right" | "not_applicable";
      meditation_type:
        | "breathing"
        | "mindfulness"
        | "body_scan"
        | "guided"
        | "mantra"
        | "visualization"
        | "walking"
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
      progress_comparison_type: "photo" | "weight" | "measurement" | "mixed";
      progress_date_range: "7d" | "30d" | "90d" | "180d" | "365d" | "all";
      progress_note_type: "general" | "weight" | "measurement" | "photo" | "milestone";
      progress_photo_slot: "front" | "side_left" | "side_right" | "back" | "custom";
      progress_record_source: "manual" | "imported_future" | "device_future";
      rehab_alert_type:
        | "pain_threshold"
        | "severe_swelling"
        | "severe_instability"
        | "stop_condition"
        | "user_stopped_set"
        | "other";
      rehab_clinician_source_type:
        | "physiotherapist"
        | "orthopedic"
        | "sports_medicine"
        | "trainer"
        | "self_entered"
        | "document"
        | "other";
      rehab_completion_rule: "exact" | "range" | "duration" | "hold" | "manual";
      rehab_exercise_category:
        | "mobility"
        | "activation"
        | "control"
        | "strength"
        | "balance"
        | "proprioception"
        | "isometric"
        | "stretching"
        | "gait"
        | "conditioning"
        | "custom";
      rehab_exercise_source: "mtfbwu_curated" | "other";
      rehab_instability_level: "none" | "slight" | "moderate" | "severe";
      rehab_observation_type:
        | "pain"
        | "swelling"
        | "instability"
        | "stiffness"
        | "confidence"
        | "fatigue"
        | "range"
        | "general";
      rehab_phase_type:
        | "protection"
        | "mobility"
        | "activation"
        | "strength"
        | "control"
        | "return_to_activity"
        | "custom";
      rehab_restriction_severity: "informational" | "caution" | "stop";
      rehab_restriction_type:
        | "load_limit"
        | "range_limit"
        | "movement_avoidance"
        | "assistance_required"
        | "weight_bearing"
        | "frequency_limit"
        | "stop_condition"
        | "clinician_instruction"
        | "custom";
      rehab_session_status: "in_progress" | "paused" | "completed" | "discarded";
      rehab_set_status: "pending" | "completed" | "skipped" | "stopped" | "partial";
      rehab_side: "left" | "right" | "bilateral" | "not_applicable";
      rehab_swelling_level: "none" | "mild" | "moderate" | "severe";
      scheduled_rehab_status:
        "planned" | "started" | "completed" | "skipped" | "cancelled";
      scheduled_workout_status:
        | "planned"
        | "completed"
        | "skipped"
        | "missed"
        | "rescheduled"
        | "started"
        | "cancelled";
      sleep_quality: "very_poor" | "poor" | "fair" | "good" | "very_good";
      supplement_form:
        "tablet" | "capsule" | "powder" | "liquid" | "sachet" | "gummy" | "other";
      supplement_intake_status: "taken" | "skipped" | "partial";
      tracker_event_source: "manual" | "imported_future" | "device_future";
      tracker_reminder_type: "tracker" | "supplement" | "bedtime" | "wake" | "custom";
      tracker_target_frequency: "daily" | "weekly" | "selected_days" | "as_needed";
      tracker_type:
        | "hydration"
        | "meditation"
        | "sleep"
        | "supplement"
        | "numeric"
        | "duration"
        | "boolean"
        | "count"
        | "text"
        | "custom";
      tracker_value_type:
        "amount" | "duration" | "count" | "boolean" | "time_range" | "text";
      units_system: "metric" | "imperial";
      workout_block_type:
        | "warmup"
        | "straight_sets"
        | "superset"
        | "circuit"
        | "amrap"
        | "emom"
        | "for_time"
        | "drop_set"
        | "cooldown"
        | "triset"
        | "stripping_set"
        | "one_to_ten"
        | "cardio"
        | "mobility"
        | "custom";
      workout_session_status: "in_progress" | "paused" | "completed" | "discarded";
      workout_set_completion_rule:
        | "fixed_reps"
        | "rep_range"
        | "time_based"
        | "distance_based"
        | "amrap_to_failure"
        | "exact"
        | "range"
        | "amrap"
        | "to_failure"
        | "max_effort"
        | "duration"
        | "distance"
        | "manual";
      workout_set_role:
        | "warmup"
        | "working"
        | "top_set"
        | "backoff"
        | "drop_set"
        | "amrap"
        | "drop"
        | "max_effort"
        | "failure"
        | "timed_hold"
        | "technique";
      workout_set_status: "pending" | "completed" | "skipped" | "failed" | "partial";
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
      exercise_muscle_role: ["primary", "secondary", "stabilizer"],
      exercise_source: ["mtfbwu_curated", "free_exercise_db", "other"],
      exercise_type: [
        "strength",
        "cardio",
        "mobility",
        "plyometric",
        "isometric",
        "balance",
        "conditioning",
        "other",
        "hypertrophy",
        "skill",
        "custom",
        "bodyweight",
      ],
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
      measurement_category: ["weight", "circumference", "width", "composition", "custom"],
      measurement_side_mode: ["not_applicable", "left_right", "single_value"],
      measurement_value_side: ["left", "right", "not_applicable"],
      meditation_type: [
        "breathing",
        "mindfulness",
        "body_scan",
        "guided",
        "mantra",
        "visualization",
        "walking",
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
      progress_comparison_type: ["photo", "weight", "measurement", "mixed"],
      progress_date_range: ["7d", "30d", "90d", "180d", "365d", "all"],
      progress_note_type: ["general", "weight", "measurement", "photo", "milestone"],
      progress_photo_slot: ["front", "side_left", "side_right", "back", "custom"],
      progress_record_source: ["manual", "imported_future", "device_future"],
      rehab_alert_type: [
        "pain_threshold",
        "severe_swelling",
        "severe_instability",
        "stop_condition",
        "user_stopped_set",
        "other",
      ],
      rehab_clinician_source_type: [
        "physiotherapist",
        "orthopedic",
        "sports_medicine",
        "trainer",
        "self_entered",
        "document",
        "other",
      ],
      rehab_completion_rule: ["exact", "range", "duration", "hold", "manual"],
      rehab_exercise_category: [
        "mobility",
        "activation",
        "control",
        "strength",
        "balance",
        "proprioception",
        "isometric",
        "stretching",
        "gait",
        "conditioning",
        "custom",
      ],
      rehab_exercise_source: ["mtfbwu_curated", "other"],
      rehab_instability_level: ["none", "slight", "moderate", "severe"],
      rehab_observation_type: [
        "pain",
        "swelling",
        "instability",
        "stiffness",
        "confidence",
        "fatigue",
        "range",
        "general",
      ],
      rehab_phase_type: [
        "protection",
        "mobility",
        "activation",
        "strength",
        "control",
        "return_to_activity",
        "custom",
      ],
      rehab_restriction_severity: ["informational", "caution", "stop"],
      rehab_restriction_type: [
        "load_limit",
        "range_limit",
        "movement_avoidance",
        "assistance_required",
        "weight_bearing",
        "frequency_limit",
        "stop_condition",
        "clinician_instruction",
        "custom",
      ],
      rehab_session_status: ["in_progress", "paused", "completed", "discarded"],
      rehab_set_status: ["pending", "completed", "skipped", "stopped", "partial"],
      rehab_side: ["left", "right", "bilateral", "not_applicable"],
      rehab_swelling_level: ["none", "mild", "moderate", "severe"],
      scheduled_rehab_status: ["planned", "started", "completed", "skipped", "cancelled"],
      scheduled_workout_status: [
        "planned",
        "completed",
        "skipped",
        "missed",
        "rescheduled",
        "started",
        "cancelled",
      ],
      sleep_quality: ["very_poor", "poor", "fair", "good", "very_good"],
      supplement_form: [
        "tablet",
        "capsule",
        "powder",
        "liquid",
        "sachet",
        "gummy",
        "other",
      ],
      supplement_intake_status: ["taken", "skipped", "partial"],
      tracker_event_source: ["manual", "imported_future", "device_future"],
      tracker_reminder_type: ["tracker", "supplement", "bedtime", "wake", "custom"],
      tracker_target_frequency: ["daily", "weekly", "selected_days", "as_needed"],
      tracker_type: [
        "hydration",
        "meditation",
        "sleep",
        "supplement",
        "numeric",
        "duration",
        "boolean",
        "count",
        "text",
        "custom",
      ],
      tracker_value_type: [
        "amount",
        "duration",
        "count",
        "boolean",
        "time_range",
        "text",
      ],
      units_system: ["metric", "imperial"],
      workout_block_type: [
        "warmup",
        "straight_sets",
        "superset",
        "circuit",
        "amrap",
        "emom",
        "for_time",
        "drop_set",
        "cooldown",
        "triset",
        "stripping_set",
        "one_to_ten",
        "cardio",
        "mobility",
        "custom",
      ],
      workout_session_status: ["in_progress", "paused", "completed", "discarded"],
      workout_set_completion_rule: [
        "fixed_reps",
        "rep_range",
        "time_based",
        "distance_based",
        "amrap_to_failure",
        "exact",
        "range",
        "amrap",
        "to_failure",
        "max_effort",
        "duration",
        "distance",
        "manual",
      ],
      workout_set_role: [
        "warmup",
        "working",
        "top_set",
        "backoff",
        "drop_set",
        "amrap",
        "drop",
        "max_effort",
        "failure",
        "timed_hold",
        "technique",
      ],
      workout_set_status: ["pending", "completed", "skipped", "failed", "partial"],
    },
  },
} as const;
