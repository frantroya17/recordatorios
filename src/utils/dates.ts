export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

export function timeLabel(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export const DOW_LABELS: Record<number, string> = {
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
  7: "D",
};