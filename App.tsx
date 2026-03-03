import React, { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { initDb } from "./src/db/db";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("reminders", {
    name: "Recordatorios",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: "default",
  });
}

async function ensureNotificationPermissions() {
  const perms = await Notifications.getPermissionsAsync();
  if (perms.status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

export default function App() {
  useEffect(() => {
    (async () => {
      await initDb();
      await ensureNotificationChannel();
      await ensureNotificationPermissions();
    })();
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}