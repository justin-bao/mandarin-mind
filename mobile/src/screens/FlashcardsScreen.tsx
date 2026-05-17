import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { flashcardSessionsApi, phraseListsApi } from "../lib/api";
import { starterDeck } from "../data/vocab";
import type { FlashCard } from "../types";
import { Button, Card } from "../components/ui";
import { colors, styles } from "../theme";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function FlashcardsScreen() {
  const [deck, setDeck] = useState<FlashCard[]>(() => shuffle(starterDeck));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState(0);

  const lists = useQuery({ queryKey: ["mobile", "phrase-lists"], queryFn: phraseListsApi.getAll });
  const createSession = useMutation({
    mutationFn: () => flashcardSessionsApi.create(deck),
    onError: (error) => Alert.alert("Session not saved", error instanceof Error ? error.message : "You can still study locally.")
  });

  const card = deck[index];
  const done = index >= deck.length;
  const progress = useMemo(() => Math.min(index + 1, deck.length), [index, deck.length]);

  function answer(result: "known" | "missed") {
    if (result === "known") setKnown((value) => value + 1);
    else setMissed((value) => value + 1);
    setFlipped(false);
    setIndex((value) => value + 1);
  }

  function restart() {
    setDeck(shuffle(starterDeck));
    setIndex(0);
    setKnown(0);
    setMissed(0);
    setFlipped(false);
    createSession.mutate();
  }

  return (
    <View style={[styles.screen, styles.page]}>
      <View>
        <Text style={styles.title}>Flashcards</Text>
        <Text style={styles.muted}>Starter HSK deck now, saved phrase-list decks next.</Text>
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.h3}>Study Setup</Text>
        <Text style={styles.muted}>{lists.data?.length ?? 0} phrase lists available from your backend account.</Text>
        <Button variant="secondary" onPress={restart}>Shuffle Starter Deck</Button>
      </Card>

      {done ? (
        <Card style={{ gap: 14, alignItems: "center", justifyContent: "center", minHeight: 280 }}>
          <Text style={styles.h2}>Session Complete</Text>
          <Text style={styles.body}>Known: {known}  Missed: {missed}</Text>
          <Button onPress={restart}>Study Again</Button>
        </Card>
      ) : (
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
      )}
    </View>
  );
}
