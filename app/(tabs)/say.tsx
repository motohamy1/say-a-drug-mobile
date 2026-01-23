import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  interpolate,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryColors, categoryIcons } from '../../components/DrugCard';
import { aiService } from '../../services/aiService';

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// AI Response Card Component
const AiResponseCard: React.FC<{ text: string; delay?: number; isGrid?: boolean }> = ({ text, delay = 0, isGrid = false }) => {
  const lines = text.split('\n').filter(line => line.includes('::'));

  if (lines.length === 0) return null;

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
      <View className="w-10 h-10 rounded-full bg-teal-dark items-center justify-center mb-2">
        <Ionicons name={icon} size={18} color={color} />
      </View>

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

// Voice Visualizer Component (Orb)
const VoiceOrb: React.FC<{ isRecording: boolean; isProcessing: boolean; level: number }> = ({ isRecording, isProcessing, level }) => {
  const pulse = useSharedValue(1);
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(withTiming(1.1 + level * 0.4, { duration: 100 }), -1, true);
      ring1.value = withRepeat(withTiming(1.6 + level * 0.8, { duration: 1000 }), -1, true);
      ring2.value = withRepeat(withTiming(2.2 + level * 1.2, { duration: 1500 }), -1, true);
    } else if (isProcessing) {
      pulse.value = withRepeat(withSpring(1.05), -1, true);
      ring1.value = withRepeat(withTiming(1.8, { duration: 2000 }), -1, true);
      ring2.value = withRepeat(withTiming(2.5, { duration: 3000 }), -1, true);
    } else {
      pulse.value = withSpring(1);
      ring1.value = withSpring(1);
      ring2.value = withSpring(1);
    }
  }, [isRecording, isProcessing, level]);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const ring1Styles = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: interpolate(ring1.value, [1, 2], [0.4, 0]),
  }));

  const ring2Styles = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: interpolate(ring2.value, [1, 3], [0.2, 0]),
  }));

  return (
    <View className="items-center justify-center">
      <Animated.View
        style={ring1Styles}
        className="absolute w-40 h-40 rounded-full border-2 border-turquoise/30"
      />
      <Animated.View
        style={ring2Styles}
        className="absolute w-40 h-40 rounded-full border border-turquoise/10"
      />

      <Animated.View
        style={animatedStyles}
        className={`w-36 h-36 rounded-full items-center justify-center shadow-2xl ${isRecording ? 'bg-turquoise' : isProcessing ? 'bg-deep-teal border-2 border-turquoise' : 'bg-teal-medium border border-turquoise/20'}`}
      >
        {isProcessing ? (
          <ActivityIndicator color="#2dd4bf" size="large" />
        ) : (
          <Ionicons
            name={isRecording ? "mic" : "mic-outline"}
            size={56}
            color={isRecording ? "#0a1416" : "#2dd4bf"}
          />
        )}
      </Animated.View>
    </View>
  );
};

// Chat Bubble Component
const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isAi = !message.isUser;
  const router = useRouter();

  if (isAi) {
    let rawSegments = message.text.split('[[DRUG_BLOCK]]').map(s => s.trim()).filter(s => s.length > 0);

    if (rawSegments.length === 1 && !message.text.includes('[[DRUG_BLOCK]]') && message.text.includes('::')) {
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
            let cleanText = segment.split('disclaimer::')[0].trim();
            let calculationDrug = "";
            if (cleanText.includes('[[CALCULATE_DOSAGE]]')) {
              const calcMatch = cleanText.match(/\[\[CALCULATE_DOSAGE\]\]\s*drug_name::(.*?)\s*\[\[\/CALCULATE_DOSAGE\]\]/);
              if (calcMatch) {
                calculationDrug = calcMatch[1].split('|')[0].trim().replace(/[^\x00-\x7F]/g, "").trim();
                cleanText = cleanText.replace(/\[\[CALCULATE_DOSAGE\].*?\[\[\/CALCULATE_DOSAGE\]\]/s, '').trim();
              }
            }

            if (cleanText.length === 0 && !calculationDrug) return null;

            return (
              <View key={`text-${index}`} className="w-full flex-row justify-start mb-3">
                <View className="bg-teal-medium/50 border border-charcoal/20 px-4 py-3 rounded-2xl rounded-tl-none max-w-[90%]">
                  <Text className="text-base leading-6 text-gray-200">{cleanText}</Text>
                  {calculationDrug ? (
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/calculator', params: { drug: calculationDrug } })}
                      className="mt-3 flex-row items-center bg-turquoise px-3 py-2 rounded-xl"
                    >
                      <Ionicons name="calculator" size={16} color="#0a1416" style={{ marginRight: 8 }} />
                      <Text className="text-deep-teal font-bold text-sm">Calculate Dosage for {calculationDrug}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          } else {
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm Pharma DrugFriend. Press and hold the microphone below to talk to me about any medication.",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (isRecording) return;
      if (recordingRef.current) {
        try {
          await (recordingRef.current as Audio.Recording).stopAndUnloadAsync();
        } catch (e) { }
        recordingRef.current = null;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);

        recording.setOnRecordingStatusUpdate((status) => {
          if (status.metering !== undefined) {
            const level = Math.max(0, (status.metering + 160) / 160);
            setRecordingLevel(level);
          }
        });
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
      recordingRef.current = null;
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    const rec = recordingRef.current;
    recordingRef.current = null;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsRecording(false);
      setIsProcessingVoice(true);
      setRecordingLevel(0);

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();

      if (uri) {
        const fileContent = await fetch(uri);
        const blob = await fileContent.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            const result = await aiService.processAudio(base64Audio);
            handleQuery(result.text, result.reply);
          } catch (aiErr) {
            console.error('AI Processing Error:', aiErr);
          } finally {
            setIsProcessingVoice(false);
          }
        };
        reader.readAsDataURL(blob);
      } else {
        setIsProcessingVoice(false);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsProcessingVoice(false);
      setIsRecording(false);
    }
  };

  const handleQuery = (text: string, reply: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: reply,
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);

    const doseWords = ['calculate', 'dose', 'dosage', 'جرعة', 'احسب', 'حساب'];
    const lowerQuery = text.toLowerCase();

    if (doseWords.some(word => lowerQuery.includes(word))) {
      let drugNameCandidate = text;
      doseWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        drugNameCandidate = drugNameCandidate.replace(regex, '');
      });

      ['of', 'for', 'من', 'لـ', 'الـ', 'ل'].forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        drugNameCandidate = drugNameCandidate.replace(regex, '');
      });

      drugNameCandidate = drugNameCandidate.replace(/[^\w\s\u0600-\u06FF]/gi, '').trim();

      if (drugNameCandidate.length > 2) {
        setTimeout(() => {
          router.push({ pathname: '/calculator', params: { drug: drugNameCandidate } });
        }, 1500);
      }
    }
  };

  const handleTextSend = async () => {
    if (!inputText.trim()) return;
    const query = inputText.trim();
    setInputText('');
    setIsTyping(true);

    try {
      const aiResponse = await aiService.sendMessageByText(query);
      handleQuery(query, aiResponse);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = () => {
    setMessages([messages[0]]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-charcoal/30 bg-deep-teal/40">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-turquoise/10 items-center justify-center border border-turquoise/30 mr-3">
            <Ionicons name="medical" size={20} color="#2dd4bf" />
          </View>
          <View>
            <Text className="text-white font-bold text-lg">DrugFriend</Text>
            <Animated.Text className="text-turquoise text-[10px] font-bold uppercase tracking-widest">
              {isRecording ? 'Listening...' : isProcessingVoice ? 'Analyzing Voice...' : 'Voice AI'}
            </Animated.Text>
          </View>
        </View>

        {messages.length > 1 && (
          <TouchableOpacity
            onPress={clearHistory}
            className="w-10 h-10 rounded-full bg-teal-medium/50 items-center justify-center border border-white/5"
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Chat List */}
      <FlatList
        ref={flatListRef}
        className="flex-1"
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={{
          paddingVertical: 20,
          flexGrow: 1
        }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />

      {/* Interaction Controls */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="bg-background/95 border-t border-charcoal/20" style={{ paddingBottom: insets.bottom }}>
          {/* Voice Control Row - Hidden when keyboard is open to save space */}
          {!isKeyboardVisible && (
            <View className="items-center pb-6 pt-4">
              <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopRecording}
                activeOpacity={0.9}
              >
                <VoiceOrb
                  isRecording={isRecording}
                  isProcessing={isProcessingVoice}
                  level={recordingLevel}
                />
              </TouchableOpacity>

              <Text className="text-turquoise/60 font-medium mt-4 uppercase tracking-[4px] text-[10px]">
                {isRecording ? 'Listening...' : isProcessingVoice ? 'Thinking...' : 'Hold to Speak'}
              </Text>
            </View>
          )}

          {/* Text Input Row */}
          <View className={`px-4 ${isKeyboardVisible ? 'py-3' : 'pb-6'}`}>
            <View className="flex-row items-center bg-teal-medium/30 rounded-2xl px-2 py-1.5 border border-charcoal/30">
              <TextInput
                className="flex-1 text-white text-base py-1 px-3"
                placeholder="Type a message..."
                placeholderTextColor="#6b7280"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleTextSend}
              />
              <TouchableOpacity
                onPress={handleTextSend}
                disabled={!inputText.trim()}
                className={`w-9 h-9 rounded-full items-center justify-center ${inputText.trim() ? 'bg-turquoise' : 'bg-charcoal/50'}`}
              >
                <Ionicons name="send" size={16} color={inputText.trim() ? '#0a1416' : '#9ca3af'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Say;
