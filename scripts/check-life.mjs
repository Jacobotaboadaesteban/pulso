import assert from "node:assert/strict";
import {
  lifeSchemas,
  weekDates,
  renewDate,
  habitStreak,
  monthBudget,
  daySegments,
  dayDiff,
} from "../lib/life.ts";
const event = (time, endTime) => ({
  id: time,
  kind: "event",
  createdAt: "",
  data: {
    title: "Evento",
    date: "2026-11-14",
    time,
    endTime,
    category: "Trabajo",
  },
});
assert.equal(daySegments([]).freeMinutes, 840);
assert.equal(
  daySegments([event("09:00", "11:00"), event("10:00", "12:00")]).freeMinutes,
  660,
);
assert.equal(
  daySegments([event("07:00", "09:00"), event("21:00", "23:00")]).freeMinutes,
  720,
);
assert.equal(
  lifeSchemas.event.safeParse(event("12:00", "11:00").data).success,
  false,
);
assert.equal(
  lifeSchemas.event.safeParse({
    ...event("09:00", "10:00").data,
    date: "2026-02-30",
  }).success,
  false,
);
assert.equal(renewDate("2026-01-31", "monthly"), "2026-02-28");
assert.equal(renewDate("2024-02-29", "yearly"), "2025-02-28");
assert.deepEqual(weekDates("2026-11-15"), [
  "2026-11-09",
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
  "2026-11-15",
]);
const log = (date) => ({
  id: date,
  kind: "habitlog",
  createdAt: "",
  data: { habitId: "h", date },
});
assert.equal(
  habitStreak([log("2026-11-12"), log("2026-11-13")], "h", "2026-11-14"),
  2,
);
assert.equal(habitStreak([log("2026-11-12")], "h", "2026-11-14"), 0);
const m = (type, amount, date) => ({
  id: date,
  kind: "movement",
  createdAt: "",
  data: { type, amount, date },
});
const cash = monthBudget(
  [
    m("expense", 150, "2026-11-01"),
    m("income", 800, "2026-11-02"),
    m("expense", 50, "2026-11-30"),
  ],
  "2026-11-14",
  1000,
);
assert.equal(cash.expense, 150);
assert.equal(cash.remainingDays, 17);
assert.equal(cash.remaining, 850);
assert.equal(cash.daily, 50);
assert.equal(cash.income, 800);
assert.equal(
  lifeSchemas.health.safeParse({
    date: "2026-11-14",
    weight: null,
    sleep: null,
    steps: null,
  }).success,
  false,
);
assert.equal(
  lifeSchemas.health.safeParse({
    date: "2026-11-14",
    weight: null,
    sleep: 0,
    steps: 0,
  }).success,
  true,
);
assert.equal(
  lifeSchemas.habit.safeParse({ name: "Leer", targetPerWeek: 8 }).success,
  false,
);
assert.equal(dayDiff("2026-11-20", "2026-11-14"), 6);
console.log(
  "PASS: overlapping events, day clipping, dates, month-end renewals, weekly ranges, streaks, budgets, future expenses and empty versus zero health data.",
);
