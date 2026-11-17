import { z } from "zod";
const name = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((s) => s.replace(/\s+/g, " "));
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Fecha inválida");
export const routineSchema = z.object({
  name,
  exercises: z
    .array(
      z.object({
        name,
        sets: z.number().int().min(1).max(20),
        reps: z.number().int().min(1).max(100),
        restSeconds: z.number().int().min(0).max(600),
      }),
    )
    .min(1)
    .max(30),
});
export const workoutSchema = z.object({
  name,
  date,
  duration: z.number().int().min(0).max(1440),
  notes: z.string().max(2000),
  exercises: z
    .array(
      z.object({
        name,
        sets: z
          .array(
            z.object({
              weight: z.number().min(0).max(2000),
              reps: z.number().int().min(1).max(100),
            }),
          )
          .min(1)
          .max(20),
      }),
    )
    .min(1)
    .max(30),
});
export type Routine = z.infer<typeof routineSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type GymRecord = {
  id: string;
  kind: string;
  data: any;
  createdAt: string;
};
export const exerciseKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export function workoutVolume(w: Workout) {
  return w.exercises.reduce(
    (s, e) => s + e.sets.reduce((v, t) => v + t.weight * t.reps, 0),
    0,
  );
}
export function setCount(w: Workout) {
  return w.exercises.reduce((s, e) => s + e.sets.length, 0);
}
export function weekStart(date: string) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function progression(rows: GymRecord[], exercise: string) {
  return rows
    .filter((r) => r.kind === "workout")
    .sort(
      (a, b) =>
        a.data.date.localeCompare(b.data.date) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .flatMap((r) => {
      const sets = (r.data as Workout).exercises
        .filter((e) => exerciseKey(e.name) === exerciseKey(exercise))
        .flatMap((e) => e.sets);
      if (!sets.length) return [];
      const best = [...sets].sort(
        (a, b) => b.weight - a.weight || b.reps - a.reps,
      )[0];
      return [
        {
          id: r.id,
          date: r.data.date,
          weight: best.weight,
          reps: best.reps,
          volume: sets.reduce((s, t) => s + t.weight * t.reps, 0),
        },
      ];
    });
}
