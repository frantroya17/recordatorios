import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Calendar } from "react-native-calendars";
import type { Reminder } from "../types";
import { listReminders, listLogsForReminder } from "../db/db";

export default function CalendarScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const data = await listReminders();
      setReminders(data);
      setSelectedId(data[0]?.id ?? null);
    })();
  }, []);

  const loadMarks = useCallback(async (reminderId: number) => {
    const logs = await listLogsForReminder(reminderId);
    const marks: Record<string, any> = {};
    for (const l of logs) marks[l.date] = { marked: true, dotColor: "#111" };
    setMarkedDates(marks);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMarks(selectedId);
  }, [selectedId, loadMarks]);

  if (reminders.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Crea un recordatorio primero.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recordatorio</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={selectedId} onValueChange={(v) => setSelectedId(v)}>
          {reminders.map((r) => (
            <Picker.Item key={r.id} label={r.title} value={r.id} />
          ))}
        </Picker>
      </View>

      <View style={{ height: 12 }} />

      <Calendar markedDates={markedDates} />

      <Text style={styles.hint}>Los puntos son días marcados con “Hecho hoy”.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, gap: 10 },
  label: { fontWeight: "700" },
  pickerWrap: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, overflow: "hidden", backgroundColor: "#fff" },
  hint: { marginTop: 10, opacity: 0.7, fontSize: 12 },
  empty: { marginTop: 20, fontSize: 16, opacity: 0.7 },
});