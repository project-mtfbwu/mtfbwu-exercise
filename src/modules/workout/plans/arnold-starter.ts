/**
 * Pure data describing the "Arnold Phase One" starter plan: a classic
 * chest/back, shoulders/arms, legs split repeated twice across six training
 * days. Referenced exercises use `stable_key`s from the curated catalog seed
 * (`supabase/migrations/20260730120100_increment6_exercise_catalog_seed.sql`)
 * so `installArnoldStarterPlanAction` can resolve them to
 * `exercise_definitions.id` at install time.
 *
 * Deliberately free of `install`-time side effects and free of invented
 * loads — only rep ranges are prescribed. This keeps the module a plain data
 * fixture that is easy to unit test without a database.
 */

export const ARNOLD_BLOCK_TYPES = ["warmup", "straight_sets", "superset"] as const;
export type ArnoldBlockType = (typeof ARNOLD_BLOCK_TYPES)[number];

export const ARNOLD_SET_ROLES = ["warmup", "working"] as const;
export type ArnoldSetRole = (typeof ARNOLD_SET_ROLES)[number];

export type ArnoldSetPrescription = {
  role: ArnoldSetRole;
  /** Inclusive rep range; never a specific load — the lifter chooses a weight
   * that lets every set land in range with 1-2 reps in reserve. */
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
};

export type ArnoldBlockExercise = {
  exerciseStableKey: string;
  sets: readonly ArnoldSetPrescription[];
};

export type ArnoldBlock = {
  blockType: ArnoldBlockType;
  title: string | null;
  /** More than one exercise in a `superset` block means they are performed
   * back-to-back with no rest between them. */
  exercises: readonly ArnoldBlockExercise[];
};

export type ArnoldDay = {
  name: string;
  /** ISO-style weekday: 1 = Monday … 6 = Saturday. */
  dayOfWeek: number;
  blocks: readonly ArnoldBlock[];
};

export type ArnoldStarterPlan = {
  name: string;
  description: string;
  days: readonly ArnoldDay[];
};

function warmupSet(
  repsMin: number,
  repsMax: number,
  restSeconds: number | null = 60,
): ArnoldSetPrescription {
  return { role: "warmup", repsMin, repsMax, restSeconds };
}

function workingSets(
  count: number,
  repsMin: number,
  repsMax: number,
  restSeconds: number | null = 90,
): ArnoldSetPrescription[] {
  return Array.from({ length: count }, () => ({
    role: "working" as const,
    repsMin,
    repsMax,
    restSeconds,
  }));
}

function exercise(
  exerciseStableKey: string,
  sets: readonly ArnoldSetPrescription[],
): ArnoldBlockExercise {
  return { exerciseStableKey, sets };
}

function block(
  blockType: ArnoldBlockType,
  exercises: readonly ArnoldBlockExercise[],
  title: string | null = null,
): ArnoldBlock {
  return { blockType, title, exercises };
}

export const ARNOLD_STARTER_NOTE =
  "General strength-training starting point inspired by a classic bodybuilding split. " +
  "This is not medical or physical-therapy advice — check with a qualified professional " +
  "before starting a new exercise program, especially with an injury or medical condition. " +
  "Loads are intentionally left blank: pick a weight that lets you complete every prescribed " +
  "rep within the given range with 1-2 reps in reserve, and adjust week to week.";

export const ARNOLD_STARTER_PLAN: ArnoldStarterPlan = {
  name: "Arnold Phase One — Editable Starter",
  description: ARNOLD_STARTER_NOTE,
  days: [
    {
      name: "Chest & Back A",
      dayOfWeek: 1,
      blocks: [
        block("warmup", [exercise("push_up", [warmupSet(12, 15)])]),
        block(
          "superset",
          [
            exercise("barbell_bench_press", [
              warmupSet(10, 12),
              ...workingSets(4, 6, 10),
            ]),
            exercise("barbell_row", workingSets(4, 6, 10)),
          ],
          "Bench press / row superset",
        ),
        block(
          "superset",
          [
            exercise("incline_dumbbell_press", workingSets(3, 8, 12)),
            exercise("pull_up", workingSets(3, 6, 10)),
          ],
          "Incline press / pull-up superset",
        ),
        block(
          "superset",
          [
            exercise("cable_chest_fly", workingSets(3, 10, 15)),
            exercise("seated_cable_row", workingSets(3, 10, 15)),
          ],
          "Fly / row superset",
        ),
        block(
          "straight_sets",
          [exercise("bench_dip", workingSets(3, 8, 12))],
          "Finisher",
        ),
      ],
    },
    {
      name: "Shoulders & Arms A",
      dayOfWeek: 2,
      blocks: [
        block("warmup", [exercise("worlds_greatest_stretch", [warmupSet(6, 8, 30)])]),
        block(
          "superset",
          [
            exercise("barbell_overhead_press", [
              warmupSet(10, 12),
              ...workingSets(4, 6, 10),
            ]),
            exercise("barbell_curl", workingSets(4, 8, 12)),
          ],
          "Overhead press / curl superset",
        ),
        block(
          "superset",
          [
            exercise("dumbbell_shoulder_press", workingSets(3, 8, 12)),
            exercise("cable_triceps_pushdown", workingSets(3, 10, 15)),
          ],
          "Shoulder press / pushdown superset",
        ),
        block(
          "superset",
          [
            exercise("dumbbell_lateral_raise", workingSets(3, 12, 15)),
            exercise("dumbbell_hammer_curl", workingSets(3, 10, 12)),
          ],
          "Lateral raise / hammer curl superset",
        ),
        block(
          "straight_sets",
          [
            exercise("cable_face_pull", workingSets(3, 12, 15)),
            exercise("ez_bar_skull_crusher", workingSets(3, 10, 12)),
          ],
          "Finisher",
        ),
      ],
    },
    {
      name: "Legs A",
      dayOfWeek: 3,
      blocks: [
        block("warmup", [exercise("kneeling_hip_flexor_stretch", [warmupSet(6, 8, 30)])]),
        block("straight_sets", [
          exercise("barbell_back_squat", [warmupSet(8, 10), ...workingSets(4, 5, 8)]),
        ]),
        block("straight_sets", [exercise("romanian_deadlift", workingSets(3, 8, 10))]),
        block(
          "superset",
          [
            exercise("leg_press", workingSets(3, 10, 15)),
            exercise("machine_leg_curl", workingSets(3, 10, 15)),
          ],
          "Leg press / leg curl superset",
        ),
        block("straight_sets", [
          exercise("dumbbell_walking_lunge", workingSets(3, 10, 12)),
        ]),
        block(
          "straight_sets",
          [exercise("standing_calf_raise", workingSets(3, 12, 20))],
          "Finisher",
        ),
      ],
    },
    {
      name: "Chest & Back B",
      dayOfWeek: 4,
      blocks: [
        block("warmup", [exercise("push_up", [warmupSet(12, 15)])]),
        block(
          "superset",
          [
            exercise("dumbbell_bench_press", [
              warmupSet(10, 12),
              ...workingSets(4, 8, 12),
            ]),
            exercise("lat_pulldown", workingSets(4, 8, 12)),
          ],
          "Dumbbell press / pulldown superset",
        ),
        block(
          "superset",
          [
            exercise("incline_dumbbell_press", workingSets(3, 8, 12)),
            exercise("single_arm_dumbbell_row", workingSets(3, 8, 12)),
          ],
          "Incline press / single-arm row superset",
        ),
        block(
          "superset",
          [
            exercise("cable_chest_fly", workingSets(3, 10, 15)),
            exercise("seated_cable_row", workingSets(3, 10, 15)),
          ],
          "Fly / row superset",
        ),
        block(
          "straight_sets",
          [exercise("bench_dip", workingSets(3, 8, 12))],
          "Finisher",
        ),
      ],
    },
    {
      name: "Shoulders & Arms B",
      dayOfWeek: 5,
      blocks: [
        block("warmup", [exercise("worlds_greatest_stretch", [warmupSet(6, 8, 30)])]),
        block(
          "superset",
          [
            exercise("dumbbell_shoulder_press", [
              warmupSet(10, 12),
              ...workingSets(4, 8, 12),
            ]),
            exercise("close_grip_bench_press", workingSets(4, 6, 10)),
          ],
          "Shoulder press / close-grip press superset",
        ),
        block(
          "superset",
          [
            exercise("cable_face_pull", workingSets(3, 12, 15)),
            exercise("barbell_curl", workingSets(3, 8, 12)),
          ],
          "Face pull / curl superset",
        ),
        block(
          "superset",
          [
            exercise("dumbbell_lateral_raise", workingSets(3, 12, 15)),
            exercise("dumbbell_hammer_curl", workingSets(3, 10, 12)),
          ],
          "Lateral raise / hammer curl superset",
        ),
        block(
          "straight_sets",
          [exercise("ez_bar_skull_crusher", workingSets(3, 10, 12))],
          "Finisher",
        ),
      ],
    },
    {
      name: "Legs B",
      dayOfWeek: 6,
      blocks: [
        block("warmup", [exercise("kneeling_hip_flexor_stretch", [warmupSet(6, 8, 30)])]),
        block("straight_sets", [
          exercise("barbell_front_squat", [warmupSet(8, 10), ...workingSets(4, 6, 10)]),
        ]),
        block("straight_sets", [exercise("romanian_deadlift", workingSets(3, 8, 10))]),
        block(
          "superset",
          [
            exercise("leg_press", workingSets(3, 10, 15)),
            exercise("machine_leg_extension", workingSets(3, 10, 15)),
          ],
          "Leg press / leg extension superset",
        ),
        block("straight_sets", [
          exercise("dumbbell_walking_lunge", workingSets(3, 10, 12)),
        ]),
        block(
          "straight_sets",
          [exercise("standing_calf_raise", workingSets(3, 12, 20))],
          "Finisher",
        ),
      ],
    },
  ],
};
