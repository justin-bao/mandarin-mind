import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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
import { Loader2, Languages, Plus, CheckCircle, Subtitles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { translateApi, phraseListsApi } from "@/lib/api";
import { getAuthHeaders } from "@/lib/supabase";
import type { MediaItem, Caption, PhraseList } from "@shared/schema";

interface Props {
  mediaItem: MediaItem;
}

export default function MediaCaptionPlayer({ mediaItem }: Props) {
  const { toast } = useToast();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const captionListRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [selectedCaption, setSelectedCaption] = useState<Caption | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [translation, setTranslation] = useState<{ tokens: { char: string; pinyin: string }[]; translation: string } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [addToListId, setAddToListId] = useState("");
  const [added, setAdded] = useState(false);

  const captions = mediaItem.captions ?? [];
  const isVideo = mediaItem.type === "video";

  const { data: phraseLists = [] } = useQuery<(PhraseList & { itemCount?: number })[]>({
    queryKey: ["/api/phrase-lists"],
    queryFn: async () => (await fetch("/api/phrase-lists", { headers: await getAuthHeaders() })).json(),
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

  // Track playback time
  const handleTimeUpdate = useCallback(() => {
    const el = mediaRef.current as HTMLVideoElement | null;
    if (el) setCurrentMs(Math.round(el.currentTime * 1000));
  }, []);

  // Auto-scroll active caption into view
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentMs]);

  const isActive = (cap: Caption) => currentMs >= cap.startMs && currentMs < cap.endMs;

  const openCaption = (cap: Caption) => {
    setSelectedCaption(cap);
    setTranslation(null);
    setAdded(false);
    setAddToListId("");
    setSheetOpen(true);
  };

  const handleTranslate = async () => {
    if (!selectedCaption) return;
    setTranslating(true);
    try {
      const result = await translateApi.sentence(selectedCaption.chinese, "zh-en");
      setTranslation(result);
    } catch {
      toast({ description: "Translation failed", variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  const seekToCaption = (cap: Caption, e: React.MouseEvent) => {
    e.stopPropagation();
    const el = mediaRef.current as HTMLVideoElement | null;
    if (el) el.currentTime = cap.startMs / 1000;
  };

  const handleAddToList = () => {
    if (!selectedCaption || !addToListId) return;
    addItemMutation.mutate({
      listId: addToListId,
      chinese: selectedCaption.chinese,
      english: selectedCaption.english,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Media player */}
      <div className="rounded-lg overflow-hidden bg-black border">
        {isVideo ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={mediaItem.fileUrl}
            controls
            className="w-full max-h-64 object-contain"
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Subtitles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium truncate max-w-xs">
              {mediaItem.originalName}
            </p>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={mediaItem.fileUrl}
              controls
              className="w-full"
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        )}
      </div>

      {/* Captions panel */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide px-1">
          Captions — tap any line to translate
        </p>

        {captions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No captions were generated for this file.
          </p>
        )}

        <div ref={captionListRef} className="space-y-1">
          {captions.map((cap, i) => {
            const active = isActive(cap);
            return (
              <button
                key={i}
                ref={active ? activeRowRef : undefined}
                type="button"
                onClick={() => openCaption(cap)}
                onDoubleClick={(e) => seekToCaption(cap, e)}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors border ${
                  active
                    ? "bg-primary/10 border-primary/30"
                    : "bg-card border-transparent hover-elevate"
                }`}
              >
                <p className={`font-chinese text-base leading-snug ${active ? "text-primary font-medium" : "text-foreground"}`}>
                  {cap.chinese}
                </p>
                <p className={`text-sm mt-0.5 ${active ? "text-primary/80" : "text-muted-foreground"}`}>
                  {cap.english}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] overflow-auto rounded-t-xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="font-chinese text-xl text-left leading-snug">
              {selectedCaption?.chinese}
            </SheetTitle>
            <p className="text-sm text-muted-foreground text-left">
              {selectedCaption?.english}
            </p>
          </SheetHeader>

          <div className="space-y-4 pt-2">
            {/* Detailed translation */}
            {!translation ? (
              <Button variant="outline" className="w-full" onClick={handleTranslate} disabled={translating}>
                {translating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Languages className="h-4 w-4 mr-2" />
                )}
                Detailed Translation
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg bg-muted p-3">
                <div className="flex flex-wrap gap-2">
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
                        No lists yet — create one in Practice
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
