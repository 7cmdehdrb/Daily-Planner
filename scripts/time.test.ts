import assert from "node:assert/strict";
import { combineDateAndRange, hasTimeConflict, overlapMinutes } from "../lib/time";

const sameDay = combineDateAndRange("2026-06-23", "09:00", "10:30");
assert.equal(sameDay.startDateTime < sameDay.endDateTime, true);
assert.equal(overlapMinutes(sameDay.startDateTime, sameDay.endDateTime, sameDay.startDateTime, sameDay.endDateTime), 90);

const overnight = combineDateAndRange("2026-06-23", "23:30", "00:30");
assert.equal(new Date(overnight.endDateTime).getTime() > new Date(overnight.startDateTime).getTime(), true);
assert.equal(overlapMinutes(overnight.startDateTime, overnight.endDateTime, overnight.startDateTime, overnight.endDateTime), 60);

const customDayOvernight = combineDateAndRange("2026-06-23", "23:00", "03:00", "07:00");
assert.equal(new Date(customDayOvernight.endDateTime).getTime() > new Date(customDayOvernight.startDateTime).getTime(), true);
assert.equal(overlapMinutes(customDayOvernight.startDateTime, customDayOvernight.endDateTime, customDayOvernight.startDateTime, customDayOvernight.endDateTime), 240);

const customDayEndsAtBoundary = combineDateAndRange("2026-06-23", "23:00", "07:00", "07:00");
assert.equal(new Date(customDayEndsAtBoundary.endDateTime).getTime() > new Date(customDayEndsAtBoundary.startDateTime).getTime(), true);
assert.equal(
  overlapMinutes(
    customDayEndsAtBoundary.startDateTime,
    customDayEndsAtBoundary.endDateTime,
    customDayEndsAtBoundary.startDateTime,
    customDayEndsAtBoundary.endDateTime,
  ),
  480,
);

const customDayEarlyMorning = combineDateAndRange("2026-06-23", "03:00", "06:00", "07:00");
assert.equal(new Date(customDayEarlyMorning.startDateTime).getDate(), 24);
assert.equal(new Date(customDayEarlyMorning.endDateTime).getTime() > new Date(customDayEarlyMorning.startDateTime).getTime(), true);

assert.equal(
  hasTimeConflict("2026-06-23T00:30:00.000Z", "2026-06-23T01:30:00.000Z", [
    { id: "a", startDateTime: "2026-06-23T01:00:00.000Z", endDateTime: "2026-06-23T02:00:00.000Z" },
  ]),
  true,
);
assert.equal(
  hasTimeConflict("2026-06-23T02:00:00.000Z", "2026-06-23T03:00:00.000Z", [
    { id: "a", startDateTime: "2026-06-23T01:00:00.000Z", endDateTime: "2026-06-23T02:00:00.000Z" },
  ]),
  false,
);

console.log("time helper checks passed");
