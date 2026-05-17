import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phraseLookupApi } from "../lib/api";
import type { PhraseList } from "../types";
import { Button, Card, EmptyState, Field } from "../components/ui";
import { colors, styles } from "../theme";
import { lookupOfflinePhrase } from "../data/offlineDictionary";
import {
  addPhraseItemOfflineFirst,
  getQueuedAdds,
  getQueuedListCreates,
  createPhraseListOfflineFirst,
  loadPhraseItemsOfflineFirst,
  loadPhraseListsOfflineFirst,
  syncQueuedPhraseData
} from "../lib/offlinePhraseStore";

export function PhrasesScreen({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const network = useNetInfo();
  const isOnline = network.isConnected !== false && network.isInternetReachable !== false;
  const [selectedList, setSelectedList] = useState<PhraseList | null>(null);
  const [newListName, setNewListName] = useState("");
  const [chinese, setChinese] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [english, setEnglish] = useState("");

  const lists = useQuery({
    queryKey: ["mobile", "phrase-lists", userId],
    queryFn: () => loadPhraseListsOfflineFirst(userId)
  });
  const items = useQuery({
    queryKey: ["mobile", "phrase-lists", userId, selectedList?.id, "items"],
    queryFn: () => loadPhraseItemsOfflineFirst(userId, selectedList!.id),
    enabled: Boolean(selectedList?.id)
  });
  const queuedAdds = useQuery({
    queryKey: ["mobile", "phrase-lists", userId, "queue"],
    queryFn: () => getQueuedAdds(userId)
  });
  const queuedLists = useQuery({
    queryKey: ["mobile", "phrase-lists", userId, "list-queue"],
    queryFn: () => getQueuedListCreates(userId)
  });

  useEffect(() => {
    if (!isOnline) return;
    syncQueuedPhraseData(userId).then(({ syncedLists, syncedItems, replacements }) => {
      if (syncedLists > 0 || syncedItems > 0) {
        queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      }
      if (selectedList && replacements.has(selectedList.id)) {
        setSelectedList(replacements.get(selectedList.id)!);
      }
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, "queue"] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, "list-queue"] });
    });
  }, [isOnline, queryClient, selectedList, userId]);

  const createList = useMutation({
    mutationFn: () => createPhraseListOfflineFirst(userId, { name: newListName.trim() }),
    onSuccess: ({ queued }) => {
      setNewListName("");
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, "list-queue"] });
      if (queued) Alert.alert("List saved offline", "This list and its phrases will sync when the device reconnects.");
    }
  });

  const addItem = useMutation({
    mutationFn: () => addPhraseItemOfflineFirst(userId, selectedList!.id, {
      chinese: chinese.trim(),
      pinyin: pinyin.trim() || undefined,
      english: english.trim()
    }),
    onSuccess: ({ queued }) => {
      setChinese("");
      setPinyin("");
      setEnglish("");
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, selectedList?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, "queue"] });
      if (queued) Alert.alert("Saved offline", "This phrase will sync when the device reconnects.");
    },
    onError: (error) => Alert.alert("Could not add phrase", error instanceof Error ? error.message : "Please try again.")
  });

  const lookup = useMutation({
    mutationFn: async () => {
      const offline = lookupOfflinePhrase(chinese.trim());
      if (offline) return offline;
      if (!isOnline) throw new Error("No exact offline dictionary match for this phrase.");
      return phraseLookupApi.lookup(chinese.trim());
    },
    onSuccess: (result) => {
      setPinyin(result.pinyin);
      setEnglish(result.english);
    },
    onError: (error) => Alert.alert("Lookup failed", error instanceof Error ? error.message : "Fill it in manually for now.")
  });

  if (selectedList) {
    return (
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.page}
        data={items.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <View style={[styles.row, { gap: 12 }]}>
              <Button variant="ghost" onPress={() => setSelectedList(null)} style={{ width: 42, paddingHorizontal: 0 }}>
                <Ionicons name="arrow-back" size={22} color={colors.foreground} />
              </Button>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{selectedList.name}</Text>
                <Text style={styles.muted}>{items.data?.length ?? selectedList.itemCount ?? 0} phrases</Text>
              </View>
            </View>

            <Text style={styles.muted}>
              {isOnline ? "Online" : "Offline"}{queuedAdds.data?.length ? ` - ${queuedAdds.data.length} pending sync` : ""}
            </Text>

            <Card style={{ gap: 10 }}>
              <Text style={styles.h3}>Add Phrase</Text>
              <Field value={chinese} onChangeText={setChinese} placeholder="中文" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button variant="secondary" loading={lookup.isPending} disabled={!chinese.trim()} onPress={() => lookup.mutate()} style={{ flex: 1 }}>
                  Lookup
                </Button>
                <Button loading={addItem.isPending} disabled={!chinese.trim() || !english.trim()} onPress={() => addItem.mutate()} style={{ flex: 1 }}>
                  Add
                </Button>
              </View>
              <Field value={pinyin} onChangeText={setPinyin} placeholder="Pinyin" />
              <Field value={english} onChangeText={setEnglish} placeholder="English" />
            </Card>

            {items.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {!items.isLoading && (items.data ?? []).length === 0 ? <EmptyState title="No phrases yet" body="Add useful phrases here, then review them as flashcards." /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginTop: 12, gap: 5 }}>
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>{item.chinese}</Text>
            {item.pinyin ? <Text style={[styles.body, { color: colors.primary, fontStyle: "italic" }]}>{item.pinyin}</Text> : null}
            <Text style={styles.muted}>{item.english}</Text>
          </Card>
        )}
      />
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.page}
      data={lists.data ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.title}>My Phrases</Text>
            <Text style={styles.muted}>
              {isOnline ? "Online" : "Offline"}{queuedAdds.data?.length ? ` - ${queuedAdds.data.length} pending sync` : ""}
              {queuedLists.data?.length ? ` - ${queuedLists.data.length} pending lists` : ""}
            </Text>
          </View>
          <Card style={{ gap: 10 }}>
            <Text style={styles.h3}>New List</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Field value={newListName} onChangeText={setNewListName} placeholder="Restaurant survival kit" style={{ flex: 1 }} />
              <Button
                loading={createList.isPending}
                disabled={!newListName.trim()}
                onPress={() => createList.mutate()}
                style={{ width: 58, paddingHorizontal: 0 }}
              >
                <Ionicons name="add" size={24} color={colors.white} />
              </Button>
            </View>
            {!isOnline ? <Text style={styles.muted}>New lists created offline will sync after reconnect.</Text> : null}
          </Card>
          {lists.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {!lists.isLoading && (lists.data ?? []).length === 0 ? <EmptyState title="No phrase lists" body="Create a list for travel, dining, classes, or anything you are practicing." /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => setSelectedList(item)}>
          <Card style={{ marginTop: 12, gap: 6 }}>
            <View style={[styles.row, { justifyContent: "space-between", gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.h3}>{item.name}</Text>
                {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.muted}>{item.itemCount ?? 0} phrases</Text>
                {item.pendingSync ? <Text style={[styles.muted, { color: colors.primary }]}>Pending sync</Text> : null}
              </View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}
