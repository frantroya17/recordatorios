import * as SQLite from "expo-sqlite";
import type { SQLiteRunResult } from "expo-sqlite";
import type { Frequency, Reminder } from "../types";
import { todayYMD } from "../utils/dates";

type ReminderRow = {
  id: number;
  title: string;
  hour: number;
  minute: number;
  frequency: Frequency;
  daysOfWeek: string;
  enabled: number;
  notificationIds: string;
};

type LogDateRow = { date: string };

const db = SQLite.openDatabaseSync("creatina_reminder.db");

function run(sql: string, params: any[] = []): Promise<SQLiteRunResult> {
  return db.runAsync(sql, params);
}

export async function initDb() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      frequency TEXT NOT NULL,
      daysOfWeek TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      notificationIds TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminderId INTEGER NOT NULL,
      date TEXT NOT NULL,
      doneAt TEXT NOT NULL,
      UNIQUE(reminderId, date)
    );
  `);
}

function parseReminderRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    hour: row.hour,
    minute: row.minute,
    frequency: row.frequency,
    daysOfWeek: row.daysOfWeek ? JSON.parse(row.daysOfWeek) : [],
    enabled: row.enabled === 1,
    notificationIds: row.notificationIds ? JSON.parse(row.notificationIds) : [],
  };
}

export async function listReminders(): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(`SELECT * FROM reminders ORDER BY id DESC;`);
  return rows.map(parseReminderRow);
}

export async function getReminder(id: number): Promise<Reminder | null> {
  const row = await db.getFirstAsync<ReminderRow>(`SELECT * FROM reminders WHERE id=?;`, [id]);
  return row ? parseReminderRow(row) : null;
}

export async function upsertReminder(input: Omit<Reminder, "id"> & { id?: number }): Promise<number> {
  const daysJson = JSON.stringify(input.daysOfWeek ?? []);
  const notifJson = JSON.stringify(input.notificationIds ?? []);
  const enabledInt = input.enabled ? 1 : 0;

  if (input.id) {
    await run(
      `UPDATE reminders
       SET title=?, hour=?, minute=?, frequency=?, daysOfWeek=?, enabled=?, notificationIds=?
       WHERE id=?;`,
      [input.title, input.hour, input.minute, input.frequency, daysJson, enabledInt, notifJson, input.id]
    );
    return input.id;
  }

  const res = await run(
    `INSERT INTO reminders (title, hour, minute, frequency, daysOfWeek, enabled, notificationIds)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [input.title, input.hour, input.minute, input.frequency, daysJson, enabledInt, notifJson]
  );
  return res.lastInsertRowId;
}

export async function deleteReminder(id: number) {
  await run(`DELETE FROM reminders WHERE id=?;`, [id]);
  await run(`DELETE FROM logs WHERE reminderId=?;`, [id]);
}

export async function markDoneToday(reminderId: number): Promise<boolean> {
  const date = todayYMD();
  const doneAt = new Date().toISOString();
  try {
    await run(`INSERT INTO logs (reminderId, date, doneAt) VALUES (?, ?, ?);`, [reminderId, date, doneAt]);
    return true;
  } catch {
    return false;
  }
}

export async function listLogsForReminder(reminderId: number): Promise<{ date: string }[]> {
  const rows = await db.getAllAsync<LogDateRow>(`SELECT date FROM logs WHERE reminderId=?;`, [reminderId]);
  return rows.map((r) => ({ date: r.date }));
}
