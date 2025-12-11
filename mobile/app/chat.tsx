import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { chatService } from '../services/chat';
import { useAuth } from '../context/AuthContext';
import Colors from '@/constants/Colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Parse markdown table into rows and columns
const parseTable = (lines: string[]): { headers: string[]; rows: string[][] } | null => {
  if (lines.length < 2) return null;
  
  const parseRow = (line: string): string[] => {
    return line.split('|')
      .map(cell => cell.trim())
      .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1 || cell !== '');
  };
  
  const headers = parseRow(lines[0]);
  if (headers.length === 0) return null;
  
  // Skip separator line (|---|---|)
  const dataLines = lines.slice(2);
  const rows = dataLines
    .filter(line => line.includes('|') && !line.match(/^\|[\s-|]+\|$/))
    .map(parseRow);
  
  return { headers, rows };
};

// Render a table
const TableComponent = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
    <View style={styles.table}>
      {/* Header row */}
      <View style={styles.tableHeaderRow}>
        {headers.map((header, i) => (
          <View key={i} style={[styles.tableCell, styles.tableHeaderCell]}>
            <Text style={styles.tableHeaderText}>{header.replace(/\*\*/g, '')}</Text>
          </View>
        ))}
      </View>
      {/* Data rows */}
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.tableRow, rowIdx % 2 === 1 && styles.tableRowAlt]}>
          {row.map((cell, cellIdx) => (
            <View key={cellIdx} style={styles.tableCell}>
              <Text style={styles.tableCellText}>{cell.replace(/\*\*/g, '')}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  </ScrollView>
);

// Simple markdown-like text renderer
const FormattedText = ({ text, isUser }: { text: string; isUser: boolean }) => {
  const textColor = isUser ? '#fff' : '#1A1A2E';
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if this is start of a table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s-:]+\|/)) {
      // Collect all table lines
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      
      const tableData = parseTable(tableLines);
      if (tableData && tableData.headers.length > 0) {
        elements.push(
          <TableComponent key={`table-${i}`} headers={tableData.headers} rows={tableData.rows} />
        );
      }
      continue;
    }
    
    // Check for bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      elements.push(
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: textColor }]}>•</Text>
          <Text style={[styles.messageText, { color: textColor, flex: 1 }]}>
            {renderInlineFormatting(line.replace(/^[\s]*[-•]\s*/, ''), isUser)}
          </Text>
        </View>
      );
      i++;
      continue;
    }
    
    // Check for numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.numberBullet, { color: textColor }]}>{numberedMatch[1]}.</Text>
          <Text style={[styles.messageText, { color: textColor, flex: 1 }]}>
            {renderInlineFormatting(numberedMatch[2], isUser)}
          </Text>
        </View>
      );
      i++;
      continue;
    }
    
    // Check for blockquote
    if (line.trim().startsWith('>')) {
      elements.push(
        <View key={i} style={styles.blockquote}>
          <Text style={styles.blockquoteText}>
            {renderInlineFormatting(line.replace(/^[\s]*>\s*/, ''), false)}
          </Text>
        </View>
      );
      i++;
      continue;
    }
    
    // Check for heading
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={i} style={[styles.heading3, { color: textColor }]}>
          {renderInlineFormatting(line.replace('### ', ''), isUser)}
        </Text>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={[styles.heading2, { color: textColor }]}>
          {renderInlineFormatting(line.replace('## ', ''), isUser)}
        </Text>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <Text key={i} style={[styles.heading1, { color: textColor }]}>
          {renderInlineFormatting(line.replace('# ', ''), isUser)}
        </Text>
      );
      i++;
      continue;
    }
    
    // Empty line
    if (line.trim() === '') {
      elements.push(<View key={i} style={{ height: 8 }} />);
      i++;
      continue;
    }
    
    // Regular paragraph
    elements.push(
      <Text key={i} style={[styles.messageText, { color: textColor }]}>
        {renderInlineFormatting(line, isUser)}
      </Text>
    );
    i++;
  }
  
  return <View>{elements}</View>;
};

// Simple inline formatting (bold, italic, code)
const renderInlineFormatting = (text: string, isUser: boolean) => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let key = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    const matched = match[0];
    if (matched.startsWith('**') && matched.endsWith('**')) {
      parts.push(<Text key={key++} style={styles.boldText}>{matched.slice(2, -2)}</Text>);
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      parts.push(<Text key={key++} style={styles.italicText}>{matched.slice(1, -1)}</Text>);
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      parts.push(<Text key={key++} style={[styles.codeText, isUser && styles.codeTextUser]}>{matched.slice(1, -1)}</Text>);
    }
    lastIndex = match.index + matched.length;
  }
  
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
};

export default function ChatScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: "🚌 **Hi! I'm BusBot**, your AI booking assistant.\n\nI can help you:\n- 🔍 Search for buses between cities\n- 💺 Check seat availability\n- 🎫 Book tickets and pay from wallet\n- 📋 View your booking history\n\n> Try: *\"Find buses from Bangalore to Goa tomorrow\"*",
      timestamp: new Date(),
    }]);
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;
    if (!isAuthenticated) {
      setMessages((prev) => [...prev,
        { id: Date.now().toString(), role: 'user', content: inputText, timestamp: new Date() },
        { id: (Date.now() + 1).toString(), role: 'assistant', content: '⚠️ **Please login** to use the AI booking assistant.', timestamp: new Date() },
      ]);
      setInputText('');
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: inputText, timestamp: new Date() }]);
    const msg = inputText;
    setInputText('');
    setLoading(true);

    try {
      const response = await chatService.sendMessage(msg, sessionId || undefined);
      if (!sessionId) setSessionId(response.session_id);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: response.message, timestamp: new Date() }]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: `❌ **Error:** ${error.response?.data?.detail || error.message || 'Please try again.'}`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient colors={[Colors.primary, '#FF6B6B']} style={styles.avatar}>
              <FontAwesome name="bus" size={14} color="#fff" />
            </LinearGradient>
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <FormattedText text={item.content} isUser={isUser} />
        </View>
      </View>
    );
  };

  const quickActions = [
    { label: '🔍 Search buses', action: 'Find buses from Bangalore to Mumbai on 2025-12-15' },
    { label: '💰 Wallet', action: 'What is my wallet balance?' },
    { label: '📋 Bookings', action: 'Show my bookings' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <LinearGradient colors={[Colors.primary, '#FF6B6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🤖 BusBot</Text>
          <Text style={styles.headerSubtitle}>AI Booking Assistant</Text>
        </View>
        <View style={styles.headerStatus}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.typingIndicator}>
              <View style={styles.avatarContainer}>
                <LinearGradient colors={[Colors.primary, '#FF6B6B']} style={styles.avatar}>
                  <FontAwesome name="bus" size={14} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>BusBot is thinking...</Text>
              </View>
            </View>
          </View>
        ) : null}
      />

      {messages.length <= 1 && (
        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Quick actions:</Text>
          <View style={styles.quickActions}>
            {quickActions.map((qa, i) => (
              <TouchableOpacity key={i} style={styles.quickActionButton} onPress={() => setInputText(qa.action)}>
                <Text style={styles.quickActionText}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Type your message..." placeholderTextColor="#9CA3AF" value={inputText} onChangeText={setInputText} multiline maxLength={500} />
        <TouchableOpacity style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!inputText.trim() || loading}>
          <LinearGradient colors={inputText.trim() ? [Colors.primary, '#FF6B6B'] : ['#D1D5DB', '#D1D5DB']} style={styles.sendButtonGradient}>
            <FontAwesome name="send" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  backButton: { padding: 8 },
  headerContent: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  headerStatus: { flexDirection: 'row', alignItems: 'center' },
  onlineIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 6 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  messagesList: { padding: 16, paddingBottom: 20 },
  messageContainer: { flexDirection: 'row', marginBottom: 16, maxWidth: '92%' },
  userMessageContainer: { alignSelf: 'flex-end' },
  avatarContainer: { marginRight: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, flexShrink: 1 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  messageText: { fontSize: 15, lineHeight: 22 },
  boldText: { fontWeight: 'bold' },
  italicText: { fontStyle: 'italic' },
  codeText: { backgroundColor: '#F3F4F6', color: Colors.primary, paddingHorizontal: 4, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
  codeTextUser: { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bullet: { width: 16, fontSize: 15 },
  numberBullet: { width: 20, fontSize: 15 },
  blockquote: { backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', paddingLeft: 10, paddingVertical: 6, marginVertical: 6, borderRadius: 4 },
  blockquoteText: { fontSize: 14, color: '#92400E', fontStyle: 'italic' },
  heading1: { fontSize: 18, fontWeight: 'bold', marginVertical: 8 },
  heading2: { fontSize: 16, fontWeight: 'bold', marginVertical: 6 },
  heading3: { fontSize: 15, fontWeight: '600', marginVertical: 4 },
  // Table styles
  tableScroll: { marginVertical: 8 },
  table: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: Colors.primary },
  tableRow: { flexDirection: 'row', backgroundColor: '#fff' },
  tableRowAlt: { backgroundColor: '#F9FAFB' },
  tableCell: { paddingHorizontal: 12, paddingVertical: 10, minWidth: 80, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  tableHeaderCell: { borderRightColor: 'rgba(255,255,255,0.2)' },
  tableHeaderText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  tableCellText: { color: '#374151', fontSize: 13 },
  loadingContainer: { marginTop: 8 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderBottomLeftRadius: 4 },
  typingText: { marginLeft: 10, color: '#6B7280', fontSize: 14 },
  quickActionsContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  quickActionsTitle: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap' },
  quickActionButton: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  quickActionText: { fontSize: 13, color: '#374151' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  input: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: '#1A1A2E' },
  sendButton: { marginLeft: 10, borderRadius: 22, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});
