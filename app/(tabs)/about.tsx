import { View, Text } from "react-native";
import "../global.css";

const about = () => {
  return (
    <View className="flex-1 justify-center items-center bg-background px-8">
      <View className="items-center gap-4">
        <View className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-medium to-deep-teal border-2 border-turquoise/50 items-center justify-center">
          <Text className="text-turquoise text-3xl">💊</Text>
        </View>
        <Text className="text-white text-xl font-semibold">About Say-A-Drug</Text>
        <Text className="text-gray-muted text-center text-sm leading-6">
          Your AI-powered pediatric medication assistant. Get accurate dosing information for children quickly and safely.
        </Text>
        <View className="h-px bg-charcoal/50 w-full mt-4" />
        <Text className="text-cyan text-xs">Version 1.0.0</Text>
      </View>
    </View>
  );
};

export default about;
