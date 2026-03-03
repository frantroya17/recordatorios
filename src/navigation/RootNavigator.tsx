import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import AddEditReminderScreen from "../screens/AddEditReminderScreen";
import CalendarScreen from "../screens/CalendarScreen";

export type RootStackParamList = {
  Home: undefined;
  AddEdit: { id?: number } | undefined;
  Calendar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Recordatorios" }} />
      <Stack.Screen name="AddEdit" component={AddEditReminderScreen} options={{ title: "Recordatorio" }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: "Calendario" }} />
    </Stack.Navigator>
  );
}