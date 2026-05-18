import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
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
  deletePhraseItemOfflineFirst,
  getQueuedAdds,
  getQueuedListCreates,
  createPhraseListOfflineFirst,
  loadPhraseItemsOfflineFirst,
  loadPhraseListsOfflineFirst,
  syncQueuedPhraseData,
  updatePhraseItemOfflineFirst
} from "../lib/offlinePhraseStore";
import type { PhraseListItem } from "../types";
import { TranslateScreen } from "./TranslateScreen";

export function PhrasesScreen({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const network = useNetInfo();
  const isOnline = network.isConnected !== false && network.isInternetReachable !== false;
  const [selectedList, setSelectedList] = useState<PhraseList | null>(null);
  const [activeTab, setActiveTab] = useState<"lists" | "translate">("lists");
  const [newListName, setNewListName] = useState("");
  const [chinese, setChinese] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [english, setEnglish] = useState("");
  const [editingItem, setEditingItem] = useState<PhraseListItem | null>(null);
  const [phraseModalVisible, setPhraseModalVisible] = useState(false);

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
      closePhraseModal();
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, selectedList?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, "queue"] });
      if (queued) Alert.alert("Saved offline", "This phrase will sync when the device reconnects.");
    },
    onError: (error) => Alert.alert("Could not add phrase", error instanceof Error ? error.message : "Please try again.")
  });

  const updateItem = useMutation({
    mutationFn: () => updatePhraseItemOfflineFirst(userId, selectedList!.id, editingItem!.id, {
      chinese: chinese.trim(),
      pinyin: pinyin.trim() || undefined,
      english: english.trim()
    }),
    onSuccess: () => {
      closePhraseModal();
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, selectedList?.id, "items"] });
    },
    onError: (error) => Alert.alert("Could not update phrase", error instanceof Error ? error.message : "Please try again.")
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => deletePhraseItemOfflineFirst(userId, selectedList!.id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, selectedList?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId, "queue"] });
    },
    onError: (error) => Alert.alert("Could not delete phrase", error instanceof Error ? error.message : "Please try again.")
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

  function resetPhraseForm() {
    setEditingItem(null);
    setChinese("");
    setPinyin("");
    setEnglish("");
  }

  function openAddPhraseModal() {
    resetPhraseForm();
    setPhraseModalVisible(true);
  }

  function openEditPhraseModal(item: PhraseListItem) {
    setEditingItem(item);
    setChinese(item.chinese);
    setPinyin(item.pinyin ?? "");
    setEnglish(item.english);
    setPhraseModalVisible(true);
  }

  function closePhraseModal() {
    setPhraseModalVisible(false);
    resetPhraseForm();
  }

  if (selectedList) {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          style={styles.screen}
          contentContainerStyle={[styles.page, { paddingBottom: 32 }]}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
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

              <Button onPress={openAddPhraseModal}>
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={{ color: colors.white, fontWeight: "700" }}>Add phrase</Text>
              </Button>

            {items.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {!items.isLoading && (items.data ?? []).length === 0 ? <EmptyState title="No phrases yet" body="Add useful phrases here, then review them as flashcards." /> : null}
            </View>
          }
          renderItem={({ item }) => (
          <Card style={{ marginTop: 12, gap: 5 }}>
            <View style={[styles.row, { justifyContent: "space-between", gap: 12, alignItems: "flex-start" }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>{item.chinese}</Text>
                {item.pinyin ? <Text style={[styles.body, { color: colors.primary, fontStyle: "italic" }]}>{item.pinyin}</Text> : null}
                <Text style={styles.muted}>{item.english}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Button
                  variant="ghost"
                  style={{ width: 40, paddingHorizontal: 0 }}
                  onPress={() => openEditPhraseModal(item)}
                >
                  <Ionicons name="create-outline" size={20} color={colors.foreground} />
                </Button>
                <Button
                  variant="ghost"
                  style={{ width: 40, paddingHorizontal: 0 }}
                  onPress={() => Alert.alert("Delete phrase?", item.chinese, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteItem.mutate(item.id) }
                  ])}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Button>
              </View>
            </View>
          </Card>
          )}
          ListFooterComponent={
            <PhraseModal
              visible={phraseModalVisible}
              editing={Boolean(editingItem)}
              chinese={chinese}
              pinyin={pinyin}
              english={english}
              lookupPending={lookup.isPending}
              savePending={addItem.isPending || updateItem.isPending}
              onClose={closePhraseModal}
              onChineseChange={setChinese}
              onPinyinChange={setPinyin}
              onEnglishChange={setEnglish}
              onLookup={() => lookup.mutate()}
              onSave={() => editingItem ? updateItem.mutate() : addItem.mutate()}
            />
          }
        />
      </KeyboardAvoidingView>
    );
  }

  if (activeTab === "translate") {
    return (
      <View style={styles.screen}>
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
          <Button variant="secondary" onPress={() => setActiveTab("lists")} style={{ flex: 1 }}>My Lists</Button>
          <Button onPress={() => setActiveTab("translate")} style={{ flex: 1 }}>Translate</Button>
        </View>
        <TranslateScreen userId={userId} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        style={styles.screen}
        contentContainerStyle={[styles.page, { paddingBottom: 32 }]}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        data={lists.data ?? []}
        keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button onPress={() => setActiveTab("lists")} style={{ flex: 1 }}>My Lists</Button>
            <Button variant="secondary" onPress={() => setActiveTab("translate")} style={{ flex: 1 }}>Translate</Button>
          </View>
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
              <Field
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Phrase list name"
                style={{ flex: 1, backgroundColor: colors.white }}
              />
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
    </KeyboardAvoidingView>
  );
}

function PhraseModal({
  visible,
  editing,
  chinese,
  pinyin,
  english,
  lookupPending,
  savePending,
  onClose,
  onChineseChange,
  onPinyinChange,
  onEnglishChange,
  onLookup,
  onSave
}: {
  visible: boolean;
  editing: boolean;
  chinese: string;
  pinyin: string;
  english: string;
  lookupPending: boolean;
  savePending: boolean;
  onClose: () => void;
  onChineseChange: (value: string) => void;
  onPinyinChange: (value: string) => void;
  onEnglishChange: (value: string) => void;
  onLookup: () => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: "rgba(17, 19, 24, 0.35)" }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 16,
                gap: 12
              }}
            >
              <View style={[styles.row, { justifyContent: "space-between", gap: 12 }]}>
                <Text style={styles.h2}>{editing ? "Edit Phrase" : "Add Phrase"}</Text>
                <Button variant="ghost" onPress={onClose} style={{ width: 40, paddingHorizontal: 0 }}>
                  <Ionicons name="close" size={22} color={colors.foreground} />
                </Button>
              </View>

              <Field value={chinese} onChangeText={onChineseChange} placeholder="中文" />
              <Field value={pinyin} onChangeText={onPinyinChange} placeholder="Pinyin" />
              <Field value={english} onChangeText={onEnglishChange} placeholder="English" />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button variant="secondary" loading={lookupPending} disabled={!chinese.trim()} onPress={onLookup} style={{ flex: 1 }}>
                  Lookup
                </Button>
                <Button loading={savePending} disabled={!chinese.trim() || !english.trim()} onPress={onSave} style={{ flex: 1 }}>
                  {editing ? "Save" : "Add"}
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
