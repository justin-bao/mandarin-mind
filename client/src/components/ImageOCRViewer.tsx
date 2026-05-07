import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Languages, Plus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { translateApi, phraseListsApi } from "@/lib/api";
import { getAuthHeaders } from "@/lib/supabase";
import type { MediaItem, OcrBlock, PhraseList } from "@shared/schema";

interface Props {
  mediaItem: MediaItem;
}

interface TranslationResult {
  chinese: string;
  translation: string;
  tokens: { char: string; pinyin: string }[];
}

export default function ImageOCRViewer({ mediaItem }: Props) {
  const { toast } = useToast();
  const [selectedBlock, setSelectedBlock] = useState<OcrBlock | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [translating, setTranslating] = useState(false);
  const [addToListId, setAddToListId] = useState<string>("");
  const [added, setAdded] = useState(false);

  const { data: phraseLists = [] } = useQuery<(PhraseList & { itemCount?: number })[]>({
    queryKey: ["/api/phrase-lists"],
    queryFn: async () => {
      const res = await fetch("/api/phrase-lists", { headers: await getAuthHeaders() });
      return res.json();
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ listId, chinese, english }: { listId: string; chinese: string; english: string }) =>
      phraseListsApi.addItem(listId, { chinese, english }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists"] });
      setAdded(true);
      toast({ description: "Added to phrase list" });
    },
    onError: () => toast({ description: "Failed to add to list", variant: "destructive" }),
  });

  const openBlock = (block: OcrBlock) => {
    setSelectedBlock(block);
    setTranslation(null);
    setAdded(false);
    setAddToListId("");
    setSheetOpen(true);
  };

  const handleTranslate = async () => {
    if (!selectedBlock) return;
    setTranslating(true);
    try {
      const result = await translateApi.sentence(selectedBlock.text, "zh-en");
      setTranslation(result);
    } catch {
      toast({ description: "Translation failed", variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  const handleAddToList = () => {
    if (!selectedBlock || !addToListId) return;
    const english = translation?.translation ?? "";
    addItemMutation.mutate({
      listId: addToListId,
      chinese: selectedBlock.text,
      english,
    });
  };

  const blocks = mediaItem.ocrBlocks ?? [];

  return (
    <div className="p-4 space-y-3">
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No text blocks were detected in this image.
        </p>
      )}

      {/* Image with overlaid OCR blocks */}
      <div className="relative inline-block w-full rounded-lg overflow-hidden border bg-muted">
        <img
          src={mediaItem.fileUrl}
          alt={mediaItem.originalName}
          className="w-full h-auto block"
          draggable={false}
        />

        {blocks.map((block, i) => (
          <button
            key={i}
            type="button"
            onClick={() => openBlock(block)}
            className="absolute rounded px-1 py-px font-chinese text-xs leading-tight bg-primary/20 text-primary border border-primary/40 hover:bg-primary/40 hover:border-primary/70 transition-colors overflow-hidden whitespace-nowrap"
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
              width: `${block.width}%`,
              minWidth: "2rem",
              height: `${Math.max(block.height, 2)}%`,
              minHeight: "1.4rem",
            }}
            title={block.text}
          >
            <span className="block truncate">{block.text}</span>
          </button>
        ))}
      </div>

      {/* Text block list below image */}
      {blocks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Detected text — tap to translate
          </p>
          <div className="flex flex-wrap gap-2">
            {blocks.map((block, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openBlock(block)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card border text-sm hover-elevate font-chinese"
              >
                {block.text}
                {block.confidence < 70 && (
                  <Badge variant="outline" className="text-xs ml-1 opacity-60">low</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] overflow-auto rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-chinese text-2xl text-left">
              {selectedBlock?.text}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Translate */}
            {!translation ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTranslate}
                disabled={translating}
              >
                {translating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Languages className="h-4 w-4 mr-2" />
                )}
                Translate
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg bg-muted p-3">
                <div className="flex flex-wrap gap-1">
                  {translation.tokens.map((t, i) => (
                    <span key={i} className="text-center">
                      <span className="block font-chinese text-base">{t.char}</span>
                      <span className="block text-xs text-muted-foreground italic">{t.pinyin}</span>
                    </span>
                  ))}
                </div>
                <p className="text-sm text-foreground border-t pt-2 mt-2">
                  {translation.translation}
                </p>
              </div>
            )}

            {/* Add to phrase list */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Add to phrase list</p>
              <div className="flex gap-2">
                <Select value={addToListId} onValueChange={setAddToListId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a list…" />
                  </SelectTrigger>
                  <SelectContent>
                    {phraseLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                    {phraseLists.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        No lists yet — create one in My Phrases
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  disabled={!addToListId || addItemMutation.isPending || added}
                  onClick={handleAddToList}
                >
                  {added ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : addItemMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
