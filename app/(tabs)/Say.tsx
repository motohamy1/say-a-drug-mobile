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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Medicine Card Component
const MedicineCard: React.FC<{ data: MedicineCardData }> = ({ data }) => (
  <View className="bg-medicine-card rounded-2xl overflow-hidden shadow-card mt-3 mb-1 border border-charcoal/30">
    <View className="h-32 bg-gradient-to-b from-teal-medium to-medicine-card relative justify-center items-center">
      <View className="w-16 h-24 rounded-t-xl rounded-b-3xl bg-gradient-to-b from-gold-light/20 to-gold-warm/5 border-2 border-gold/40 items-center justify-center">
        <Ionicons name="flask-outline" size={32} color="#ffd33d" opacity={0.5} />
      </View>
    </View>
    <View className="p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-lg font-semibold">{data.name}</Text>
        </View>
        <View className="px-2 py-1 bg-turquoise/20 rounded-full">
          <Text className="text-turquoise text-[10px] font-bold uppercase">{data.tag}</Text>
        </View>
      </View>
      <View className="h-px bg-charcoal/30 mb-3" />
      <View className="bg-teal-medium/30 rounded-xl p-3 flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-full bg-cyan/20 items-center justify-center">
          <Ionicons name="medkit-outline" size={18} color="#22d3ee" />
        </View>
        <View>
          <Text className="text-gray-muted text-[10px] uppercase">Dosage</Text>
          <Text className="text-cyan-bright font-bold">{data.dose}</Text>
          <Text className="text-gray-muted text-[10px]">{data.frequency}</Text>
        </View>
      </View>
    </View>
  </View>
);

// Chat Bubble Component
const ChatBubble: React.FC<{ message: Message }> = ({ message }) => (
  <View className={`flex-row ${message.isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
    <View className={`max-w-[85%] ${message.isUser ? 'items-end' : 'items-start'}`}>
      <View className={`px-4 py-3 rounded-2xl ${message.isUser
        ? 'bg-turquoise rounded-tr-none'
        : 'bg-teal-medium/50 border border-charcoal/20 rounded-tl-none'
        }`}>
        <Text className={`text-base leading-6 ${message.isUser ? 'text-black font-medium' : 'text-gray-200'}`}>
          {message.text}
        </Text>
      </View>
      <Text className="text-gray-muted text-[10px] mt-1 mx-1">{message.timestamp}</Text>
      {message.medicineCard && <MedicineCard data={message.medicineCard} />}
    </View>
  </View>
);

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
