import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { categoryColors, categoryIcons } from "../../components/DrugCard";
import { aiService } from "../../services/aiService";

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// AI Response Card Component
const normalizeCategoryKey = (rawCategory: string) =>
  rawCategory.trim().toLowerCase();
const getCategoryColor = (rawCategory: string) => {
  const fallback = "#2dd4bf";
  if (!rawCategory || rawCategory.trim().length === 0) return fallback;

  const exact = categoryColors[rawCategory];
  if (exact) return exact;

  const normalized = normalizeCategoryKey(rawCategory);
  const matched = Object.entries(categoryColors).find(
    ([key]) => key.toLowerCase() === normalized,
  );
  if (matched) return matched[1];

  const looseMatch = Object.entries(categoryColors).find(
    ([key]) =>
      key.toLowerCase().includes(normalized) ||
      normalized.includes(key.toLowerCase()),
  );
  if (looseMatch) return looseMatch[1];

  return categoryColors["More"] || fallback;
};

const AiResponseCard: React.FC<{
  text: string;
  delay?: number;
  isGrid?: boolean;
}> = ({ text, delay = 0, isGrid = false }) => {
  const lines = text.split("\n").filter((line) => line.includes("::"));

  if (lines.length === 0) return null;

  const data: Record<string, { english: string; arabic: string }> = {};
  lines.forEach((line) => {
    const [label, values] = line.replace(/^[●\-\s]+/, "").split("::");
    if (label && values) {
      const [english, arabic] = values.split("|").map((v) => v.trim());
      data[label.trim().toLowerCase()] = { english, arabic };
    }
  });

  const category = data["category"]?.english || "More";
  const icon = categoryIcons[category] || "medkit";
  const color = getCategoryColor(category);
  const tradeName = data["trade_name"]?.english || "Unknown Drug";

  const backgroundShade = color.length === 7 ? `${color}25` : color;

  return (
    <Animated.View
      entering={ZoomIn.duration(500).delay(delay).springify()}
      layout={Layout.springify()}
      style={{
        width: isGrid ? "48%" : "100%",
        backgroundColor: backgroundShade,
        borderColor: color,
      }}
      className="rounded-2xl border p-3 shadow-medicine-card mb-2"
    >
      <View
        style={{ backgroundColor: backgroundShade }}
        className="w-10 h-10 rounded-full items-center justify-center mb-2"
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <View className="gap-2">
        <Text
          style={{ color: color }}
          className="text-sm font-semibold mb-1"
          numberOfLines={isGrid ? 2 : undefined}
        >
          {tradeName}
        </Text>

        {!isGrid && (
          <View className="gap-3 mt-1">
            {Object.entries(data).map(([key, val], idx) => {
              if (key === "trade_name" || key === "category") return null;
              const cleanLabel = key.replace(/_/g, " ");

              return (
                <View key={idx} className="flex-col gap-0.5">
                  <Text className="text-gray-muted text-[10px] font-bold uppercase tracking-tighter">
                    {cleanLabel}
                  </Text>
                  <View className="flex-col">
                    <Text className="text-green-400 text-xs font-semibold">
                      {val.english}
                    </Text>
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

        {isGrid && data["form"] && (
          <Text
            className="text-turquoise text-[10px] font-medium"
            numberOfLines={1}
          >
            {data["form"].english}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

// Voice Visualizer Component (Orb)
const VoiceOrb: React.FC<{
  isRecording: boolean;
  isProcessing: boolean;
  level: number;
}> = ({ isRecording, isProcessing, level }) => {
  const pulse = useSharedValue(1);
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withTiming(1.1 + level * 0.4, { duration: 100 }),
        -1,
        true,
      );
      ring1.value = withRepeat(
        withTiming(1.6 + level * 0.8, { duration: 1000 }),
        -1,
        true,
      );
      ring2.value = withRepeat(
        withTiming(2.2 + level * 1.2, { duration: 1500 }),
        -1,
        true,
      );
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
        className={`w-36 h-36 rounded-full items-center justify-center shadow-2xl ${isRecording ? "bg-turquoise" : isProcessing ? "bg-deep-teal border-2 border-turquoise" : "bg-teal-medium border border-turquoise/20"}`}
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

// Medical section config: each heading gets a unique color + accent
const SECTION_CONFIG: Record<
  string,
  { color: string; border: string; icon: string; label: string }
> = {
  // --- Clinical case / disease ---
  "CLINICAL ASSESSMENT": {
    color: "#38bdf8",
    border: "#0ea5e9",
    icon: "clipboard-outline",
    label: "Clinical Assessment",
  },
  "DIFFERENTIAL DIAGNOSIS": {
    color: "#f472b6",
    border: "#ec4899",
    icon: "git-branch-outline",
    label: "Differential Diagnosis",
  },
  "INVESTIGATIONS / WORKUP": {
    color: "#34d399",
    border: "#10b981",
    icon: "pulse-outline",
    label: "Investigations / Workup",
  },
  "MANAGEMENT / WORKUP": {
    color: "#34d399",
    border: "#10b981",
    icon: "pulse-outline",
    label: "Management / Workup",
  },
  "RELEVANT MEDICATIONS": {
    color: "#fb923c",
    border: "#f97316",
    icon: "medkit-outline",
    label: "Relevant Medications",
  },
  // --- Scoring systems ---
  OVERVIEW: {
    color: "#a78bfa",
    border: "#7c3aed",
    icon: "document-text-outline",
    label: "Overview",
  },
  "SCORING CRITERIA": {
    color: "#38bdf8",
    border: "#0ea5e9",
    icon: "list-outline",
    label: "Scoring Criteria",
  },
  INTERPRETATION: {
    color: "#34d399",
    border: "#10b981",
    icon: "analytics-outline",
    label: "Interpretation",
  },
  "CLINICAL USE": {
    color: "#fb923c",
    border: "#f97316",
    icon: "medical-outline",
    label: "Clinical Use",
  },
  // --- Drug / medication ---
  "DRUG OVERVIEW": {
    color: "#a78bfa",
    border: "#7c3aed",
    icon: "flask-outline",
    label: "Drug Overview",
  },
  "MECHANISM OF ACTION": {
    color: "#38bdf8",
    border: "#0ea5e9",
    icon: "nuclear-outline",
    label: "Mechanism of Action",
  },
  INDICATIONS: {
    color: "#34d399",
    border: "#10b981",
    icon: "checkmark-circle-outline",
    label: "Indications",
  },
  "DOSAGE AND FORMS": {
    color: "#fbbf24",
    border: "#d97706",
    icon: "calculator-outline",
    label: "Dosage and Forms",
  },
  "SIDE EFFECTS": {
    color: "#f87171",
    border: "#ef4444",
    icon: "warning-outline",
    label: "Side Effects",
  },
  CONTRAINDICATIONS: {
    color: "#f87171",
    border: "#dc2626",
    icon: "ban-outline",
    label: "Contraindications",
  },
  // --- General concept / procedure ---
  DEFINITION: {
    color: "#a78bfa",
    border: "#7c3aed",
    icon: "book-outline",
    label: "Definition",
  },
  "KEY POINTS": {
    color: "#38bdf8",
    border: "#0ea5e9",
    icon: "key-outline",
    label: "Key Points",
  },
  "CLINICAL RELEVANCE": {
    color: "#34d399",
    border: "#10b981",
    icon: "heart-outline",
    label: "Clinical Relevance",
  },
  "IMPORTANT NOTES": {
    color: "#fb923c",
    border: "#f97316",
    icon: "alert-circle-outline",
    label: "Important Notes",
  },
  // --- Investigation / lab ---
  "NORMAL VALUES": {
    color: "#34d399",
    border: "#10b981",
    icon: "checkmark-done-outline",
    label: "Normal Values",
  },
  "CLINICAL SIGNIFICANCE": {
    color: "#fbbf24",
    border: "#d97706",
    icon: "star-outline",
    label: "Clinical Significance",
  },
  // --- Fast recap specific ---
  "CLINICAL PICTURE": {
    color: "#38bdf8",
    border: "#0ea5e9",
    icon: "eye-outline",
    label: "Clinical Picture",
  },
  "SIGNS & SYMPTOMS": {
    color: "#38bdf8",
    border: "#0ea5e9",
    icon: "eye-outline",
    label: "Signs & Symptoms",
  },
  INVESTIGATIONS: {
    color: "#34d399",
    border: "#10b981",
    icon: "flask-outline",
    label: "Investigations",
  },
  "UPDATED INFO / SCORES": {
    color: "#a78bfa",
    border: "#7c3aed",
    icon: "trending-up-outline",
    label: "Updated Info / Scores",
  },
  TREATMENT: {
    color: "#fb923c",
    border: "#f97316",
    icon: "medkit-outline",
    label: "Treatment",
  },
};

// Fallback color palette (cycles by section index for any unknown heading)
const FALLBACK_PALETTE = [
  { color: "#a78bfa", border: "#7c3aed", icon: "information-circle-outline" },
  { color: "#38bdf8", border: "#0ea5e9", icon: "document-text-outline" },
  { color: "#34d399", border: "#10b981", icon: "list-outline" },
  { color: "#fb923c", border: "#f97316", icon: "alert-circle-outline" },
  { color: "#f472b6", border: "#ec4899", icon: "star-outline" },
  { color: "#fbbf24", border: "#d97706", icon: "bookmark-outline" },
];

type MedicalSection = { heading: string; content: string };

function parseMedicalSections(text: string): {
  hasSections: boolean;
  sections: MedicalSection[];
  plainText: string;
} {
  // Split by ##HEADER##, then parse pairs. We expect: [pre-text, HEAD, content, HEAD, content, ...]
  const parts = text.split(/##(.*?)##/);
  const sections: MedicalSection[] = [];
  let plainText = parts[0]?.trim() || "";

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i]?.trim();
    let content = parts[i + 1] || "";

    // Clean up ##END## if present in content
    content = content.replace(/##END##/gi, "").trim();

    if (heading && heading !== "END") {
      sections.push({ heading, content });
    }
  }

  return {
    hasSections: sections.length > 0,
    sections,
    plainText,
  };
}

const MedicalSectionBox: React.FC<{
  section: MedicalSection;
  index: number;
}> = ({ section, index }) => {
  const upHeading = section.heading.toUpperCase();
  // Find a match where the config key is inside the heading or vice-versa
  const matchedKey = Object.keys(SECTION_CONFIG).find(
    (key) =>
      upHeading === key || upHeading.includes(key) || key.includes(upHeading),
  );

  const known = matchedKey ? SECTION_CONFIG[matchedKey] : null;
  const fallback = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  const cfg = known
    ? known
    : {
        ...fallback,
        label:
          section.heading.charAt(0).toUpperCase() +
          section.heading.slice(1).toLowerCase(),
      };

  return (
    <Animated.View
      entering={ZoomIn.duration(400)
        .delay(index * 120)
        .springify()}
      style={{
        width: "100%",
        marginBottom: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: cfg.border,
        backgroundColor: "#0d1f22",
        overflow: "hidden",
      }}
    >
      {/* Heading bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: cfg.border + "28",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: cfg.border + "55",
        }}
      >
        <Ionicons
          name={cfg.icon as any}
          size={18}
          color={cfg.color}
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            color: cfg.color,
            fontWeight: "800",
            fontSize: 13,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {cfg.label}
        </Text>
      </View>
      {/* Content */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 22 }}>
          {section.content}
        </Text>
      </View>
    </Animated.View>
  );
};

// Chat Bubble Component
const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isAi = !message.isUser;
  const router = useRouter();

  if (isAi) {
    // --- Medical section detection (new structured format) ---
    const { hasSections, sections, plainText } = parseMedicalSections(
      message.text,
    );

    if (hasSections) {
      return (
        <View
          style={{ marginBottom: 16, paddingHorizontal: 16, width: "100%" }}
        >
          {plainText.length > 0 && (
            <View
              style={{
                backgroundColor: "rgba(45,212,191,0.08)",
                borderColor: "rgba(45,212,191,0.2)",
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 22 }}>
                {plainText}
              </Text>
            </View>
          )}
          {sections.map((section, i) => (
            <MedicalSectionBox key={`sec-${i}`} section={section} index={i} />
          ))}
        </View>
      );
    }

    // --- Legacy / drug-card format ---
    let rawSegments = message.text
      .split("[[DRUG_BLOCK]]")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (
      rawSegments.length === 1 &&
      !message.text.includes("[[DRUG_BLOCK]]") &&
      message.text.includes("::")
    ) {
      if (message.text.includes("trade_name::")) {
        rawSegments = [message.text];
      }
    }

    const structuredBlocks = rawSegments.filter((s) =>
      s.includes("trade_name::"),
    );
    const isGrid = structuredBlocks.length > 1;

    return (
      <View className="mb-4 px-4 w-full flex-row flex-wrap justify-between">
        {rawSegments.map((segment, index) => {
          const isStructured = segment.includes("trade_name::");

          if (!isStructured) {
            let cleanText = segment.split("disclaimer::")[0].trim();
            let calculationDrug = "";
            if (cleanText.includes("[[CALCULATE_DOSAGE]]")) {
              const calcMatch = cleanText.match(
                /\[\[CALCULATE_DOSAGE\]\]\s*drug_name::(.*?)\s*\[\[\/CALCULATE_DOSAGE\]\]/,
              );
              if (calcMatch) {
                calculationDrug = calcMatch[1]
                  .split("|")[0]
                  .trim()
                  .replace(/[^\x00-\x7F]/g, "")
                  .trim();
                cleanText = cleanText
                  .replace(
                    /\[\[CALCULATE_DOSAGE\].*?\[\[\/CALCULATE_DOSAGE\]\]/s,
                    "",
                  )
                  .trim();
              }
            }

            if (cleanText.length === 0 && !calculationDrug) return null;

            return (
              <View
                key={`text-${index}`}
                className="w-full flex-row justify-start mb-3"
              >
                <View className="bg-teal-medium/50 border border-charcoal/20 px-4 py-3 rounded-2xl rounded-tl-none max-w-[90%]">
                  <Text className="text-base leading-6 text-gray-200">
                    {cleanText}
                  </Text>
                  {calculationDrug ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/calculator",
                          params: { drug: calculationDrug },
                        })
                      }
                      className="mt-3 flex-row items-center bg-turquoise px-3 py-2 rounded-xl"
                    >
                      <Ionicons
                        name="calculator"
                        size={16}
                        color="#0a1416"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-deep-teal font-bold text-sm">
                        Calculate Dosage for {calculationDrug}
                      </Text>
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

        {message.text.includes("disclaimer::") && (
          <View className="w-full mt-2 px-1">
            <Text className="text-gray-muted text-[10px] italic">
              {message.text.split("disclaimer::")[1]?.split("|")[0]?.trim()}
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
          <Text className="text-base leading-6 text-black font-medium">
            {message.text}
          </Text>
        </View>
      </View>
    </View>
  );
};

const ChatTab = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm Med Arena AI. I can assist you with medical diagnoses, general health questions, Shall we start",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setIsKeyboardVisible(true);
        // Auto-scroll to bottom when keyboard appears with more offset
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      },
    );
    const keyboardHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false),
    );

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const startRecording = async () => {
    Alert.alert("Notice", "Voice recording is temporarily disabled.");
  };

  const stopRecording = async () => {
    // Disabled
  };

  const handleQuery = (text: string, reply: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: reply,
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);

    const doseWords = ["calculate", "dose", "dosage", "جرعة", "احسب", "حساب"];
    const lowerQuery = text.toLowerCase();

    if (doseWords.some((word) => lowerQuery.includes(word))) {
      let drugNameCandidate = text;
      doseWords.forEach((word) => {
        const regex = new RegExp(word, "gi");
        drugNameCandidate = drugNameCandidate.replace(regex, "");
      });

      ["of", "for", "من", "لـ", "الـ", "ل"].forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        drugNameCandidate = drugNameCandidate.replace(regex, "");
      });

      drugNameCandidate = drugNameCandidate
        .replace(/[^\w\s\u0600-\u06FF]/gi, "")
        .trim();

      if (drugNameCandidate.length > 2) {
        setTimeout(() => {
          router.push({
            pathname: "/calculator",
            params: { drug: drugNameCandidate },
          });
        }, 1500);
      }
    }
  };

  const handleTextSend = async () => {
    if (!inputText.trim()) return;
    const query = inputText.trim();
    setInputText("");
    setIsTyping(true);

    try {
      const aiResponse = await aiService.sendMessageByText(query, "general");
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
    <View className="flex-1 bg-background">
      {/* Header */}
      <SafeAreaView edges={["top"]} className="bg-deep-teal/40">
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-charcoal/30">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-turquoise/10 items-center justify-center border border-turquoise/30 mr-3">
              <Ionicons name="medical" size={20} color="#2dd4bf" />
            </View>
            <View>
              <Text className="text-white font-bold text-lg">Med Arena</Text>
              <Animated.Text className="text-turquoise text-[10px] font-bold uppercase tracking-widest">
                {isTyping
                  ? "Thinking..."
                  : isRecording
                    ? "Listening..."
                    : isProcessingVoice
                      ? "Processing..."
                      : "Medical AI"}
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
      </SafeAreaView>

      {/* Main Chat Area with Keyboard Handling */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="flex-1"
        style={{ flex: 1 }}
      >
        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: 16,
            flexGrow: 1,
          }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />

        {/* Input Area - Gemini/ChatGPT Style */}
        <View
          className="bg-background border-t border-charcoal/30"
          style={{ paddingBottom: Platform.OS === "ios" ? insets.bottom : 8 }}
        >
          <View className="px-4 py-3">
            <View className="flex-row items-end bg-teal-medium/40 rounded-3xl px-4 py-2 border border-charcoal/40">
              {/* Expandable Text Input */}
              <TextInput
                className="flex-1 text-white text-base max-h-32 py-2"
                placeholder="Ask a medical question..."
                placeholderTextColor="#6b7280"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleTextSend}
                returnKeyType="send"
                multiline
                textAlignVertical="center"
                style={{ minHeight: 24 }}
              />

              {/* Send Button */}
              <TouchableOpacity
                onPress={handleTextSend}
                disabled={!inputText.trim() || isTyping}
                className={`w-9 h-9 rounded-full items-center justify-center ml-2 ${
                  inputText.trim() && !isTyping
                    ? "bg-turquoise"
                    : "bg-charcoal/60"
                }`}
              >
                {isTyping ? (
                  <ActivityIndicator size="small" color="#9ca3af" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={inputText.trim() ? "#0a1416" : "#6b7280"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatTab;
