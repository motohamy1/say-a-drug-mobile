import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native';
import { Drug } from '../services/drugService';

type DrugCardProps = {
  drug: Drug;
  onPress: () => void;
  accentColor?: string;
};

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Heart: 'heart',
  GIT: 'restaurant',
  Fever: 'thermometer',
  Neuro: 'nutrition',
  Skin: 'body',
  Women: 'woman',
  Lungs: 'leaf',
};

const categoryColors: Record<string, string> = {
  Heart: '#ff6b6b',
  GIT: '#feca57',
  Fever: '#54a0ff',
  Neuro: '#1dd1a1',
  Skin: '#5f27cd',
  Women: '#ff9ff3',
  Lungs: '#48dbfb',
};

export const DrugCard: React.FC<DrugCardProps> = ({ drug, onPress, accentColor }) => {
  const category = drug.Category || 'More';
  const icon = categoryIcons[category] || 'medkit';
  const color = accentColor || categoryColors[category] || '#2dd4bf';

  // Get display name (prefer trade_name, fallback to Drugname)
  const displayName = drug.trade_name || drug.Drugname || 'Unknown Drug';

  // Get price to display
  const price = drug.price ?? drug.Price;
  const priceText = price ? `${price} ${drug.currency || 'EGP'}` : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[48%] bg-teal-medium rounded-2xl border border-white/5 p-3 shadow-sm"
      activeOpacity={0.7}
    >
      {/* Icon area */}
      <View className="w-10 h-10 rounded-full bg-teal-dark items-center justify-center mb-2">
        <Ionicons name={icon} size={18} color={color} />
      </View>

      {/* Drug name - truncate if too long */}
      <Text className="text-white text-sm font-semibold mb-1" numberOfLines={2}>
        {displayName}
      </Text>

      {/* Price or manufacturer */}
      {priceText && (
        <Text className="text-turquoise text-xs font-medium">{priceText}</Text>
      )}
      {!priceText && drug.manufacturer && (
        <Text className="text-gray-muted text-xs" numberOfLines={1}>
          {drug.manufacturer}
        </Text>
      )}
    </TouchableOpacity>
  );
};
