import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Types
type StatCard = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
};

// Top App Bar Component
const TopAppBar = () => (
  <View className="flex-row items-center justify-between px-4 py-4 pb-2 bg-background/95 backdrop-blur-md border-b border-charcoal/20">
    <Text className="text-xl font-bold tracking-tight flex-1">Profile</Text>
    <View className="flex-row items-center gap-3">
      <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center">
        <Ionicons name="notifications-outline" size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center">
        <Ionicons name="settings-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

// Profile Header Component
const ProfileHeader = () => (
  <View className="flex-col items-center p-6 gap-6 w-full">
    <View className="relative">
      {/* Avatar Glow */}
      <View className="absolute inset-0 bg-turquoise/30 blur-xl rounded-full scale-110" />

      {/* Avatar Container */}
      <View className="relative w-32 h-32 rounded-full border-4 border-teal-medium shadow-xl items-center justify-center bg-teal-medium">
        <Ionicons name="person" size={60} color="#9ca3af" />
      </View>

      {/* Online/AI Active Indicator */}
      <View className="absolute bottom-1 right-1 w-6 h-6 bg-turquoise rounded-full border-4 border-background items-center justify-center">
        <Ionicons name="flash" size={10} color="#0a1416" />
      </View>
    </View>

    <View className="flex-col items-center gap-1">
      <View className="flex-row items-center gap-2">
        <Text className="text-2xl font-bold leading-tight text-white">Jane Doe</Text>
        <View className="px-2 py-0.5 rounded-full bg-turquoise/20 border border-turquoise/20">
          <Text className="text-turquoise text-[10px] font-bold">PRO</Text>
        </View>
      </View>
      <Text className="text-gray-muted text-sm font-medium">Member since 2023</Text>
    </View>

    <TouchableOpacity className="w-full max-w-[200px] h-11 rounded-full bg-teal-medium border border-white/10 flex-row items-center justify-center shadow-sm">
      <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text className="text-sm font-bold text-white">Edit Profile</Text>
    </TouchableOpacity>
  </View>
);

// Stat Card Component
const StatCard = ({ stat }: { stat: StatCard }) => (
  <View className="w-[45%] flex-col gap-3 rounded-2xl p-5 bg-teal-medium border border-charcoal/20 shadow-sm">
    <View className="flex-row items-center gap-2">
      <Ionicons name={stat.icon} size={18} color={stat.color} />
      <Text className="text-[10px] font-bold uppercase tracking-wider opacity-80" style={{ color: stat.color }}>
        {stat.title}
      </Text>
    </View>
    <View>
      <Text className="text-3xl font-bold tracking-tight text-white">{stat.value}</Text>
      <Text className="text-[10px] text-gray-muted mt-1">{stat.subtitle}</Text>
    </View>
  </View>
);

// Stats Section Component
const StatsSection = () => {
  const stats: StatCard[] = [
    {
      id: '1',
      title: 'Active',
      value: '3',
      subtitle: 'Prescriptions',
      icon: 'medkit',
      color: '#2dd4bf',
    },
    {
      id: '2',
      title: 'Refill',
      value: 'Oct 24',
      subtitle: 'Next Due Date',
      icon: 'calendar',
      color: '#fb923c',
    },
    {
      id: '3',
      title: 'Allergies',
      value: '2',
      subtitle: 'Known Triggers',
      icon: 'warning',
      color: '#fb7185',
    },
  ];

  return (
    <View className="w-full px-4 mb-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pb-4"
      >
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </ScrollView>
    </View>
  );
};

// Menu Item Component
const MenuItem = ({
  item,
  onToggle,
}: {
  item: MenuItem;
  onToggle?: () => void;
}) => (
  <TouchableOpacity
    className="flex-row items-center gap-4 p-4 active:bg-white/5"
    onPress={() => !item.hasToggle && Haptics.selectionAsync()}
  >
    <View className={`w-10 h-10 rounded-xl items-center justify-center ${item.bgColor}`}>
      <Ionicons name={item.icon} size={20} color={item.iconColor} />
    </View>
    <View className="flex-1">
      <Text className="text-base font-semibold text-white">{item.title}</Text>
      {item.subtitle && (
        <Text className="text-[10px] text-gray-muted">{item.subtitle}</Text>
      )}
    </View>
    {item.hasToggle ? (
      <Switch
        value={item.toggleValue}
        onValueChange={onToggle}
        trackColor={{ false: '#1a2f35', true: '#2dd4bf' }}
        thumbColor={item.toggleValue ? '#0a1416' : '#9ca3af'}
      />
    ) : (
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    )}
  </TouchableOpacity>
);

// Menu Section Component
const MenuSection = ({
  title,
  icon,
  items,
  onToggle,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  items: MenuItem[];
  onToggle?: (itemId: string) => void;
}) => (
  <View className="flex-col gap-2 px-4 py-2">
    {icon ? (
      <View className="flex-row items-center gap-2 px-2 py-2">
        <Ionicons name={icon} size={20} color="#2dd4bf" />
        <Text className="text-lg font-bold text-white">{title}</Text>
      </View>
    ) : (
      <Text className="text-lg font-bold px-2 py-2 text-white">{title}</Text>
    )}
    <View className="flex-col bg-teal-medium rounded-2xl overflow-hidden shadow-sm">
      {items.map((item, index) => (
        <View key={item.id}>
          <MenuItem
            item={item}
            onToggle={() => onToggle && onToggle(item.id)}
          />
          {index < items.length - 1 && (
            <View className="h-px bg-charcoal/30 mx-4" />
          )}
        </View>
      ))}
    </View>
  </View>
);

// Bottom Navigation Component
const BottomNavigation = () => (
  <View className="absolute bottom-0 left-0 right-0 h-[88px] bg-teal-dark/80 backdrop-blur-lg border-t border-charcoal/20 z-50">
    <View className="flex-row items-center justify-around h-16">
      <TouchableOpacity className="flex-col items-center justify-center w-full h-full gap-1">
        <Ionicons name="home" size={24} color="#9ca3af" />
        <Text className="text-[10px] font-medium text-gray-muted">Home</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center justify-center w-full h-full gap-1">
        <Ionicons name="medkit" size={24} color="#9ca3af" />
        <Text className="text-[10px] font-medium text-gray-muted">Pharmacy</Text>
      </TouchableOpacity>

      {/* Floating AI Button */}
      <View className="relative -top-5">
        <TouchableOpacity
          className="w-14 h-14 bg-turquoise rounded-full items-center justify-center shadow-glow-cyan"
          onPress={() => router.push('/(tabs)/Say')}
        >
          <Ionicons name="sparkles" size={28} color="#0a1416" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="flex-col items-center justify-center w-full h-full gap-1"
        onPress={() => router.push('/(tabs)/Say')}
      >
        <Ionicons name="chatbubbles" size={24} color="#9ca3af" />
        <Text className="text-[10px] font-medium text-gray-muted">Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center justify-center w-full h-full gap-1">
        <Ionicons name="person" size={24} color="#2dd4bf" />
        <Text className="text-[10px] font-bold text-white">Profile</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Main Profile Component
const Profile = () => {
  const [voiceOutput, setVoiceOutput] = useState(true);

  // My Health menu items
  const healthItems: MenuItem[] = [
    {
      id: 'medical-id',
      title: 'Medical ID',
      subtitle: 'Blood type, weight, height',
      icon: 'finger-print',
      iconColor: '#3b82f6',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'insurance',
      title: 'Insurance Cards',
      subtitle: 'Primary and secondary',
      icon: 'card',
      iconColor: '#a855f7',
      bgColor: 'bg-purple-500/10',
    },
    {
      id: 'past-orders',
      title: 'Past Orders',
      icon: 'time-outline',
      iconColor: '#10b981',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  // AI Settings menu items
  const aiItems: MenuItem[] = [
    {
      id: 'voice-output',
      title: 'Voice Output',
      subtitle: 'Hear pharmacist responses',
      icon: 'volume-high',
      iconColor: '#2dd4bf',
      bgColor: 'bg-turquoise/10',
      hasToggle: true,
      toggleValue: voiceOutput,
    },
    {
      id: 'personality',
      title: 'Personality',
      subtitle: 'Professional, Friendly, Concise',
      icon: 'happy',
      iconColor: '#ec4899',
      bgColor: 'bg-pink-500/10',
    },
  ];

  // General settings menu items
  const generalItems: MenuItem[] = [
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: 'lock-closed',
      iconColor: '#9ca3af',
      bgColor: 'bg-charcoal/20',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications',
      iconColor: '#9ca3af',
      bgColor: 'bg-charcoal/20',
    },
  ];

  const handleToggle = (itemId: string) => {
    if (itemId === 'voice-output') {
      setVoiceOutput(!voiceOutput);
      Haptics.selectionAsync();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1416" />

      <ScrollView
        className="flex-1 pb-40"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <TopAppBar />
        <ProfileHeader />
        <StatsSection />
        <MenuSection title="My Health" items={healthItems} />
        <MenuSection title="AI Settings" icon="sparkles" items={aiItems} onToggle={handleToggle} />
        <MenuSection title="General" items={generalItems} />

        {/* Danger Zone */}
        <View className="p-6 flex-col items-center gap-4 mt-4">
          <TouchableOpacity className="w-full py-3 rounded-full bg-red-900/10">
            <Text className="text-red-500 text-sm font-bold text-center">Log Out</Text>
          </TouchableOpacity>
          <Text className="text-[10px] text-gray-muted">Version 2.4.0</Text>
        </View>
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
};

export default Profile;
