import { View, Text } from "react-native";
import "../global.css";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <Text className="text-turquoise text-2xl font-semibold">Say-A-Drug</Text>
      <Text className="text-gray-muted text-base">Pediatric Medication Assistant</Text>
    </View>
  );
}
