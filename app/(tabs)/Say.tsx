import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// Types
type Message = {
  id: string
  text: string
  isUser: boolean
  timestamp: string
  medicineCard?: MedicineCardData
}

type MedicineCardData = {
  name: string
  dose: string
  frequency: string
  tag: string
}

// Medicine Card Component
const MedicineCard: React.FC<{ data: MedicineCardData }> = ({ data }) => {
  return (
    <View className="bg-medicine-card rounded-2xl overflow-hidden shadow-card mb-4">
      {/* Medicine bottle illustration area */}
      <View className="h-32 bg-gradient-to-b from-teal-medium to-medicine-card relative justify-center items-center">
        {/* Amber medicine bottle glow */}
        <View className="w-20 h-28 rounded-full bg-gradient-to-b from-gold-warm/20 to-gold/10 absolute" />
        {/* Bottle shape */}
        <View className="w-16 h-24 rounded-t-xl rounded-b-3xl bg-gradient-to-b from-gold-light/30 to-gold-warm/10 border-2 border-gold/40 relative">
          {/* Rim light effect */}
          <View className="absolute top-0 left-0 w-full h-full rounded-t-xl rounded-b-3xl border-l-2 border-gold/60" />
          {/* Cap */}
          <View className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-6 bg-gold rounded-t-lg shadow-glow-gold" />
        </View>
        {/* Bokeh effect circles */}
        <View className="absolute w-8 h-8 rounded-full bg-cyan/10 blur-sm top-4 left-6" />
        <View className="absolute w-6 h-6 rounded-full bg-gold/10 blur-sm bottom-6 right-8" />
        <View className="absolute w-4 h-4 rounded-full bg-turquoise/10 blur-sm top-12 right-6" />
      </View>

      {/* Card content */}
      <View className="p-4">
        {/* Header with name and info icon */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-white text-lg font-semibold">{data.name}</Text>
            <TouchableOpacity className="w-6 h-6 rounded-full bg-turquoise/20 items-center justify-center">
              <Ionicons name="information-circle-outline" size={16} color="#2dd4bf" />
            </TouchableOpacity>
          </View>
          <View className="px-2 py-1 bg-turquoise/20 rounded-full">
            <Text className="text-turquoise text-xs font-medium">{data.tag}</Text>
          </View>
        </View>

        {/* Divider */}
        <View className="h-px bg-charcoal/50 mb-3" />

        {/* Dose badge */}
        <View className="bg-gradient-to-r from-teal-medium to-medicine-bg rounded-xl p-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-cyan/20 items-center justify-center">
              <Ionicons name="medkit-outline" size={24} color="#67e8f9" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-muted text-xs mb-1">Recommended Dose</Text>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-cyan-bright text-2xl font-bold">{data.dose}</Text>
              </View>
              <Text className="text-gray-muted text-xs mt-1">{data.frequency}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

// Chat Bubble Component
const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  if (message.isUser) {
    return (
      <View className="flex-row justify-end mb-3">
        <View className="max-w-[80%]">
          <View className="bg-cyan rounded-2xl rounded-tr-sm px-4 py-3 shadow-bubble">
            <Text className="text-deep-teal text-base">{message.text}</Text>
          </View>
          <Text className="text-gray-muted text-xs text-right mt-1 px-1">{message.timestamp}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-row justify-start mb-3">
      <View className="max-w-[80%]">
        <View className="bg-gray-dark rounded-2xl rounded-tl-sm px-4 py-3 shadow-bubble">
          <Text className="text-white text-base">{message.text}</Text>
        </View>
        <Text className="text-gray-muted text-xs mt-1 px-1">{message.timestamp}</Text>
        {message.medicineCard && <MedicineCard data={message.medicineCard} />}
      </View>
    </View>
  )
}

// Header Component
const ChatHeader: React.FC = () => {
  return (
    <View className="bg-gradient-to-b from-deep-teal to-transparent px-4 pt-6 pb-4">
      {/* Avatar section */}
      <View className="flex-row items-center gap-3">
        {/* Avatar with glow */}
        <View className="relative">
          <View className="w-14 h-14 rounded-full bg-gradient-to-br from-turquoise to-cyan absolute -inset-1 blur-sm opacity-50" />
          <View className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-medium to-deep-teal border-2 border-turquoise/50 relative items-center justify-center">
            <Ionicons name="medical" size={28} color="#2dd4bf" />
          </View>
          {/* Online indicator */}
          <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-cyan border-2 border-background" />
        </View>

        {/* Name and status */}
        <View className="flex-1">
          <Text className="text-white text-xl font-semibold">PharmaBot</Text>
          <Text className="text-turquoise text-xs">AI Pharmacist Online</Text>
        </View>

        {/* Options button */}
        <TouchableOpacity className="w-10 h-10 rounded-full bg-teal-medium/50 items-center justify-center">
          <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Subtle separator */}
      <View className="h-px bg-charcoal/30 mt-4" />
    </View>
  )
}

// Input Bar Component with Glassmorphism
const ChatInput: React.FC<{
  inputText: string
  setInputText: (text: string) => void
  onSend: () => void
}> = ({ inputText, setInputText, onSend }) => {
  const hasText = inputText.trim().length > 0

  return (
    <View className="px-4 pb-6 pt-2">
      <View className="bg-teal-medium/40 backdrop-blur-xl rounded-2xl flex-row items-center px-2 py-2 border border-charcoal/30">
        {/* Plus button */}
        <TouchableOpacity className="w-10 h-10 rounded-full bg-teal-medium/50 items-center justify-center mr-1">
          <Ionicons name="add" size={24} color="#2dd4bf" />
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          className="flex-1 text-white text-base px-3 py-2 max-h-24"
          placeholder="Ask about medications..."
          placeholderTextColor="#6b7280"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        {/* Microphone button */}
        <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center mr-1">
          <Ionicons name="mic-outline" size={22} color="#9ca3af" />
        </TouchableOpacity>

        {/* Send button */}
        <TouchableOpacity
          onPress={onSend}
          className={hasText ? "w-10 h-10 rounded-full items-center justify-center bg-gradient-to-br from-turquoise to-cyan" : "w-10 h-10 rounded-full items-center justify-center bg-teal-medium/50"}
        >
          <Ionicons
            name="arrow-up"
            size={22}
            color={hasText ? '#0a1416' : '#6b7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Safe spacing */}
      <View className="h-2" />
    </View>
  )
}

// Main Chat Component
const Say = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm PharmaBot, your AI pediatric medication assistant. How can I help you today?",
      isUser: false,
      timestamp: '10:30 AM',
    },
  ])
  const [inputText, setInputText] = useState('')

  const handleSend = () => {
    if (!inputText.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputText('')

    // Simulate bot response with medicine card
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "For a 6-year-old child, I can provide you with the appropriate dosing information for Pediatric Ibuprofen.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        medicineCard: {
          name: 'Pediatric Ibuprofen',
          dose: '5 mL',
          frequency: 'Every 6–8 hours',
          tag: 'Pain Relief',
        },
      }
      setMessages((prev) => [...prev, botResponse])
    }, 1000)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Vignette overlay */}
      <View className="absolute inset-0 pointer-events-none">
        <View className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
      </View>

      {/* Header */}
      <ChatHeader />

      {/* Messages */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
      </ScrollView>

      {/* Input */}
      <ChatInput inputText={inputText} setInputText={setInputText} onSend={handleSend} />
    </KeyboardAvoidingView>
  )
}

export default Say
