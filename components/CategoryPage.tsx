import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Drug, drugService } from '../services/drugService';
import { DrugCard } from './DrugCard';
import { DrugDetailModal } from './DrugDetailModal';

type CategoryPageProps = {
  categoryName: string;
  categoryIcon: keyof typeof Ionicons.glyphMap;
  categoryColor: string;
};

type CategoryInfo = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const categories: Record<string, CategoryInfo> = {
  heart: { name: 'Heart', icon: 'heart', color: '#ff6b6b' },
  git: { name: 'GIT', icon: 'restaurant', color: '#feca57' },
  fever: { name: 'Fever', icon: 'thermometer', color: '#54a0ff' },
  neuro: { name: 'Neuro', icon: 'nutrition', color: '#1dd1a1' },
  skin: { name: 'Skin', icon: 'body', color: '#5f27cd' },
  women: { name: 'Women', icon: 'woman', color: '#ff9ff3' },
  lungs: { name: 'Lungs', icon: 'leaf', color: '#48dbfb' },
};

// Map UI categories to DB categories
const uiToDbCategoryMap: Record<string, string[]> = {
  'Heart': ['Painkiller'], // Placeholder mapping
  'GIT': ['Painkiller'],
  'Fever': ['Painkiller'],
  'Neuro': ['Vitamin'],
  'Skin': ['Antifungal'],
  'Women': ['Vitamin'],
  'Lungs': ['Antibiotic'],
};

export const CategoryPage: React.FC<CategoryPageProps> = ({
  categoryName,
  categoryIcon,
  categoryColor,
}) => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchDrugs();
  }, [categoryName]);

  const fetchDrugs = async () => {
    setLoading(true);
    try {
      const dbCategories = uiToDbCategoryMap[categoryName] || [categoryName];
      let allDrugs: Drug[] = [];

      for (const dbCat of dbCategories) {
        const data = await drugService.searchDrugs(dbCat);
        allDrugs = [...allDrugs, ...data];
      }

      // Remove duplicates and filter
      const uniqueDrugs = Array.from(new Set(allDrugs.map(d => d.id)))
        .map(id => allDrugs.find(d => d.id === id)!);

      setDrugs(uniqueDrugs);
    } catch (error) {
      console.error('Error fetching drugs:', error);
      setDrugs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrugPress = useCallback((drug: Drug) => {
    setSelectedDrug(drug);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedDrug(null);
  }, []);

  const renderDrugCard = useCallback(({ item }: { item: Drug }) => {
    return (
      <DrugCard
        drug={item}
        onPress={() => handleDrugPress(item)}
        accentColor={categoryColor}
      />
    );
  }, [categoryColor, handleDrugPress]);

  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View className="flex-1 items-center justify-center px-12">
        <View className="w-20 h-20 rounded-full bg-teal-medium items-center justify-center mb-4">
          <Ionicons name={categoryIcon} size={36} color={categoryColor} />
        </View>
        <Text className="text-white text-lg font-semibold mb-2">No Drugs Found</Text>
        <Text className="text-gray-muted text-sm text-center">
          No drugs found in the {categoryName} category. Check back later.
        </Text>
      </View>
    );
  };

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#2dd4bf" />
      <Text className="text-gray-muted text-sm mt-3">Loading drugs...</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1416" />

      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="text-white text-xl font-bold">{categoryName}</Text>
          <Text className="text-gray-muted text-xs">
            {drugs.length} {drugs.length === 1 ? 'drug' : 'drugs'} found
          </Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-teal-medium items-center justify-center">
          <Ionicons name={categoryIcon} size={20} color={categoryColor} />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        renderLoadingState()
      ) : drugs.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={drugs}
          renderItem={renderDrugCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            padding: 24,
            paddingBottom: 100,
            gap: 16,
          }}
          columnWrapperStyle={{
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Drug Detail Modal */}
      <DrugDetailModal
        drug={selectedDrug}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
};
