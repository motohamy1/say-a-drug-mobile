import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Drug } from '../services/drugService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type DrugDetailModalProps = {
  drug: Drug | null;
  visible: boolean;
  onClose: () => void;
};

export const DrugDetailModal: React.FC<DrugDetailModalProps> = ({ drug, visible, onClose }) => {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);

  if (!drug) return null;

  const displayName = drug.trade_name || drug.Drugname || 'Unknown Drug';
  const scientificName = drug.scientific_name;
  const description = drug.description;
  const price = drug.price ?? drug.Price;
  const manufacturer = drug.manufacturer || drug.Company;
  const activeIngredients = drug.active_ingredients;
  const dosageForm = drug.dosage_form || drug.Form;
  const strength = drug.strength;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/60"
        onPress={onClose}
      >
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
          }}
          className="absolute bottom-0 left-0 right-0 bg-teal-medium rounded-t-3xl border-t border-white/10"
        >
          {/* Handle bar */}
          <View className="items-center py-3 border-b border-white/5">
            <View className="w-10 h-1 bg-gray-muted rounded-full" />
          </View>

          <SafeAreaView className="flex-1" edges={['bottom']}>
            <ScrollView className="px-6 pt-2 pb-8" showsVerticalScrollIndicator={false}>
              {/* Header with close button */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-white flex-1" numberOfLines={2}>
                  {displayName}
                </Text>
                <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                  <Ionicons name="close" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Category badge */}
              {drug.Category && (
                <View className="self-start px-3 py-1 bg-turquoise/20 rounded-full mb-4">
                  <Text className="text-turquoise text-xs font-bold uppercase">
                    {drug.Category}
                  </Text>
                </View>
              )}

              {/* Scientific name */}
              {scientificName && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-muted uppercase mb-1">Scientific Name</Text>
                  <Text className="text-white text-sm">{scientificName}</Text>
                </View>
              )}

              {/* Price */}
              {price != null && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-muted uppercase mb-1">Price</Text>
                  <Text className="text-turquoise text-lg font-bold">
                    {price} {drug.currency || 'EGP'}
                  </Text>
                </View>
              )}

              {/* Manufacturer */}
              {manufacturer && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-muted uppercase mb-1">Manufacturer</Text>
                  <Text className="text-white text-sm">{manufacturer}</Text>
                </View>
              )}

              {/* Strength */}
              {strength && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-muted uppercase mb-1">Strength</Text>
                  <Text className="text-white text-sm">{strength}</Text>
                </View>
              )}

              {/* Dosage Form */}
              {dosageForm && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-muted uppercase mb-1">Dosage Form</Text>
                  <Text className="text-white text-sm">{dosageForm}</Text>
                </View>
              )}

              {/* Active Ingredients */}
              {activeIngredients && activeIngredients.length > 0 && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-muted uppercase mb-2">Active Ingredients</Text>
                  <View className="flex flex-wrap gap-2">
                    {activeIngredients.map((ingredient, index) => (
                      <View
                        key={index}
                        className="px-3 py-1.5 bg-teal-dark rounded-xl border border-white/5"
                      >
                        <Text className="text-white text-xs">{ingredient}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Description */}
              {description && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-muted uppercase mb-1">Description</Text>
                  <Text className="text-white text-sm leading-relaxed">{description}</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};
