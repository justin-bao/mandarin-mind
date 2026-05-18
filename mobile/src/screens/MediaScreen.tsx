import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { mediaApi, translateApi } from "../lib/api";
import { addPhraseItemOfflineFirst, loadPhraseListsOfflineFirst } from "../lib/offlinePhraseStore";
import type { MediaItem, TranslationResult } from "../types";
import { Badge, Button, Card, EmptyState } from "../components/ui";
import { colors, styles } from "../theme";

type OcrBlock = NonNullable<MediaItem["ocrBlocks"]>[number];

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Unknown date";
}

export function MediaScreen({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<OcrBlock | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [selectedTokenIndexes, setSelectedTokenIndexes] = useState<number[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [uploadTitle, setUploadTitle] = useState<string | null>(null);
  const [uploadSteps, setUploadSteps] = useState<{ key: string; label: string; status: string }[]>([]);
  const items = useQuery({ queryKey: ["mobile", "media"], queryFn: mediaApi.getAll });
  const lists = useQuery({
    queryKey: ["mobile", "phrase-lists", userId],
    queryFn: () => loadPhraseListsOfflineFirst(userId)
  });
  const remove = useMutation({
    mutationFn: mediaApi.delete,
    onSuccess: () => {
      setSelectedItem(null);
      setSelectedBlock(null);
      queryClient.invalidateQueries({ queryKey: ["mobile", "media"] });
    },
    onError: (error) => Alert.alert("Could not delete media", error instanceof Error ? error.message : "Please try again.")
  });
  const translateBlock = useMutation({
    mutationFn: (text: string) => translateApi.sentence(text, "zh-en"),
    onSuccess: (result) => {
      setTranslation(result);
      setSelectedTokenIndexes([]);
    },
    onError: (error) => Alert.alert("Translation failed", error instanceof Error ? error.message : "Please try again.")
  });
  const addPhrase = useMutation({
    mutationFn: async () => {
      if (!selectedBlock || !selectedListId) throw new Error("Choose a phrase list first.");
      const selectedText =
        translation && selectedTokenIndexes.length > 0
          ? [...selectedTokenIndexes]
              .sort((a, b) => a - b)
              .map((index) => translation.tokens[index]?.char ?? "")
              .join("")
              .trim()
          : "";
      const chinese = selectedText || selectedBlock.text;
      const result = selectedText || !translation ? await translateApi.sentence(chinese, "zh-en") : translation;
      if (!translation || selectedText) setTranslation(result);
      return addPhraseItemOfflineFirst(userId, selectedListId, {
        chinese,
        pinyin: result.tokens.map((token) => token.pinyin).filter(Boolean).join(" "),
        english: result.translation
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "phrase-lists", userId] });
      Alert.alert("Added to phrase list", selectedBlock?.text ?? "Phrase");
    },
    onError: (error) => Alert.alert("Could not add phrase", error instanceof Error ? error.message : "Please try again.")
  });
  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: "image" | "video"; file: { uri: string; name: string; type: string } }) =>
      mediaApi.upload(kind, file, (event) => {
        if (event.type === "progress") {
          setUploadSteps((steps) => steps.map((step) => step.key === event.step ? { ...step, status: event.status } : step));
        }
      }),
    onSuccess: (item) => {
      setUploadTitle(null);
      setUploadSteps([]);
      setSelectedItem(item);
      queryClient.invalidateQueries({ queryKey: ["mobile", "media"] });
    },
    onError: (error) => {
      setUploadTitle(null);
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
    }
  });

  async function chooseImage(source: "camera" | "library") {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", source === "camera" ? "Camera access is required." : "Photo library access is required.");
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadTitle("Processing Image");
    setUploadSteps([
      { key: "uploading", label: "Uploading file", status: "pending" },
      { key: "scanning", label: "Scanning for text", status: "pending" },
      { key: "extracting", label: "Extracting text", status: "pending" }
    ]);
    upload.mutate({
      kind: "image",
      file: {
        uri: asset.uri,
        name: asset.fileName ?? `image-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg"
      }
    });
  }

  async function chooseMediaFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["video/*", "audio/*"],
      copyToCacheDirectory: true
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadTitle("Processing Media");
    setUploadSteps([
      { key: "uploading", label: "Uploading file", status: "pending" },
      { key: "transcribing", label: "Transcribing audio", status: "pending" },
      { key: "translating", label: "Translating captions", status: "pending" }
    ]);
    upload.mutate({
      kind: "video",
      file: {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? (asset.name.endsWith(".mp3") ? "audio/mpeg" : "video/mp4")
      }
    });
  }

  function openOcrBlock(block: OcrBlock) {
    setSelectedBlock(block);
    setTranslation(null);
    setSelectedTokenIndexes([]);
    setSelectedListId("");
  }

  function closeOcrBlock() {
    setSelectedBlock(null);
    setTranslation(null);
    setSelectedTokenIndexes([]);
    setSelectedListId("");
  }

  function toggleTranslatedToken(index: number) {
    const token = translation?.tokens[index];
    if (!token || !/[\u4e00-\u9fff]/.test(token.char)) return;
    setSelectedTokenIndexes((previous) => {
      if (previous.includes(index)) return previous.filter((value) => value !== index);
      if (previous.length === 0) return [index];
      const min = Math.min(...previous);
      const max = Math.max(...previous);
      if (index === min - 1 || index === max + 1) return [...previous, index];
      return [index];
    });
  }

  if (selectedItem) {
    const extractedItems = selectedItem.ocrBlocks ?? selectedItem.captions ?? [];
    const isImage = selectedItem.type === "image";

    return (
      <>
        <FlatList
          style={styles.screen}
          contentContainerStyle={styles.page}
          data={extractedItems}
          keyExtractor={(_, index) => `${selectedItem.id}-${index}`}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <View style={[styles.row, { gap: 12 }]}>
                <Button variant="ghost" onPress={() => setSelectedItem(null)} style={{ width: 42, paddingHorizontal: 0 }}>
                  <Ionicons name="arrow-back" size={22} color={colors.foreground} />
                </Button>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Media</Text>
                  <Text style={styles.muted}>{selectedItem.originalName}</Text>
                </View>
              </View>
              <Card style={{ gap: 8 }}>
                <View style={[styles.row, { justifyContent: "space-between", gap: 8 }]}>
                  <Badge tone="primary">{selectedItem.type}</Badge>
                  <Text style={styles.muted}>{formatDate(selectedItem.uploadedAt)}</Text>
                </View>
                <Text style={styles.body}>{selectedItem.mimeType}</Text>
                <Button
                  variant="danger"
                  loading={remove.isPending}
                  onPress={() => Alert.alert("Delete media?", selectedItem.originalName, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => remove.mutate(selectedItem.id) }
                  ])}
                >
                  Delete
                </Button>
              </Card>
              {extractedItems.length === 0 ? (
                <EmptyState title="No extracted text" body="This media item has no saved OCR blocks or captions." />
              ) : (
                <View style={{ gap: 4 }}>
                  <Text style={styles.h2}>{isImage ? "Scanned Text" : "Captions"}</Text>
                  {isImage ? <Text style={styles.muted}>Tap detected text to translate or save it.</Text> : null}
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            isImage ? (
              <Pressable onPress={() => openOcrBlock(item as OcrBlock)}>
                <Card style={{ marginTop: 12, gap: 6 }}>
                  <View style={[styles.row, { justifyContent: "space-between", gap: 8 }]}>
                    <Text style={[styles.body, { flex: 1 }]}>{item.text}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </View>
                  {"confidence" in item && typeof item.confidence === "number" ? (
                    <Text style={styles.muted}>Confidence: {Math.round(item.confidence)}%</Text>
                  ) : null}
                </Card>
              </Pressable>
            ) : (
              <Card style={{ marginTop: 12, gap: 6 }}>
                <Text style={styles.body}>{item.text}</Text>
                {item.pinyin ? <Text style={[styles.body, { color: colors.primary, fontStyle: "italic" }]}>{item.pinyin}</Text> : null}
                {item.translation ? <Text style={styles.muted}>{item.translation}</Text> : null}
              </Card>
            )
          )}
        />
        <OcrBlockModal
          block={selectedBlock}
          translation={translation}
          phraseLists={lists.data ?? []}
          selectedListId={selectedListId}
          selectedTokenIndexes={selectedTokenIndexes}
          translating={translateBlock.isPending}
          saving={addPhrase.isPending}
          onClose={closeOcrBlock}
          onTranslate={(text) => translateBlock.mutate(text)}
          onSelectList={(listId) => setSelectedListId((current) => current === listId ? "" : listId)}
          onToggleToken={toggleTranslatedToken}
          onAdd={() => addPhrase.mutate()}
        />
      </>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.page}
      data={items.data ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <Text style={styles.title}>Media</Text>
          <Text style={styles.muted}>Upload media, then review OCR text and captions from your account.</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button onPress={() => chooseImage("camera")} style={{ flex: 1 }}>
              <Ionicons name="camera-outline" size={18} color={colors.white} />
              <Text style={{ color: colors.white, fontWeight: "700" }}>Camera</Text>
            </Button>
            <Button variant="secondary" onPress={() => chooseImage("library")} style={{ flex: 1 }}>Photos</Button>
            <Button variant="secondary" onPress={chooseMediaFile} style={{ flex: 1 }}>Video/Audio</Button>
          </View>
          {uploadTitle ? (
            <Card style={{ gap: 8 }}>
              <Text style={styles.h3}>{uploadTitle}</Text>
              {uploadSteps.map((step) => (
                <View key={step.key} style={[styles.row, { justifyContent: "space-between", gap: 8 }]}>
                  <Text style={styles.body}>{step.label}</Text>
                  <Text style={[styles.muted, step.status === "done" ? { color: colors.success } : step.status === "in-progress" ? { color: colors.primary } : null]}>
                    {step.status}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
          {items.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {!items.isLoading && (items.data ?? []).length === 0 ? <EmptyState title="No media yet" body="Media uploaded on web will appear here." /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Card style={{ marginTop: 12, gap: 8 }}>
          <View style={[styles.row, { justifyContent: "space-between", gap: 8 }]}>
            <View style={[styles.row, { gap: 8, flex: 1 }]}>
              <Ionicons name={item.type === "image" ? "image-outline" : item.type === "video" ? "videocam-outline" : "musical-notes-outline"} size={20} color={colors.primary} />
              <Text style={[styles.h3, { flex: 1 }]}>{item.originalName}</Text>
            </View>
            <Badge tone="neutral">{item.type}</Badge>
          </View>
          <Text style={styles.muted}>{formatDate(item.uploadedAt)}</Text>
          <Button variant="secondary" onPress={() => setSelectedItem(item)}>Open</Button>
        </Card>
      )}
    />
  );
}

function OcrBlockModal({
  block,
  translation,
  phraseLists,
  selectedListId,
  selectedTokenIndexes,
  translating,
  saving,
  onClose,
  onTranslate,
  onSelectList,
  onToggleToken,
  onAdd
}: {
  block: OcrBlock | null;
  translation: TranslationResult | null;
  phraseLists: { id: string; name: string }[];
  selectedListId: string;
  selectedTokenIndexes: number[];
  translating: boolean;
  saving: boolean;
  onClose: () => void;
  onTranslate: (text: string) => void;
  onSelectList: (listId: string) => void;
  onToggleToken: (index: number) => void;
  onAdd: () => void;
}) {
  const selectedText =
    translation && selectedTokenIndexes.length > 0
      ? [...selectedTokenIndexes]
          .sort((a, b) => a - b)
          .map((index) => translation.tokens[index]?.char ?? "")
          .join("")
          .trim()
      : "";

  return (
    <Modal visible={!!block} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17, 19, 24, 0.35)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            maxHeight: "82%",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 28
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            <View style={[styles.row, { justifyContent: "space-between", gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.h2}>Scanned Text</Text>
                <Text style={styles.muted}>Translate or save this detected phrase.</Text>
              </View>
              <Button variant="ghost" onPress={onClose} style={{ width: 42, paddingHorizontal: 0 }}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Button>
            </View>

            <Card style={{ gap: 8 }}>
              <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: "800" }}>{block?.text}</Text>
              {!translation ? (
                <Button variant="secondary" loading={translating} onPress={() => block ? onTranslate(block.text) : undefined}>
                  <Ionicons name="language-outline" size={18} color={colors.foreground} />
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>Translate</Text>
                </Button>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {translation.tokens.map((token, index) => {
                      const selected = selectedTokenIndexes.includes(index);
                      const selectable = /[\u4e00-\u9fff]/.test(token.char);
                      return (
                      <Pressable
                        key={`${token.char}-${index}`}
                        disabled={!selectable}
                        onPress={() => onToggleToken(index)}
                        style={{
                          alignItems: "center",
                          minWidth: 22,
                          borderRadius: 6,
                          backgroundColor: selected ? colors.primarySoft : "transparent",
                          paddingHorizontal: 3,
                          paddingVertical: 2
                        }}
                      >
                        <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 20, fontWeight: "700" }}>{token.char}</Text>
                        {token.pinyin ? <Text style={[styles.muted, { color: colors.primary, fontStyle: "italic" }]}>{token.pinyin}</Text> : null}
                      </Pressable>
                    );
                    })}
                  </View>
                  <Text style={[styles.body, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                    {translation.translation}
                  </Text>
                  <Text style={styles.muted}>
                    {selectedText ? `Selected: ${selectedText}` : "Tap Chinese characters to save a shorter phrase."}
                  </Text>
                </View>
              )}
            </Card>

            <Card style={{ gap: 10 }}>
              <Text style={styles.h3}>Add to phrase list</Text>
              {phraseLists.length === 0 ? (
                <Text style={styles.muted}>Create a phrase list first to save scanned text.</Text>
              ) : (
                <>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {phraseLists.map((list) => {
                      const selected = selectedListId === list.id;
                      return (
                        <Pressable
                          key={list.id}
                          onPress={() => onSelectList(list.id)}
                          style={{
                            borderWidth: 1,
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primarySoft : colors.white,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            minHeight: 40,
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: "700" }}>{list.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Button disabled={!selectedListId} loading={saving} onPress={onAdd}>
                    Add to phrase list
                  </Button>
                </>
              )}
            </Card>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
