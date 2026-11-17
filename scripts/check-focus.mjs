import assert from "node:assert/strict";
import {
  weeklyProgress,
  chooseQuote,
  dailyQuotes,
  taskGoal,
} from "../lib/focus.ts";
import { madridClock, weekDates, shiftDay } from "../lib/life.ts";
const record = (kind, date, data = {}) => ({ kind, data: { date, ...data } });
const monday = "2026-11-16";
const rows = [
  record("workout", monday),
  record("workout", monday),
  record("focusProgress", monday, { goal: "tfg" }),
  record("event", monday, { title: "Trabajo SR", category: "Trabajo" }),
  record("workout", "2026-11-15"),
  record("workout", "2026-11-20"),
];
assert.deepEqual(weeklyProgress(rows, monday, "2026-11-17"), {
  days: 1,
  left: 3,
  tfg: true,
  work: false,
});
assert.equal(
  weeklyProgress(
    [...rows, record("focusProgress", monday, { goal: "work" })],
    monday,
    monday,
  ).work,
  true,
);
assert.equal(taskGoal({ title: "Preparar el TFG" }), "tfg");
assert.equal(
  taskGoal({ title: "Validar los datos", focusGoal: "work" }),
  "work",
);
assert.equal(taskGoal({ title: "Compra" }), undefined);
const nextMonday = madridClock(new Date("2026-11-22T23:00:00Z")).today;
assert.deepEqual(weeklyProgress(rows, weekDates(nextMonday)[0], nextMonday), {
  days: 0,
  left: 4,
  tfg: false,
  work: false,
});
assert.equal(weeklyProgress(rows, monday, "2026-11-22").days, 2);
let last;
for (let i = 0; i < 28; i++) {
  const date = shiftDay(monday, i),
    yesterday = shiftDay(date, -1);
  const key = chooseQuote(rows, date, yesterday, []);
  assert.notEqual(last, key);
  const q = dailyQuotes.find((x) => x.key === key);
  assert.ok(q?.author && q?.url.startsWith("https://"));
  rows.push(record("dailyQuote", date, { key }));
  assert.equal(
    chooseQuote([...rows, record("workout", date)], date, yesterday, []),
    key,
  );
  last = key;
}
console.log(
  "PASS: distinct gym dates, confirmed progress, weekly rollover, historical totals and daily quotes.",
);
