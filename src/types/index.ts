export type Frequency = "DAILY" | "WEEKLY";

export type Reminder = {
  id: number;
  title: string;
  hour: number;
  minute: number;
  frequency: Frequency;
  daysOfWeek: number[]; // 1..7 (L..D) para WEEKLY
  enabled: boolean;
  notificationIds: string[];
};