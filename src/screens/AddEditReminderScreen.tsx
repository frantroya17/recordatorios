import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Picker } from "@react-native-picker/picker";
import * as Notifications from "expo-notifications";
import type { Frequency, Reminder } from "../types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getReminder, upsertReminder } from "../db/db";
import { DOW_LABELS } from "../utils/dates";

type Props = NativeStackScreenProps<RootStackParamList, "AddEdit">;

const allDows = [1, 2, 3, 4, 5, 6, 7];


function appDowToExpoWeekday(day: number): number {
  // App: 1..7 => lunes..domingo
  // Expo weekday: 1..7 => domingo..sábado
  return day === 7 ? 1 : day + 1;
}

async function cancelNotifications(ids: string[]) {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}

async function scheduleForReminder(r: Omit<Reminder, "id"> & { id: number }): Promise<string[]> {
  const ids: string[] = [];
  if (!r.enabled) return ids;

  if (r.frequency === "DAILY") {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: "Toca para abrir la app y marcarlo como hecho.", sound: "default" },
      trigger: { hour: r.hour, minute: r.minute, repeats: true, channelId: "reminders" } as any,
    });
    ids.push(id);
  } else {
    for (const weekday of r.daysOfWeek) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: "Toca para abrir la app y marcarlo como hecho.", sound: "default" },
        trigger: { weekday: appDowToExpoWeekday(weekday), hour: r.hour, minute: r.minute, repeats: true, channelId: "reminders" } as any,
      });
      ids.push(id);
    }
  }
  return ids;
}

export default function AddEditReminderScreen({ navigation, route }: Props) {
  const reminderId = route.params?.id;

  const [title, setTitle] = useState("Creatina");
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);
  const [frequency, setFrequency] = useState<Frequency>("DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3, 5]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      if (!reminderId) return;
      const r = await getReminder(reminderId);
      if (!r) return;
      setTitle(r.title);
      setHour(r.hour);
      setMinute(r.minute);
      setFrequency(r.frequency);
      setDaysOfWeek(r.daysOfWeek);
      setEnabled(r.enabled);
    })();
  }, [reminderId]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const toggleDow = (d: number) => {
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const onSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return Alert.alert("Falta título", "Pon un nombre (ej: Creatina).");
    if (frequency === "WEEKLY" && daysOfWeek.length === 0) return Alert.alert("Faltan días", "Selecciona al menos un día.");

    let oldNotifIds: string[] = [];
    if (reminderId) {
      const old = await getReminder(reminderId);
      oldNotifIds = old?.notificationIds ?? [];
    }

    const id = await upsertReminder({
      id: reminderId,
      title: cleanTitle,
      hour,
      minute,
      frequency,
      daysOfWeek: frequency === "WEEKLY" ? daysOfWeek : [],
      enabled,
      notificationIds: [],
    });

    await cancelNotifications(oldNotifIds);

    const notifIds = await scheduleForReminder({
      id,
      title: cleanTitle,
      hour,
      minute,
      frequency,
      daysOfWeek: frequency === "WEEKLY" ? daysOfWeek : [],
      enabled,
      notificationIds: [],
    });

    await upsertReminder({
      id,
      title: cleanTitle,
      hour,
      minute,
      frequency,
      daysOfWeek: frequency === "WEEKLY" ? daysOfWeek : [],
      enabled,
      notificationIds: notifIds,
    });

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Creatina" />

      <Text style={styles.label}>Frecuencia</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={frequency} onValueChange={(v) => setFrequency(v)}>
          <Picker.Item label="Diario" value="DAILY" />
          <Picker.Item label="Semanal" value="WEEKLY" />
        </Picker>
      </View>

      {frequency === "WEEKLY" && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Días (L..D)</Text>
          <View style={styles.dowRow}>
            {allDows.map((d) => (
              <Pressable key={d} onPress={() => toggleDow(d)} style={[styles.dowBtn, daysOfWeek.includes(d) && styles.dowBtnActive]}>
                <Text style={[styles.dowText, daysOfWeek.includes(d) && styles.dowTextActive]}>{DOW_LABELS[d]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.label}>Hora</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Hora</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={hour} onValueChange={(v) => setHour(v)}>
              {hours.map((h) => <Picker.Item key={h} label={String(h)} value={h} />)}
            </Picker>
          </View>
        </View>

        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Min</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={minute} onValueChange={(v) => setMinute(v)}>
              {minutes.map((m) => <Picker.Item key={m} label={String(m)} value={m} />)}
            </Picker>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Activado</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setEnabled(true)} style={[styles.toggle, enabled && styles.toggleOn]}>
          <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>Sí</Text>
        </Pressable>
        <Pressable onPress={() => setEnabled(false)} style={[styles.toggle, !enabled && styles.toggleOn]}>
          <Text style={[styles.toggleText, !enabled && styles.toggleTextOn]}>No</Text>
        </Pressable>
      </View>

      <Pressable onPress={onSave} style={styles.saveBtn}>
        <Text style={styles.saveText}>{reminderId ? "Guardar cambios" : "Crear recordatorio"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, gap: 10 },
  label: { fontWeight: "700", marginTop: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, backgroundColor: "#fff" },
  pickerWrap: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, overflow: "hidden", backgroundColor: "#fff" },

  timeRow: { flexDirection: "row", gap: 12 },
  timeCol: { flex: 1 },
  timeLabel: { opacity: 0.7, marginBottom: 4 },

  dowRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  dowBtn: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#fff" },
  dowBtnActive: { backgroundColor: "#111", borderColor: "#111" },
  dowText: { fontWeight: "700" },
  dowTextActive: { color: "#fff" },

  row: { flexDirection: "row", gap: 10 },
  toggle: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12, alignItems: "center", backgroundColor: "#fff" },
  toggleOn: { backgroundColor: "#111", borderColor: "#111" },
  toggleText: { fontWeight: "700" },
  toggleTextOn: { color: "#fff" },

  saveBtn: { marginTop: 12, backgroundColor: "#111", borderRadius: 12, padding: 14, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "800" },
});