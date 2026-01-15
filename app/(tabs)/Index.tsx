import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type DimensionValue
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORBIT_SIZE = Math.min(SCREEN_WIDTH * 0.85, 340);
const CENTER_SIZE = ORBIT_SIZE * 0.4;
const BUTTON_SIZE = ORBIT_SIZE * 0.18;

// Types
type RecentInquiry = {
  id: string;
  question: string;
  timestamp: string;
  viaVoice: boolean;
};

type Category = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

// Header Component
const Header = () => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View className="flex-row items-center justify-between px-6 pt-6 pb-2">
      <View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="sunny-outline" size={14} color="#9ca3af" />
          <Text className="text-sm text-gray-muted font-medium">{getGreeting()},</Text>
        </View>
        <Text className="text-2xl font-bold leading-tight text-white">Alex Doe</Text>
      </View>
      <TouchableOpacity className="relative p-2 rounded-full bg-teal-medium/50 border border-charcoal/20">
        <Ionicons name="notifications-outline" size={22} color="#fff" />
        <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-turquoise rounded-full border-2 border-background" />
      </TouchableOpacity>
    </View>
  );
};

// Search Bar Component
const SearchBar = () => {
  const [searchText, setSearchText] = useState('');

  return (
    <View className="px-6 py-4">
      <View className="relative">
        {/* Gradient border effect */}
        <View className="absolute -inset-0.5 rounded-full blur-md opacity-75 bg-gradient-to-r from-turquoise/30 to-cyan/30" />
        <View className="relative flex-row items-center h-14 bg-teal-dark rounded-full px-4 border border-white/5 shadow-lg">
          <Ionicons name="sparkles" size={20} color="#2dd4bf" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-white text-base font-medium"
            placeholder="Ask AI about drugs, symptoms..."
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
          />
          <View className="h-6 w-px bg-white/10 mr-3 ml-1" />
          <TouchableOpacity className="p-2">
            <Ionicons name="mic" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Category Pills Component
const CategoryPills = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Prescription', 'OTC', 'Pediatric', 'Generic'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-6 gap-3 pb-2"
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          onPress={() => setSelectedCategory(category)}
          className={`h-9 px-5 rounded-full justify-center ${selectedCategory === category
            ? 'bg-turquoise shadow-glow-cyan'
            : 'bg-teal-medium border border-white/10'
            }`}
        >
          <Text
            className={`text-sm font-bold ${selectedCategory === category ? 'text-black' : 'text-gray-300'
              }`}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// Orbit Button Component
const OrbitButton = ({
  category,
  size,
  top,
  left,
}: {
  category: Category;
  size: number;
  top: DimensionValue;
  left: DimensionValue;
}) => (
  <TouchableOpacity
    className="absolute bg-teal-medium border border-white/10 items-center justify-center shadow-lg rounded-full"
    style={{ width: size, height: size, top, left, marginTop: -size / 2, marginLeft: -size / 2 }}
  >
    <Ionicons name={category.icon} size={20} color={category.color} />
    <Text className="text-[9px] font-bold text-gray-300 mt-0.5">{category.name}</Text>
  </TouchableOpacity>
);

// Orbit Navigation Component
const OrbitNavigation = () => {
  const categories: Category[] = [
    { id: '1', name: 'Heart', icon: 'heart', color: '#ff6b6b' },
    { id: '2', name: 'GIT', icon: 'restaurant', color: '#feca57' },
    { id: '3', name: 'Fever', icon: 'thermometer', color: '#54a0ff' },
    { id: '4', name: 'Neuro', icon: 'nutrition', color: '#1dd1a1' },
    { id: '5', name: 'Skin', icon: 'body', color: '#5f27cd' },
    { id: '6', name: 'Women', icon: 'woman', color: '#ff9ff3' },
    { id: '7', name: 'Lungs', icon: 'leaf', color: '#48dbfb' },
    { id: '8', name: 'More', icon: 'grid', color: '#9ca3af' },
  ];

  return (
    <View className="px-6 py-6">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xl font-bold text-white">Browse Categories</Text>
        <TouchableOpacity className="flex-row items-center gap-1">
          <Text className="text-turquoise text-sm font-semibold">View List</Text>
          <Ionicons name="list-outline" size={16} color="#2dd4bf" />
        </TouchableOpacity>
      </View>

      <View
        className="mx-auto mt-16 mb-8 relative"
        style={{ width: ORBIT_SIZE, height: ORBIT_SIZE }}
      >
        {/* Outer orbit ring */}
        <View
          className="mx-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 border-dashed"
          style={{ width: ORBIT_SIZE * 0.68, height: ORBIT_SIZE * 0.68 }}
        />

        {/* Inner orbit ring */}
        <View
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5"
          style={{ width: ORBIT_SIZE * 0.98, height: ORBIT_SIZE * 0.98 }}
        />

        {/* Center hub */}
        <TouchableOpacity
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-turquoise shadow-glow-cyan rounded-full items-center justify-center border-4 border-background z-20"
          style={{ width: CENTER_SIZE, height: CENTER_SIZE }}
        >
          <Ionicons name="medkit" size={28} color="#0a1416" />
          <Text className="text-sm font-bold text-black">Antibiotics</Text>
          <Text className="text-[10px] text-black/70">128 Meds</Text>
        </TouchableOpacity>

        {/* Orbit buttons positioned around */}
        <OrbitButton category={categories[0]} size={BUTTON_SIZE} top="0%" left="50%" />
        <OrbitButton category={categories[1]} size={BUTTON_SIZE} top="14.6%" left="82%" />
        <OrbitButton category={categories[2]} size={BUTTON_SIZE} top="50%" left="95%" />
        <OrbitButton category={categories[3]} size={BUTTON_SIZE} top="85.4%" left="82%" />
        <OrbitButton category={categories[4]} size={BUTTON_SIZE} top="100%" left="50%" />
        <OrbitButton category={categories[5]} size={BUTTON_SIZE} top="85.4%" left="18%" />
        <OrbitButton category={categories[6]} size={BUTTON_SIZE} top="50%" left="5%" />
        <OrbitButton category={categories[7]} size={BUTTON_SIZE} top="14.6%" left="18%" />
      </View>
    </View>
  );
};

// Recent Inquiry Item Component
const RecentInquiryItem = ({ inquiry }: { inquiry: RecentInquiry }) => (
  <TouchableOpacity className="flex-row items-center gap-3 p-3 rounded-2xl bg-teal-medium border border-white/5">
    <View className="w-10 h-10 rounded-full bg-turquoise/10 items-center justify-center">
      <Ionicons name="time-outline" size={18} color="#2dd4bf" />
    </View>
    <View className="flex-1">
      <Text className="text-sm font-medium text-white">{inquiry.question}</Text>
      <Text className="text-xs text-gray-muted">
        Asked {inquiry.timestamp} {inquiry.viaVoice && 'via Voice'}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#6b7280" />
  </TouchableOpacity>
);

// Recent Inquiries Component
const RecentInquiries = () => {
  const inquiries: RecentInquiry[] = [
    { id: '1', question: 'Side effects of Ibuprofen', timestamp: 'today', viaVoice: true },
    { id: '2', question: 'Amoxicillin dosage for kids', timestamp: 'yesterday', viaVoice: false },
  ];

  return (
    <View className="px-6 pb-6">
      <Text className="text-lg font-bold text-white mb-3">Recent Inquiries</Text>
      <View className="flex flex-col gap-2">
        {inquiries.map((inquiry) => (
          <RecentInquiryItem key={inquiry.id} inquiry={inquiry} />
        ))}
      </View>
    </View>
  );
};



// Background Effects Component
const BackgroundEffects = () => (
  <View className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
    <View className="absolute top-[-10%] right-[-20%] w-[400px] h-[400px] bg-turquoise/5 rounded-full blur-[100px]" />
    <View className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-cyan/5 rounded-full blur-[80px]" />
  </View>
);

// Main Index Component
export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1416" />
      <BackgroundEffects />

      <ScrollView
        className="flex-1 relative z-10"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-40"
        stickyHeaderIndices={[1]}
      >
        <Header />
        <View className="bg-background/95 backdrop-blur-sm">
          <SearchBar />
        </View>
        <CategoryPills />
        <OrbitNavigation />
        <RecentInquiries />
      </ScrollView>
    </SafeAreaView>
  );
}
