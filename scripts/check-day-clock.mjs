import assert from "node:assert/strict";
import { remainingDay, madridClock } from "../lib/life.ts";
const events = [
  ["09:00", "10:00"],
  ["14:00", "16:30"],
].map(([time, endTime], i) => ({
  id: String(i),
  kind: "event",
  createdAt: "",
  data: { time, endTime, title: "Plan", category: "Trabajo" },
}));
let d = remainingDay(events, "07:00");
assert.equal(d.freeMinutes, 630);
assert.equal(d.remainingEvents.length, 2);
assert.equal(d.startMinute, 480);
d = remainingDay(events, "15:00");
assert.equal(d.freeMinutes, 330);
assert.equal(d.remainingEvents.length, 1);
assert.equal(d.segments[0].start, 900);
d = remainingDay(events, "17:00");
assert.equal(d.freeMinutes, 300);
assert.equal(d.remainingEvents.length, 0);
d = remainingDay(events, "21:59");
assert.equal(d.freeMinutes, 1);
assert.equal(d.periodEnded, false);
for (const t of ["22:00", "22:55", "23:59"]) {
  d = remainingDay(events, t);
  assert.equal(d.freeMinutes, 0);
  assert.equal(d.periodEnded, true);
  assert.equal(d.remainingEvents.length, 0);
  assert.equal(d.segments.length, 0);
}
const overlap = [
  ["15:00", "17:00"],
  ["16:00", "18:00"],
].map(([time, endTime]) => ({
  id: time,
  kind: "event",
  createdAt: "",
  data: { time, endTime, title: "Plan" },
}));
assert.equal(remainingDay(overlap, "16:30").freeMinutes, 240);
const night = [
  { ...events[0], data: { time: "23:00", endTime: "23:30", title: "Cena" } },
];
assert.equal(remainingDay(night, "22:55").remainingEvents.length, 1);
assert.equal(remainingDay(night, "22:55").freeMinutes, 0);
assert.deepEqual(madridClock(new Date("2026-11-15T21:55:00Z")), {
  today: "2026-11-15",
  clock: "22:55",
});
assert.deepEqual(madridClock(new Date("2026-11-15T23:01:00Z")), {
  today: "2026-11-16",
  clock: "00:01",
});
assert.equal(madridClock(new Date("2026-07-15T20:55:00Z")).clock, "22:55");
console.log(
  "PASS: morning, ongoing and finished events, overlaps, 21:59, 22:00, 22:55, late-night events, Madrid timezone and midnight rollover.",
);
