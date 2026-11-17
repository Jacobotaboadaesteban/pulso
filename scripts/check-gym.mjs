import assert from "node:assert/strict";
import {
  workoutSchema,
  routineSchema,
  workoutVolume,
  setCount,
  weekStart,
  exerciseKey,
  progression,
} from "../lib/gym.ts";
const workout = {
  name: "Torso A",
  date: "2026-11-14",
  duration: 65,
  notes: "",
  exercises: [
    {
      name: "Press banca",
      sets: [
        { weight: 60, reps: 10 },
        { weight: 65, reps: 8 },
      ],
    },
    { name: "Dominadas", sets: [{ weight: 0, reps: 8 }] },
  ],
};
assert.equal(workoutSchema.safeParse(workout).success, true);
assert.equal(workoutVolume(workout), 1120);
assert.equal(setCount(workout), 3);
for (const date of ["2026-02-30", "2026-13-10", "not-a-date"])
  assert.equal(workoutSchema.safeParse({ ...workout, date }).success, false);
assert.equal(
  workoutSchema.safeParse({ ...workout, exercises: [] }).success,
  false,
);
for (const set of [
  { weight: -1, reps: 8 },
  { weight: 60, reps: 0 },
  { weight: NaN, reps: 8 },
  { weight: 60, reps: 2.5 },
])
  assert.equal(
    workoutSchema.safeParse({
      ...workout,
      exercises: [{ name: "Press", sets: [set] }],
    }).success,
    false,
  );
assert.equal(
  routineSchema.safeParse({
    name: "Pierna",
    exercises: [{ name: "Sentadilla", sets: 3, reps: 10, restSeconds: 90 }],
  }).success,
  true,
);
assert.equal(
  routineSchema.safeParse({
    name: "Pierna",
    exercises: [{ name: "", sets: 3, reps: 10, restSeconds: 90 }],
  }).success,
  false,
);
assert.equal(weekStart("2026-11-15"), "2026-11-09");
assert.equal(weekStart("2026-11-16"), "2026-11-16");
assert.equal(
  exerciseKey("  Extensión  de Tríceps "),
  exerciseKey("extension de triceps"),
);
const rows = [
  {
    id: "second",
    kind: "workout",
    createdAt: "2026-11-14",
    data: { ...workout, date: "2026-11-14" },
  },
  {
    id: "first",
    kind: "workout",
    createdAt: "2026-11-10",
    data: {
      ...workout,
      date: "2026-11-10",
      exercises: [{ name: "PRESS BANCA", sets: [{ weight: 60, reps: 12 }] }],
    },
  },
  { id: "routine", kind: "routine", createdAt: "2026-11-01", data: {} },
];
const points = progression(rows, "press banca");
assert.equal(points.length, 2);
assert.equal(points[0].id, "first");
assert.equal(points[1].weight, 65);
assert.equal(points[1].reps, 8);
assert.equal(points[1].volume, 1120);
console.log(
  "PASS: valid records, malformed dates/sets, bodyweight, volume, weekly boundaries, exercise matching and chronological progression.",
);
