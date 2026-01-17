import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#0a1416' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="heart/index" options={{ headerShown: false }} />
        <Stack.Screen name="git/index" options={{ headerShown: false }} />
        <Stack.Screen name="fever/index" options={{ headerShown: false }} />
        <Stack.Screen name="neuro/index" options={{ headerShown: false }} />
        <Stack.Screen name="skin/index" options={{ headerShown: false }} />
        <Stack.Screen name="women/index" options={{ headerShown: false }} />
        <Stack.Screen name="lungs/index" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
