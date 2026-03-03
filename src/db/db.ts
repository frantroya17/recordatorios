import * as SQLite from "expo-sqlite";
import type { Frequency, Reminder } from "../types";
import { todayYMD } from "../utils/dates";

const db = SQLite.openDatabase("creatina_reminder.db");

function exec(sql: string, params: any[] = []): Promise<SQLite.SQLResultSet> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
}

export async function initDb() {
  await exec(`
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
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminderId INTEGER NOT NULL,
      date TEXT NOT NULL,
      doneAt TEXT NOT NULL,
      UNIQUE(reminderId, date)
    );
  `);
}

function parseReminderRow(row: any): Reminder {
  return {
    id: row.id,
    title: row.title,
    hour: row.hour,
    minute: row.minute,
    frequency: row.frequency as Frequency,
    daysOfWeek: row.daysOfWeek ? JSON.parse(row.daysOfWeek) : [],
    enabled: row.enabled === 1,
    notificationIds: row.notificationIds ? JSON.parse(row.notificationIds) : [],
  };
}

export async function listReminders(): Promise<Reminder[]> {
  const res = await exec(`SELECT * FROM reminders ORDER BY id DESC;`);
  return (res.rows._array ?? []).map(parseReminderRow);
}

export async function getReminder(id: number): Promise<Reminder | null> {
  const res = await exec(`SELECT * FROM reminders WHERE id=?;`, [id]);
  if (res.rows.length === 0) return null;
  return parseReminderRow(res.rows.item(0));
}

export async function upsertReminder(input: Omit<Reminder, "id"> & { id?: number }): Promise<number> {
  const daysJson = JSON.stringify(input.daysOfWeek ?? []);
  const notifJson = JSON.stringify(input.notificationIds ?? []);
  const enabledInt = input.enabled ? 1 : 0;

  if (input.id) {
    await exec(
      `UPDATE reminders
       SET title=?, hour=?, minute=?, frequency=?, daysOfWeek=?, enabled=?, notificationIds=?
       WHERE id=?;`,
      [input.title, input.hour, input.minute, input.frequency, daysJson, enabledInt, notifJson, input.id]
    );
    return input.id;
  }

  const res = await exec(
    `INSERT INTO reminders (title, hour, minute, frequency, daysOfWeek, enabled, notificationIds)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [input.title, input.hour, input.minute, input.frequency, daysJson, enabledInt, notifJson]
  );
  // @ts-ignore
  return res.insertId as number;
}

export async function deleteReminder(id: number) {
  await exec(`DELETE FROM reminders WHERE id=?;`, [id]);
  await exec(`DELETE FROM logs WHERE reminderId=?;`, [id]);
}

export async function markDoneToday(reminderId: number): Promise<boolean> {
  const date = todayYMD();
  const doneAt = new Date().toISOString();
  try {
    await exec(`INSERT INTO logs (reminderId, date, doneAt) VALUES (?, ?, ?);`, [reminderId, date, doneAt]);
    return true;
  } catch {
    return false;
  }
}

export async function listLogsForReminder(reminderId: number): Promise<{ date: string }[]> {
  const res = await exec(`SELECT date FROM logs WHERE reminderId=?;`, [reminderId]);
  return (res.rows._array ?? []).map((r: any) => ({ date: r.date }));
}