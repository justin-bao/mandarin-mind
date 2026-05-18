import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { flashcardSessionsApi } from "../lib/api";
import { VOCAB_CATEGORIES } from "../data/vocab";
import { loadPhraseItemsOfflineFirst, loadPhraseListsOfflineFirst } from "../lib/offlinePhraseStore";
import { addPhraseItemOfflineFirst } from "../lib/offlinePhraseStore";
import type { FlashCard } from "../types";
import { Badge, Button, Card } from "../components/ui";
import { colors, styles } from "../theme";

type Mode = "discover" | "lists";

const CARD_COUNT_OPTIONS = [10, 20, 30, 50, 100];
const ALL_CARDS = 999;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function FlashcardsScreen({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("discover");
  const [activeTab, setActiveTab] = useState<"study" | "history">("study");
  const [selectedDiscoverIds, setSelectedDiscoverIds] = useState<Set<string>>(
    () => new Set(VOCAB_CATEGORIES.map((set) => set.id))
  );
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [cardCount, setCardCount] = useState(20);
  const [deckName, setDeckName] = useState("");
  const [deck, setDeck] = useState<FlashCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState(0);
  const [isStudying, setIsStudying] = useState(false);
  const [isLoadingDeck, setIsLoadingDeck] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionCardIds, setCurrentSessionCardIds] = useState<string[]>([]);

  const lists = useQuery({
    queryKey: ["mobile", "phrase-lists", userId],
    queryFn: () => loadPhraseListsOfflineFirst(userId)
  });
  const discoverPool = useMemo(
    () =>
      VOCAB_CATEGORIES.filter((set) => selectedDiscoverIds.has(set.id))
        .flatMap((set) => set.phrases)
        .map((phrase) => ({ ...phrase })),
    [selectedDiscoverIds]
  );
  const selectedListAvailable = useMemo(
    () => (lists.data ?? []).filter((list) => selectedListIds.has(list.id)).reduce((total, list) => total + (list.itemCount ?? 0), 0),
    [lists.data, selectedListIds]
  );
  const availableCards = mode === "discover" ? discoverPool.length : selectedListAvailable;
  const requestedCards = Math.min(cardCount, availableCards);

  const card = deck[index];
  const done = index >= deck.length;
  const progress = useMemo(() => Math.min(index + 1, deck.length), [index, deck.length]);

  function toggleSelection(id: string, setter: Dispatch<SetStateAction<Set<string>>>) {
    setter((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllDiscover() {
    setSelectedDiscoverIds((previous) =>
      previous.size === VOCAB_CATEGORIES.length ? new Set() : new Set(VOCAB_CATEGORIES.map((set) => set.id))
    );
  }

  async function startStudy() {
    setIsLoadingDeck(true);
    try {
      const pool =
        mode === "discover"
          ? discoverPool
          : (
              await Promise.all(
                Array.from(selectedListIds).map((listId) => loadPhraseItemsOfflineFirst(userId, listId))
              )
            ).flat().map((item) => ({
              chinese: item.chinese,
              pinyin: item.pinyin ?? "",
              english: item.english,
              sourceListId: item.listId
            }));

      if (pool.length === 0) {
        Alert.alert("No cards", "Select at least one set with available cards.");
        return;
      }

      const nextDeck = shuffle(pool).slice(0, Math.min(cardCount, pool.length));
      const session = await flashcardSessionsApi.create(nextDeck);
      setCurrentSessionId(session.id);
      setCurrentSessionCardIds(session.cards.map((card) => card.id));
      setDeckName(mode === "discover" ? "Discover" : "My Lists");
      setDeck(nextDeck);
      setIndex(0);
      setKnown(0);
      setMissed(0);
      setFlipped(false);
      setIsStudying(true);
    } catch (error) {
      Alert.alert("Could not load cards", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoadingDeck(false);
    }
  }

  function exitStudy() {
    setIsStudying(false);
    setDeck([]);
    setIndex(0);
    setKnown(0);
    setMissed(0);
    setFlipped(false);
    setCurrentSessionId(null);
    setCurrentSessionCardIds([]);
  }

  function answer(result: "known" | "missed") {
    const sessionCardId = currentSessionCardIds[index];
    if (currentSessionId && sessionCardId) {
      flashcardSessionsApi
        .updateCardStatus(currentSessionId, sessionCardId, result === "known" ? "known" : "unknown")
        .then(() => queryClient.invalidateQueries({ queryKey: ["mobile", "flashcard-sessions"] }))
        .catch(() => undefined);
    }
    if (result === "known") setKnown((value) => value + 1);
    else setMissed((value) => value + 1);
    setFlipped(false);
    setIndex((value) => value + 1);
    if (index + 1 >= deck.length && currentSessionId) {
      flashcardSessionsApi
        .complete(currentSessionId)
        .then(() => queryClient.invalidateQueries({ queryKey: ["mobile", "flashcard-sessions"] }))
        .catch(() => undefined);
    }
  }

  if (isStudying) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
        <View style={[styles.row, { gap: 12 }]}>
          <Button variant="ghost" onPress={exitStudy} style={{ width: 42, paddingHorizontal: 0 }}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Button>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Flashcards</Text>
            <Text style={styles.muted}>{deckName}</Text>
          </View>
        </View>

        {done ? (
          <Card style={{ gap: 14, alignItems: "center", justifyContent: "center", minHeight: 280 }}>
            <Text style={styles.h2}>Session Complete</Text>
            <Text style={styles.body}>Known: {known}  Missed: {missed}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button variant="secondary" onPress={exitStudy}>Back to Setup</Button>
              <Button onPress={startStudy}>Study Again</Button>
            </View>
          </Card>
        ) : card ? (
          <>
            <Text style={styles.muted}>{progress} of {deck.length}</Text>
            <Pressable onPress={() => setFlipped((value) => !value)}>
              <Card style={{ minHeight: 300, alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Text style={{ color: colors.foreground, fontSize: flipped ? 42 : 58, fontWeight: "800", textAlign: "center" }}>{card.chinese}</Text>
                {flipped ? (
                  <>
                    <Text style={{ color: colors.primary, fontSize: 18, fontStyle: "italic" }}>{card.pinyin}</Text>
                    <Text style={[styles.h3, { textAlign: "center" }]}>{card.english}</Text>
                  </>
                ) : (
                  <Text style={styles.muted}>Tap to reveal</Text>
                )}
              </Card>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button variant="secondary" style={{ flex: 1 }} onPress={() => answer("missed")}>Still Learning</Button>
              <Button style={{ flex: 1 }} onPress={() => answer("known")}>Know It</Button>
            </View>
          </>
        ) : null}
      </ScrollView>
    );
  }

  const canStart = mode === "discover" ? discoverPool.length > 0 : selectedListIds.size > 0 && selectedListAvailable > 0;

  if (activeTab === "history") {
    return <FlashcardHistory userId={userId} onBack={() => setActiveTab("study")} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View>
        <Text style={styles.title}>Cards</Text>
        <Text style={styles.muted}>Choose a source, include one or more sets, then start drilling.</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button onPress={() => setActiveTab("study")} style={{ flex: 1 }}>Study</Button>
        <Button variant="secondary" onPress={() => setActiveTab("history")} style={{ flex: 1 }}>History</Button>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <ModeButton
          active={mode === "discover"}
          icon="compass-outline"
          title="Discover"
          subtitle="HSK vocab by level"
          onPress={() => setMode("discover")}
        />
        <ModeButton
          active={mode === "lists"}
          icon="book-outline"
          title="My Lists"
          subtitle="Saved phrases"
          onPress={() => setMode("lists")}
        />
      </View>

      {mode === "discover" ? (
        <Card style={{ gap: 10 }}>
          <View style={[styles.row, { justifyContent: "space-between", gap: 12 }]}>
            <Text style={styles.h3}>Sets to include</Text>
            <Button variant="ghost" onPress={toggleAllDiscover} textStyle={{ color: colors.primary }}>
              {selectedDiscoverIds.size === VOCAB_CATEGORIES.length ? "Deselect all" : "Select all"}
            </Button>
          </View>
          {VOCAB_CATEGORIES.map((set) => (
            <SelectionRow
              key={set.id}
              title={set.name}
              subtitle={set.description}
              count={`${set.phrases.length} cards`}
              selected={selectedDiscoverIds.has(set.id)}
              onPress={() => toggleSelection(set.id, setSelectedDiscoverIds)}
            />
          ))}
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <Text style={styles.h3}>Lists to include</Text>
          {lists.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {!lists.isLoading && (lists.data ?? []).length === 0 ? <Text style={styles.muted}>No phrase lists yet.</Text> : null}
          {(lists.data ?? []).map((list) => (
            <SelectionRow
              key={list.id}
              title={list.name}
              count={`${list.itemCount ?? 0} cards`}
              selected={selectedListIds.has(list.id)}
              onPress={() => toggleSelection(list.id, setSelectedListIds)}
            />
          ))}
        </Card>
      )}

      <Card style={{ gap: 10 }}>
        <View style={[styles.row, { justifyContent: "space-between", gap: 12 }]}>
          <Text style={styles.h3}>Cards per session</Text>
          <Text style={styles.muted}>{requestedCards} / {availableCards} available</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CARD_COUNT_OPTIONS.map((count) => (
            <ChoiceChip key={count} active={cardCount === count} label={`${count}`} onPress={() => setCardCount(count)} />
          ))}
          <ChoiceChip active={cardCount === ALL_CARDS} label="All" onPress={() => setCardCount(ALL_CARDS)} />
        </View>
      </Card>

      <Button loading={isLoadingDeck} disabled={!canStart} onPress={startStudy}>
        <Ionicons name="play" size={18} color={colors.white} />
        <Text style={{ color: colors.white, fontWeight: "700" }}>
          Start {requestedCards} card{requestedCards === 1 ? "" : "s"}
        </Text>
      </Button>
    </ScrollView>
  );
}

function FlashcardHistory({ userId, onBack }: { userId: string; onBack: () => void }) {
  const sessions = useQuery({ queryKey: ["mobile", "flashcard-sessions"], queryFn: flashcardSessionsApi.getAll });
  const queryClient = useQueryClient();
  const lists = useQuery({
    queryKey: ["mobile", "phrase-lists", userId],
    queryFn: () => loadPhraseListsOfflineFirst(userId)
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState("");
  const selected = (sessions.data ?? []).find((session) => session.id === selectedSessionId);
  const [savingCardId, setSavingCardId] = useState<string | null>(null);

  async function addCardToList(card: FlashCard & { id: string }) {
    if (!selectedListId) return;
    setSavingCardId(card.id);
    try {
      await addPhraseItemOfflineFirst(userId, selectedListId, {
        chinese: card.chinese,
        pinyin: card.pinyin,
        english: card.english
      });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      Alert.alert("Added to phrase list", card.chinese);
    } catch (error) {
      Alert.alert("Could not add phrase", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingCardId(null);
    }
  }

  if (selected) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
        <View style={[styles.row, { gap: 12 }]}>
          <Button variant="ghost" onPress={() => setSelectedSessionId(null)} style={{ width: 42, paddingHorizontal: 0 }}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Button>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Session Results</Text>
            <Text style={styles.muted}>{new Date(selected.startedAt).toLocaleString()}</Text>
          </View>
        </View>
        <Text style={styles.h2}>{selected.cards.length} cards</Text>
        {(lists.data ?? []).length > 0 ? (
          <Card style={{ gap: 8 }}>
            <Text style={styles.h3}>Save results to</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(lists.data ?? []).map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => setSelectedListId((current) => current === list.id ? "" : list.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedListId === list.id ? colors.primary : colors.border,
                    backgroundColor: selectedListId === list.id ? colors.primarySoft : colors.white,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    minHeight: 40,
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Text style={{ color: selectedListId === list.id ? colors.primary : colors.foreground, fontWeight: "700" }}>{list.name}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}
        {selected.cards.map((card) => (
          <Card key={card.id} style={{ gap: 5 }}>
            <View style={[styles.row, { justifyContent: "space-between", gap: 8 }]}>
              <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>{card.chinese}</Text>
              <Badge tone={card.status === "known" ? "success" : card.status === "unknown" ? "danger" : "neutral"}>{card.status}</Badge>
            </View>
            {card.pinyin ? <Text style={[styles.body, { color: colors.primary, fontStyle: "italic" }]}>{card.pinyin}</Text> : null}
            <Text style={styles.muted}>{card.english}</Text>
            {(lists.data ?? []).length > 0 ? (
              <Button
                variant="secondary"
                disabled={!selectedListId}
                loading={savingCardId === card.id}
                onPress={() => addCardToList(card)}
              >
                Add to phrase list
              </Button>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button variant="secondary" onPress={onBack} style={{ flex: 1 }}>Study</Button>
        <Button style={{ flex: 1 }}>History</Button>
      </View>
      <View>
        <Text style={styles.title}>Flashcard History</Text>
        <Text style={styles.muted}>Review past sessions from your account.</Text>
      </View>
      {sessions.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {!sessions.isLoading && (sessions.data ?? []).length === 0 ? (
        <Card><Text style={styles.muted}>No flashcard sessions yet.</Text></Card>
      ) : null}
      {(sessions.data ?? []).map((session) => {
        const success = session.cards.filter((card) => card.status === "known").length;
        const fail = session.cards.filter((card) => card.status === "unknown").length;
        const pending = session.cards.filter((card) => card.status === "pending").length;
        return (
          <Pressable key={session.id} onPress={() => setSelectedSessionId(session.id)}>
            <Card style={{ gap: 4 }}>
              <Text style={styles.h3}>{new Date(session.startedAt).toLocaleString()}</Text>
              <Text style={styles.muted}>{success} success - {fail} fail - {pending} not reached</Text>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ModeButton({
  active,
  icon,
  title,
  subtitle,
  onPress
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        gap: 4,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        borderRadius: 8,
        backgroundColor: active ? colors.primarySoft : colors.card,
        padding: 14
      }}
    >
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.h3, active ? { color: colors.primary } : null]}>{title}</Text>
      <Text style={styles.muted}>{subtitle}</Text>
    </Pressable>
  );
}

function SelectionRow({
  title,
  subtitle,
  count,
  selected,
  onPress
}: {
  title: string;
  subtitle?: string;
  count: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        borderRadius: 8,
        backgroundColor: selected ? colors.primarySoft : colors.white,
        padding: 12
      }}
    >
      <View style={[styles.row, { justifyContent: "space-between", gap: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.body, selected ? { color: colors.primary, fontWeight: "700" } : null]}>{title}</Text>
          {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.row, { gap: 8 }]}>
          <Badge tone={selected ? "primary" : "neutral"}>{count}</Badge>
          {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function ChoiceChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minWidth: 48,
        minHeight: 36,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        borderRadius: 8,
        backgroundColor: active ? colors.primarySoft : colors.white,
        paddingHorizontal: 12
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.foreground, fontWeight: active ? "700" : "600" }}>{label}</Text>
    </Pressable>
  );
}
