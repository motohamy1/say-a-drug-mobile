import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { Layout, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryColors, categoryIcons } from '../../components/DrugCard';
import { aiService } from '../../services/aiService';
import { drugService } from '../../services/drugService';

// Types
type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  medicineCard?: MedicineCardData;
};

type MedicineCardData = {
  name: string;
  dose: string;
  frequency: string;
  tag: string;
};

// AI Response Card Component
const AiResponseCard: React.FC<{ text: string; delay?: number; isGrid?: boolean }> = ({ text, delay = 0, isGrid = false }) => {
  const lines = text.split('\n').filter(line => line.includes('::'));

  if (lines.length === 0) return null;

  // Extract data for header
  const data: Record<string, { english: string; arabic: string }> = {};
  lines.forEach(line => {
    const [label, values] = line.replace(/^[●\-\s]+/, '').split('::');
    if (label && values) {
      const [english, arabic] = values.split('|').map(v => v.trim());
      data[label.trim().toLowerCase()] = { english, arabic };
    }
  });

  const category = data['category']?.english || 'More';
  const icon = categoryIcons[category] || 'medkit';
  const color = categoryColors[category] || '#2dd4bf';
  const tradeName = data['trade_name']?.english || 'Unknown Drug';

  return (
    <Animated.View
      entering={ZoomIn.duration(500).delay(delay).springify()}
      layout={Layout.springify()}
      style={{ width: isGrid ? '48%' : '100%' }}
      className="bg-teal-medium rounded-2xl border border-white/5 p-3 shadow-medicine-card mb-2"
    >
      {/* Icon Area - Matching DrugCard */}
      <View className="w-10 h-10 rounded-full bg-teal-dark items-center justify-center mb-2">
        <Ionicons name={icon} size={18} color={color} />
      </View>

      {/* Main Content Area */}
      <View className="gap-2">
        <Text className="text-white text-sm font-semibold mb-1" numberOfLines={isGrid ? 2 : undefined}>
          {tradeName}
        </Text>

        {!isGrid && (
          <View className="gap-3 mt-1">
            {Object.entries(data).map(([key, val], idx) => {
              if (key === 'trade_name' || key === 'category') return null;
              const cleanLabel = key.replace(/_/g, ' ');

              return (
                <View key={idx} className="flex-col gap-0.5">
                  <Text className="text-gray-muted text-[10px] font-bold uppercase tracking-tighter">
                    {cleanLabel}
                  </Text>
                  <View className="flex-col">
                    <Text className="text-green-400 text-xs font-semibold">{val.english}</Text>
                    {val.arabic && (
                      <Text className="text-green-300 text-xs font-medium text-right font-arabic">
                        {val.arabic}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {isGrid && data['form'] && (
          <Text className="text-turquoise text-[10px] font-medium" numberOfLines={1}>
            {data['form'].english}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

// Medicine Card Component
// const MedicineCard: React.FC<{ data: MedicineCardData }> = ({ data }) => (
//   <Animated.View
//     entering={FadeInUp.delay(200).duration(400)}
//     className="bg-medicine-card rounded-2xl overflow-hidden shadow-card mt-3 mb-1 border border-charcoal/30 flex-row"
//   >
//     <View className="w-24 bg-gradient-to-b from-teal-medium to-medicine-card justify-center items-center p-3">
//       <View className="w-12 h-18 rounded-t-lg rounded-b-2xl bg-gradient-to-b from-gold-light/20 to-gold-warm/5 border-2 border-gold/40 items-center justify-center">
//         <Ionicons name="flask-outline" size={24} color="#ffd33d" opacity={0.5} />
//       </View>
//     </View>
//     <View className="flex-1 p-4">
//       <View className="flex-row items-center justify-between mb-2">
//         <Text className="text-white text-base font-semibold flex-1 mr-2">{data.name}</Text>
//         <View className="px-2 py-0.5 bg-turquoise/20 rounded-full">
//           <Text className="text-turquoise text-[8px] font-bold uppercase">{data.tag}</Text>
//         </View>
//       </View>
//       <View className="h-px bg-charcoal/30 mb-2" />
//       <View className="bg-teal-medium/30 rounded-xl p-2 flex-row items-center gap-2">
//         <View className="w-6 h-6 rounded-full bg-cyan/20 items-center justify-center">
//           <Ionicons name="medkit-outline" size={14} color="#22d3ee" />
//         </View>
//         <View>
//           <Text className="text-cyan-bright text-xs font-bold">{data.dose}</Text>
//           <Text className="text-gray-muted text-[9px]">{data.frequency}</Text>
//         </View>
//       </View>
//     </View>
//   </Animated.View>
// );

// Chat Bubble Component
const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isAi = !message.isUser;

  if (isAi) {
    // 1. Debug: Log the AI response to help identify formatting issues
    console.log("Raw AI Response:", message.text);

    // 2. Identify segments
    // Split by the explicit block tag if present
    let rawSegments = message.text.split('[[DRUG_BLOCK]]').map(s => s.trim()).filter(s => s.length > 0);

    // Fallback: If no blocks but we see structural markers, treat the whole thing as one block
    if (rawSegments.length === 1 && !message.text.includes('[[DRUG_BLOCK]]') && message.text.includes('::')) {
      // If it contains a trade name, it's likely a drug card that missed its wrapper
      if (message.text.includes('trade_name::')) {
        rawSegments = [message.text];
      }
    }

    const structuredBlocks = rawSegments.filter(s => s.includes('trade_name::'));
    const isGrid = structuredBlocks.length > 1;

    return (
      <View className="mb-4 px-4 w-full flex-row flex-wrap justify-between">
        {rawSegments.map((segment, index) => {
          const isStructured = segment.includes('trade_name::');

          if (!isStructured) {
            // Conversational text (bubble) - Use w-full to prevent cards from sitting next to it
            const cleanText = segment.split('disclaimer::')[0].trim();
            if (cleanText.length === 0) return null;

            return (
              <View key={`text-${index}`} className="w-full flex-row justify-start mb-3">
                <View className="bg-teal-medium/50 border border-charcoal/20 px-4 py-3 rounded-2xl rounded-tl-none max-w-[90%]">
                  <Text className="text-base leading-6 text-gray-200">{cleanText}</Text>
                </View>
              </View>
            );
          } else {
            // Structured drug info (card)
            return (
              <AiResponseCard
                key={`card-${index}`}
                text={segment}
                delay={index * 150}
                isGrid={isGrid}
              />
            );
          }
        })}

        {/* Render disclaimer at the very bottom if it exists anywhere in the raw text */}
        {message.text.includes('disclaimer::') && (
          <View className="w-full mt-2 px-1">
            <Text className="text-gray-muted text-[10px] italic">
              {message.text.split('disclaimer::')[1]?.split('|')[0]?.trim()}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Fallback for user messages
  return (
    <View className="flex-row justify-end mb-4 px-4">
      <View className="max-w-[90%] items-end">
        <View className="bg-turquoise px-4 py-3 rounded-2xl rounded-tr-none shadow-sm">
          <Text className="text-base leading-6 text-black font-medium">{message.text}</Text>
        </View>
      </View>
    </View>
  );
};

const Say = () => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm Pharma DrugFriend, your specialized medical AI. Ask me about any medication and I'll extract information from our records.",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const query = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: query,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Scroll to new user message
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // 1. Get AI response (RAG)
      const aiResponse = await aiService.sendMessageByText(query);

      // 2. Try to find a drug record for the medicine card
      const drug = await drugService.searchDrug(query);

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        medicineCard: drug ? {
          name: drug.trade_name || 'Unknown Medication',
          dose: 'Consult doctor',
          frequency: drug.Category || 'See packaging',
          tag: drug.Category || 'Medicine',
        } : undefined,
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I encountered an error. Please check your connection or try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-6 py-4 border-b border-charcoal/30 bg-deep-teal/40">
        <View className="w-10 h-10 rounded-full bg-turquoise/10 items-center justify-center border border-turquoise/30 mr-3">
          <Ionicons name="medical" size={20} color="#2dd4bf" />
        </View>
        <View>
          <Text className="text-white font-bold text-lg">DrugFriend</Text>
          <Text className="text-turquoise text-[10px] font-bold uppercase tracking-widest">Medical Intelligence</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          className="flex-1"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={{ paddingVertical: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={isTyping ? (
            <View className="flex-row justify-start mb-4 px-4">
              <View className="bg-teal-medium/30 px-4 py-3 rounded-2xl rounded-tl-none border border-charcoal/10">
                <ActivityIndicator size="small" color="#2dd4bf" />
              </View>
            </View>
          ) : null}
          keyboardShouldPersistTaps="handled"
        />

        <View className="p-4 bg-deep-teal/20 border-t border-charcoal/20" style={{ paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : insets.bottom + 12 }}>
          <View className="flex-row items-center bg-teal-medium/40 rounded-2xl px-2 py-2 border border-charcoal/30 shadow-bubble">
            <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center mr-2">
              <Ionicons name="mic" size={22} color="#9ca3af" />
            </TouchableOpacity>

            <TextInput
              className="flex-1 text-white text-base py-1"
              placeholder="Ask me as your DrugFriend..."
              placeholderTextColor="#6b7280"
              value={inputText}
              onChangeText={setInputText}
              multiline={true}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim()}
              className={`w-10 h-10 rounded-full items-center justify-center ${inputText.trim() ? 'bg-turquoise' : 'bg-charcoal/50'}`}
            >
              <Ionicons name="paper-plane" size={18} color={inputText.trim() ? '#0a1416' : '#9ca3af'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Say;
