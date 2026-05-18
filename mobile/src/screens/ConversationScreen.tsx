import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationApi, playAudioUrl } from "../lib/api";
import { topics } from "../data/topics";
import type { Conversation, Message, Topic } from "../types";
import { Badge, Button, Card, EmptyState } from "../components/ui";
import { colors, radius, styles } from "../theme";

function difficultyTone(difficulty?: string | null) {
  if (difficulty === "Beginner") return "success";
  if (difficulty === "Intermediate") return "warning";
  if (difficulty === "Advanced") return "danger";
  return "neutral";
}

function TopicCard({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
      <Card style={{ gap: 10 }}>
        <View style={[styles.row, { gap: 12, alignItems: "flex-start" }]}>
          <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={topic.icon as never} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <View style={[styles.row, { gap: 8, flexWrap: "wrap" }]}>
              <Text style={styles.h3}>{topic.name}</Text>
              <Text style={styles.muted}>{topic.nameZh}</Text>
            </View>
            <Badge tone={difficultyTone(topic.difficulty) as never}>{topic.difficulty}</Badge>
            <Text style={styles.muted}>{topic.description}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [playing, setPlaying] = useState(false);
  const isUser = message.isUser === 1 || message.isUser === true;

  async function play() {
    if (!message.audioUrl) return;
    try {
      setPlaying(true);
      await playAudioUrl(message.audioUrl);
    } catch (error) {
      Alert.alert("Audio failed", error instanceof Error ? error.message : "Could not play audio.");
    } finally {
      setPlaying(false);
    }
  }

  return (
    <View style={{ alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <Pressable onPress={() => setShowTranslation((value) => !value)} style={{ maxWidth: "84%" }}>
        <View
          style={[
            styles.card,
            {
              padding: 14,
              backgroundColor: isUser ? colors.primary : colors.card,
              borderColor: isUser ? colors.primary : colors.border
            }
          ]}
        >
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: isUser ? colors.white : colors.foreground, fontSize: 20, lineHeight: 28, fontWeight: "600" }}>
                {message.text}
              </Text>
              {message.pinyin ? (
                <Text style={{ color: isUser ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontStyle: "italic" }}>{message.pinyin}</Text>
              ) : null}
              {showTranslation && message.translation ? (
                <View style={{ marginTop: 6, padding: 8, borderRadius: radius.sm, backgroundColor: isUser ? "rgba(255,255,255,0.16)" : colors.muted }}>
                  <Text style={{ color: isUser ? colors.white : colors.foreground }}>{message.translation}</Text>
                </View>
              ) : null}
            </View>
            {!isUser && message.audioUrl ? (
              <Pressable onPress={play} style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                {playing ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="volume-high-outline" size={20} color={colors.primary} />}
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
      {message.createdAt ? <Text style={[styles.muted, { marginHorizontal: 8, marginTop: 3 }]}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text> : null}
    </View>
  );
}

function ActiveConversation({ topic, conversation, onBack }: { topic?: Topic; conversation?: Conversation; onBack: () => void }) {
  const [conversationId, setConversationId] = useState(conversation?.id ?? "");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const queryClient = useQueryClient();

  const createConversation = useMutation({
    mutationFn: () => conversationApi.create({ topic: topic?.name, topicZh: topic?.nameZh, difficulty: topic?.difficulty ?? "Beginner" }),
    onSuccess: (created) => setConversationId(created.id),
    onError: (error) => Alert.alert("Could not start conversation", error instanceof Error ? error.message : "Please try again.")
  });

  useEffect(() => {
    if (!conversation?.id && !conversationId && !createConversation.isPending) createConversation.mutate();
  }, []);

  const messages = useQuery({
    queryKey: ["mobile", "messages", conversationId],
    queryFn: () => conversationApi.getMessages(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: false
  });

  const sendAudio = useMutation({
    mutationFn: (uri: string) => conversationApi.sendAudio(conversationId, uri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "conversations"] });
    },
    onError: (error) => Alert.alert("Could not process audio", error instanceof Error ? error.message : "Please try again.")
  });

  async function startRecording() {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone needed", "Enable microphone access to practice speaking.");
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const result = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(result.recording);
  }

  async function stopRecording() {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    if (uri) sendAudio.mutate(uri);
  }

  const title = conversation?.topic ?? topic?.name ?? "Free Conversation";
  const titleZh = conversation?.topicZh ?? topic?.nameZh;

  return (
    <View style={styles.screen}>
      <View style={[styles.row, { gap: 12, padding: 14, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.card }]}>
        <Button variant="ghost" onPress={onBack} style={{ width: 42, paddingHorizontal: 0 }}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Button>
        <View style={{ flex: 1 }}>
          <Text style={styles.h3}>{title}</Text>
          {titleZh ? <Text style={styles.muted}>{titleZh}</Text> : null}
        </View>
      </View>

      <FlatList
        data={messages.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          messages.isLoading || createConversation.isPending ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <EmptyState title="Start with your voice" body="Tap the speaking button and say a sentence in Mandarin." />
          )
        }
      />

      <View style={{ padding: 14, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
        <Button
          loading={sendAudio.isPending}
          disabled={!conversationId}
          variant={recording ? "danger" : "primary"}
          onPress={recording ? stopRecording : startRecording}
          style={{ minHeight: 54 }}
        >
          <Ionicons name={recording ? "stop-circle-outline" : "mic-outline"} size={22} color={colors.white} />
          <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>{recording ? "Stop Recording" : "Start Speaking"}</Text>
        </Button>
      </View>
    </View>
  );
}

export function ConversationScreen() {
  const [screen, setScreen] = useState<"home" | "history" | "active">("home");
  const [selectedTopic, setSelectedTopic] = useState<Topic | undefined>();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>();
  const conversations = useQuery({
    queryKey: ["mobile", "conversations"],
    queryFn: conversationApi.getAll,
    enabled: screen === "history"
  });

  const sortedConversations = useMemo(
    () => [...(conversations.data ?? [])].sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt))),
    [conversations.data]
  );

  if (screen === "active") return <ActiveConversation topic={selectedTopic} conversation={selectedConversation} onBack={() => setScreen("home")} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <View>
          <Text style={styles.title}>MandarinMind</Text>
          <Text style={styles.muted}>Conversation practice</Text>
        </View>
        <Button variant="secondary" onPress={() => setScreen(screen === "history" ? "home" : "history")} style={{ width: 48, paddingHorizontal: 0 }}>
          <Ionicons name={screen === "history" ? "chatbubble-ellipses-outline" : "time-outline"} size={22} color={colors.foreground} />
        </Button>
      </View>

      {screen === "history" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.h2}>History</Text>
          {conversations.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {sortedConversations.length === 0 && !conversations.isLoading ? <EmptyState title="No conversations yet" body="Your saved conversation sessions will appear here." /> : null}
          {sortedConversations.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedConversation(item);
                setSelectedTopic(undefined);
                setScreen("active");
              }}
            >
              <Card style={{ gap: 6 }}>
                <Text style={styles.h3}>{item.topic || "Free Conversation"}</Text>
                {item.topicZh ? <Text style={styles.muted}>{item.topicZh}</Text> : null}
                <View style={[styles.row, { gap: 8, justifyContent: "space-between" }]}>
                  <Badge tone={difficultyTone(item.difficulty) as never}>{item.difficulty || "Beginner"}</Badge>
                  <Text style={styles.muted}>{item.messageCount ?? 0} messages</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Card style={{ flex: 1, gap: 8 }}>
                <Text style={styles.h3}>Topic Conversation</Text>
                <Text style={styles.muted}>Choose a guided prompt.</Text>
              </Card>
            </View>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                setSelectedTopic(undefined);
                setSelectedConversation(undefined);
                setScreen("active");
              }}
            >
              <Card style={{ flex: 1, gap: 8 }}>
                <Text style={styles.h3}>Free Conversation</Text>
                <Text style={styles.muted}>Start an open session.</Text>
              </Card>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={styles.h2}>Choose a Topic</Text>
            {topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onPress={() => {
                  setSelectedTopic(topic);
                  setSelectedConversation(undefined);
                  setScreen("active");
                }}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
