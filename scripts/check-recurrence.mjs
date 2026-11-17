import assert from "node:assert/strict";
import {
  calendarEvents,
  srSchedule,
  daySegments,
  lifeSchemas,
} from "../lib/life.ts";
const record = { id: "sr", kind: "event", createdAt: "", data: srSchedule };
const week = calendarEvents([record], "2026-11-16", "2026-11-22");
assert.equal(week.length, 5);
assert.deepEqual(
  week.map((r) => r.data.date),
  ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"],
);
assert.ok(
  week.every(
    (r) =>
      r.data.time === "09:00" &&
      r.data.endTime === "17:00" &&
      r.source === record,
  ),
);
assert.equal(
  daySegments(week.filter((r) => r.data.date === "2026-11-16")).freeMinutes,
  360,
);
assert.equal(calendarEvents([record], "2026-11-09", "2026-11-15").length, 0);
assert.equal(
  calendarEvents(
    [{ ...record, data: { ...srSchedule, enabled: false } }],
    "2026-11-16",
    "2026-11-22",
  ).length,
  0,
);
assert.equal(calendarEvents([record], "2026-11-30", "2026-12-06").length, 5);
assert.equal(lifeSchemas.event.safeParse(srSchedule).success, true);
console.log(
  "PASS: five weekdays, 09–17, no weekends, starts November 16, later weeks, disabled series and free-time calculation.",
);
