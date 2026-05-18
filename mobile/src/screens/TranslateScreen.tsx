import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phraseLookupApi, translateApi } from "../lib/api";
import { loadPhraseListsOfflineFirst, addPhraseItemOfflineFirst } from "../lib/offlinePhraseStore";
import { Button, Card, Field } from "../components/ui";
import { colors, styles } from "../theme";

export function TranslateScreen({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [direction, setDirection] = useState<"zh-en" | "en-zh">("zh-en");
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const lists = useQuery({
    queryKey: ["mobile", "phrase-lists", userId],
    queryFn: () => loadPhraseListsOfflineFirst(userId)
  });
  const translation = useMutation({
    mutationFn: () => translateApi.sentence(text.trim(), direction),
    onSuccess: () => setSelectedIndexes([]),
    onError: (error) => Alert.alert("Translation failed", error instanceof Error ? error.message : "Please try again.")
  });

  const selectedChinese = useMemo(
    () =>
      selectedIndexes
        .sort((a, b) => a - b)
        .map((index) => translation.data?.tokens[index]?.char ?? "")
        .join(""),
    [selectedIndexes, translation.data]
  );
  const lookup = useMutation({
    mutationFn: () => phraseLookupApi.lookup(selectedChinese),
    onError: (error) => Alert.alert("Lookup failed", error instanceof Error ? error.message : "Please try again.")
  });
  const addPhrase = useMutation({
    mutationFn: async () => {
      const phrase = lookup.data ?? await phraseLookupApi.lookup(selectedChinese);
      return addPhraseItemOfflineFirst(userId, selectedListId, {
        chinese: selectedChinese,
        pinyin: phrase.pinyin,
        english: phrase.english
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      Alert.alert("Added to phrase list", selectedChinese);
    },
    onError: (error) => Alert.alert("Could not add phrase", error instanceof Error ? error.message : "Please try again.")
  });

  function toggleToken(index: number) {
    const token = translation.data?.tokens[index];
    if (!token || !/[\u4e00-\u9fff]/.test(token.char)) return;
    setSelectedIndexes((previous) => {
      if (previous.includes(index)) return previous.filter((value) => value !== index);
      if (previous.length === 0) return [index];
      const min = Math.min(...previous);
      const max = Math.max(...previous);
      if (index === min - 1 || index === max + 1) return [...previous, index];
      return [index];
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View>
        <Text style={styles.title}>Translate</Text>
        <Text style={styles.muted}>Translate sentences, then tap Chinese characters to save a phrase.</Text>
      </View>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <DirectionOption
            active={direction === "zh-en"}
            label="Chinese to English"
            onPress={() => setDirection("zh-en")}
          />
          <DirectionOption
            active={direction === "en-zh"}
            label="English to Chinese"
            onPress={() => setDirection("en-zh")}
          />
        </View>
        <Field
          value={text}
          onChangeText={setText}
          placeholder={direction === "zh-en" ? "输入中文..." : "Type English..."}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 120 }}
        />
        <Button loading={translation.isPending} disabled={!text.trim()} onPress={() => translation.mutate()}>
          <Ionicons name="language-outline" size={18} color={colors.white} />
          <Text style={{ color: colors.white, fontWeight: "700" }}>Translate</Text>
        </Button>
      </Card>
      {translation.data ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.h3}>Result</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 2 }}>
            {translation.data.tokens.map((token, index) => {
              const isSelected = selectedIndexes.includes(index);
              const isChinese = /[\u4e00-\u9fff]/.test(token.char);
              return (
                <Pressable key={`${token.char}-${index}`} onPress={() => toggleToken(index)} disabled={!isChinese}>
                  <View style={{ alignItems: "center", minWidth: 24, backgroundColor: isSelected ? colors.primarySoft : "transparent", borderRadius: 6, paddingHorizontal: 2, paddingVertical: 3 }}>
                    {isChinese ? <Text style={[styles.muted, { color: colors.primary, fontStyle: "italic" }]}>{token.pinyin}</Text> : null}
                    <Text style={{ color: isChinese ? colors.foreground : colors.mutedForeground, fontSize: 24 }}>{token.char}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.body}>{translation.data.translation}</Text>

          {selectedChinese ? (
            <Card style={{ gap: 8, padding: 12 }}>
              <Text style={styles.h3}>{selectedChinese}</Text>
              <Button variant="secondary" loading={lookup.isPending} onPress={() => lookup.mutate()}>
                Look up phrase
              </Button>
              {lookup.data ? (
                <>
                  <Text style={[styles.body, { color: colors.primary, fontStyle: "italic" }]}>{lookup.data.pinyin}</Text>
                  <Text style={styles.body}>{lookup.data.english}</Text>
                </>
              ) : null}
              {(lists.data ?? []).length > 0 ? (
                <>
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
                        <Text style={{ color: selectedListId === list.id ? colors.primary : colors.foreground, fontWeight: "700" }}>
                          {list.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Button disabled={!selectedListId} loading={addPhrase.isPending} onPress={() => addPhrase.mutate()}>
                    Add to phrase list
                  </Button>
                </>
              ) : (
                <Text style={styles.muted}>Create a phrase list first to save phrases.</Text>
              )}
            </Card>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function DirectionOption({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.white,
        borderRadius: 8,
        minHeight: 44,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.foreground, fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}
