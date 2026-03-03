import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import type { Reminder } from "../types";
import { listReminders, deleteReminder, markDoneToday } from "../db/db";
import { timeLabel } from "../utils/dates";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

async function cancelNotifications(ids: string[]) {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}

export default function HomeScreen({ navigation }: Props) {
  const [items, setItems] = useState<Reminder[]>([]);

  const refresh = useCallback(async () => {
    const data = await listReminders();
    setItems(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={() => navigation.navigate("Calendar")}>
            <Text style={styles.headerBtn}>📅</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("AddEdit")}>
            <Text style={styles.headerBtn}>＋</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const onDone = async (id: number) => {
    const created = await markDoneToday(id);
    Alert.alert(created ? "¡Hecho!" : "Ya estaba marcado", created ? "Guardado en el historial de hoy." : "Hoy ya lo marcaste.");
  };

  const onDelete = async (r: Reminder) => {
    Alert.alert("Borrar", `¿Borrar "${r.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await cancelNotifications(r.notificationIds);
          await deleteReminder(r.id);
          refresh();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tienes recordatorios</Text>
          <Text style={styles.emptySub}>Pulsa ＋ para crear uno (ej: Creatina)</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.frequency === "DAILY" ? "Diario" : `Semanal (${item.daysOfWeek.join(",")})`} • {timeLabel(item.hour, item.minute)}
                </Text>
                <Text style={styles.metaSmall}>
                  {item.enabled ? "✅ Activo" : "⛔ Desactivado"} {item.notificationIds.length ? `• 🔔 ${item.notificationIds.length}` : ""}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable style={styles.btn} onPress={() => onDone(item.id)}>
                  <Text style={styles.btnText}>Hecho hoy</Text>
                </Pressable>

                <Pressable style={styles.btnSecondary} onPress={() => navigation.navigate("AddEdit", { id: item.id })}>
                  <Text style={styles.btnText}>Editar</Text>
                </Pressable>

                <Pressable style={styles.btnDanger} onPress={() => onDelete(item)}>
                  <Text style={styles.btnText}>Borrar</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { fontSize: 22, paddingHorizontal: 6 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySub: { fontSize: 14, opacity: 0.7, textAlign: "center" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, flexDirection: "row", gap: 12, elevation: 1 },
  title: { fontSize: 16, fontWeight: "700" },
  meta: { marginTop: 4, opacity: 0.75 },
  metaSmall: { marginTop: 4, opacity: 0.6, fontSize: 12 },

  actions: { gap: 8, alignItems: "flex-end" },
  btn: { backgroundColor: "#111", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  btnSecondary: { backgroundColor: "#444", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  btnDanger: { backgroundColor: "#b00020", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "600" },
});