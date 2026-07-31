/**
 * Supabase Database types.
 * Canonical schema: `database.types.ts` (regenerate via `supabase gen types typescript --local`).
 * Convenience Row/Enum aliases below are hand-maintained.
 */

export type {
  Json,
  Database,
  Constants,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "./database.types";

import type { Database } from "./database.types";

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
export type ExerciseType = Database["public"]["Enums"]["exercise_type"];
export type ExerciseSource = Database["public"]["Enums"]["exercise_source"];
export type ExerciseMuscleRole = Database["public"]["Enums"]["exercise_muscle_role"];
export type WorkoutBlockType = Database["public"]["Enums"]["workout_block_type"];
export type WorkoutSetRole = Database["public"]["Enums"]["workout_set_role"];
export type WorkoutSetCompletionRule =
  Database["public"]["Enums"]["workout_set_completion_rule"];
export type ScheduledWorkoutStatus =
  Database["public"]["Enums"]["scheduled_workout_status"];
export type WorkoutSessionStatus = Database["public"]["Enums"]["workout_session_status"];
export type WorkoutSetStatus = Database["public"]["Enums"]["workout_set_status"];

export type RehabSide = Database["public"]["Enums"]["rehab_side"];
export type RehabPhaseType = Database["public"]["Enums"]["rehab_phase_type"];
export type RehabCompletionRule = Database["public"]["Enums"]["rehab_completion_rule"];
export type RehabSetStatus = Database["public"]["Enums"]["rehab_set_status"];
export type RehabSessionStatus = Database["public"]["Enums"]["rehab_session_status"];
export type RehabSwellingLevel = Database["public"]["Enums"]["rehab_swelling_level"];
export type RehabInstabilityLevel =
  Database["public"]["Enums"]["rehab_instability_level"];
export type RehabRestrictionType = Database["public"]["Enums"]["rehab_restriction_type"];
export type RehabRestrictionSeverity =
  Database["public"]["Enums"]["rehab_restriction_severity"];
export type RehabClinicianSourceType =
  Database["public"]["Enums"]["rehab_clinician_source_type"];
export type RehabAlertType = Database["public"]["Enums"]["rehab_alert_type"];
export type RehabObservationType = Database["public"]["Enums"]["rehab_observation_type"];
export type RehabExerciseCategory =
  Database["public"]["Enums"]["rehab_exercise_category"];
export type RehabExerciseSource = Database["public"]["Enums"]["rehab_exercise_source"];
export type ScheduledRehabStatus = Database["public"]["Enums"]["scheduled_rehab_status"];

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
/** Barcode → branded_product ownership (Increment 4 model marker). */
export type BarcodeBrandedProductId = Barcode["branded_product_id"];
export type NutritionLabelCapture =
  Database["public"]["Tables"]["nutrition_label_captures"]["Row"];
export type ProductReviewEvent =
  Database["public"]["Tables"]["product_review_events"]["Row"];
export type MuscleGroup = Database["public"]["Tables"]["muscle_groups"]["Row"];
export type EquipmentType = Database["public"]["Tables"]["equipment_types"]["Row"];
export type MovementPattern = Database["public"]["Tables"]["movement_patterns"]["Row"];
export type ExerciseDefinition =
  Database["public"]["Tables"]["exercise_definitions"]["Row"];
export type ExerciseAlias = Database["public"]["Tables"]["exercise_aliases"]["Row"];
export type ExerciseMuscleGroup =
  Database["public"]["Tables"]["exercise_muscle_groups"]["Row"];
export type UserExercise = Database["public"]["Tables"]["user_exercises"]["Row"];
export type WorkoutPlan = Database["public"]["Tables"]["workout_plans"]["Row"];
export type WorkoutPlanDay = Database["public"]["Tables"]["workout_plan_days"]["Row"];
export type WorkoutBlock = Database["public"]["Tables"]["workout_blocks"]["Row"];
export type WorkoutBlockExercise =
  Database["public"]["Tables"]["workout_block_exercises"]["Row"];
export type WorkoutSetPrescription =
  Database["public"]["Tables"]["workout_set_prescriptions"]["Row"];
export type ScheduledWorkout = Database["public"]["Tables"]["scheduled_workouts"]["Row"];
export type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutSessionExercise =
  Database["public"]["Tables"]["workout_session_exercises"]["Row"];
export type WorkoutSet = Database["public"]["Tables"]["workout_sets"]["Row"];
export type WorkoutSessionNote =
  Database["public"]["Tables"]["workout_session_notes"]["Row"];
export type PersonalRecord = Database["public"]["Tables"]["personal_records"]["Row"];

export type RehabPlan = Database["public"]["Tables"]["rehab_plans"]["Row"];
export type RehabPlanPhase = Database["public"]["Tables"]["rehab_plan_phases"]["Row"];
export type RehabPlanDay = Database["public"]["Tables"]["rehab_plan_days"]["Row"];
export type RehabPlanExercise =
  Database["public"]["Tables"]["rehab_plan_exercises"]["Row"];
export type RehabSetPrescription =
  Database["public"]["Tables"]["rehab_set_prescriptions"]["Row"];
export type RehabRestriction = Database["public"]["Tables"]["rehab_restrictions"]["Row"];
export type RehabClinicianSource =
  Database["public"]["Tables"]["rehab_clinician_sources"]["Row"];
export type RehabExerciseDefinition =
  Database["public"]["Tables"]["rehab_exercise_definitions"]["Row"];
export type UserRehabExercise =
  Database["public"]["Tables"]["user_rehab_exercises"]["Row"];
export type RehabSession = Database["public"]["Tables"]["rehab_sessions"]["Row"];
export type RehabSessionExercise =
  Database["public"]["Tables"]["rehab_session_exercises"]["Row"];
export type RehabSet = Database["public"]["Tables"]["rehab_sets"]["Row"];
export type RehabSessionObservation =
  Database["public"]["Tables"]["rehab_session_observations"]["Row"];
export type RehabAlertEvent = Database["public"]["Tables"]["rehab_alert_events"]["Row"];
export type ScheduledRehabSession =
  Database["public"]["Tables"]["scheduled_rehab_sessions"]["Row"];
