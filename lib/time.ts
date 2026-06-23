import dayjs from "dayjs";

export const todayKey = () => dayjs().format("YYYY-MM-DD");

export const nowIso = () => new Date().toISOString();

export const localTime = (iso: string) => dayjs(iso).format("HH:mm");

export const localTimePart = (iso: string) => dayjs(iso).format("HH:mm");

export const localDate = (iso: string) => dayjs(iso).format("YYYY.MM.DD");

export const timeTextToMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
};

export const minutesToTimeText = (minuteOfDay: number) => {
  const normalized = ((minuteOfDay % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const minutesFromDayStart = (time: string, dayStartTime = "05:00") => {
  const dayStart = timeTextToMinutes(dayStartTime);
  const minute = timeTextToMinutes(time);
  return minute >= dayStart ? minute - dayStart : minute + 24 * 60 - dayStart;
};

export const timeFromDayStartMinutes = (minutes: number, dayStartTime = "05:00") => {
  return minutesToTimeText(timeTextToMinutes(dayStartTime) + minutes);
};

export const minutesBetween = (startIso: string, endIso?: string | null) => {
  if (!endIso) return 0;
  const minutes = dayjs(endIso).diff(dayjs(startIso), "minute", true);
  return Math.max(0, Math.round(minutes));
};

export const combineDateAndTime = (date: string, time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return dayjs(date).hour(hour || 0).minute(minute || 0).second(0).millisecond(0).toDate().toISOString();
};

export const combineDateAndRange = (date: string, startTime: string, endTime: string) => {
  const startDateTime = combineDateAndTime(date, startTime);
  let endDateTime = combineDateAndTime(date, endTime);
  if (!dayjs(endDateTime).isAfter(dayjs(startDateTime))) {
    endDateTime = dayjs(endDateTime).add(1, "day").toISOString();
  }
  return { startDateTime, endDateTime };
};

export const formatDuration = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

export const overlapMinutes = (
  aStartIso: string,
  aEndIso: string | null | undefined,
  bStartIso: string,
  bEndIso: string | null | undefined,
) => {
  if (!aEndIso || !bEndIso) return 0;
  const start = Math.max(dayjs(aStartIso).valueOf(), dayjs(bStartIso).valueOf());
  const end = Math.min(dayjs(aEndIso).valueOf(), dayjs(bEndIso).valueOf());
  if (end <= start) return 0;
  return Math.round((end - start) / 60000);
};

export const hasTimeConflict = (
  startDateTime: string,
  endDateTime: string,
  blocks: { id: string; startDateTime: string; endDateTime: string }[],
  ignoreId?: string,
) => {
  return blocks.some((block) => {
    if (ignoreId && block.id === ignoreId) return false;
    return overlapMinutes(startDateTime, endDateTime, block.startDateTime, block.endDateTime) > 0;
  });
};
