/** Development-only demo models for Increment 2 flat-lay interaction. */

export type DemoModuleId =
  "breakfast" | "workout" | "water" | "meditation" | "measurements" | "profile";

export type BreakfastItem = {
  id: string;
  name: string;
  qty: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WorkoutSet = {
  id: string;
  reps: number;
  weight: number;
  done: boolean;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

export type DemoBoardState = {
  breakfast: { items: BreakfastItem[]; savedLabel: string };
  workout: { exercises: WorkoutExercise[]; savedLabel: string };
  water: { ml: number; goalMl: number; savedLabel: string };
  meditation: {
    minutes: number;
    goalMinutes: number;
    type: string;
    running: boolean;
    savedLabel: string;
  };
  measurements: {
    weightKg: string;
    waistCm: string;
    date: string;
    savedLabel: string;
  };
  profile: {
    displayName: string;
    goal: string;
    savedLabel: string;
  };
};

export const DEMO_STATUS_ITEMS = [
  { label: "Date", value: "Demo · Jul 26, 2026" },
  { label: "Weight", value: "Demo 78.0 kg" },
  { label: "Waist", value: "Demo 82 cm" },
  { label: "Sleep", value: "Demo 7.0 hrs" },
  { label: "Energy", value: "Demo 8/10" },
] as const;

export function createInitialDemoState(): DemoBoardState {
  return {
    breakfast: {
      items: [
        {
          id: "b1",
          name: "Demo eggs",
          qty: 1,
          kcal: 140,
          protein: 12,
          carbs: 1,
          fat: 10,
        },
        {
          id: "b2",
          name: "Demo oats",
          qty: 1,
          kcal: 150,
          protein: 5,
          carbs: 27,
          fat: 3,
        },
      ],
      savedLabel: "2 demo items · ~290 kcal",
    },
    workout: {
      exercises: [
        {
          id: "w1",
          name: "Demo bench press",
          sets: [
            { id: "s1", reps: 8, weight: 40, done: true },
            { id: "s2", reps: 8, weight: 40, done: false },
          ],
        },
        {
          id: "w2",
          name: "Demo row",
          sets: [{ id: "s3", reps: 10, weight: 30, done: false }],
        },
      ],
      savedLabel: "Demo session · 1/3 sets done",
    },
    water: {
      ml: 750,
      goalMl: 3000,
      savedLabel: "0.75 / 3.0 L (demo)",
    },
    meditation: {
      minutes: 5,
      goalMinutes: 20,
      type: "breath",
      running: false,
      savedLabel: "5 / 20 min (demo)",
    },
    measurements: {
      weightKg: "78.0",
      waistCm: "82",
      date: "2026-07-26",
      savedLabel: "78.0 kg · 82 cm (demo)",
    },
    profile: {
      displayName: "Demo Athlete",
      goal: "Demo consistency goal",
      savedLabel: "Demo Athlete · consistency",
    },
  };
}

export function breakfastTotals(items: BreakfastItem[]) {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal * item.qty,
      protein: acc.protein + item.protein * item.qty,
      carbs: acc.carbs + item.carbs * item.qty,
      fat: acc.fat + item.fat * item.qty,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function workoutStatusLabel(exercises: WorkoutExercise[]) {
  const sets = exercises.flatMap((e) => e.sets);
  const done = sets.filter((s) => s.done).length;
  return `Demo session · ${done}/${sets.length} sets done`;
}
