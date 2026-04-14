import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { translateApi, phraseListsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages, Loader2, Plus, X, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Token { char: string; pinyin: string }

interface SelectionPopup {
  chinese: string;
  pinyin: string;
  translation: string;
  x: number;
  y: number;
  loading: boolean;
}

// ─── Annotated sentence display ───────────────────────────────────────────────
function AnnotatedSentence({
  tokens,
  onSelectionChange,
}: {
  tokens: Token[];
  onSelectionChange: (chinese: string, rect: DOMRect | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      onSelectionChange("", null);
      return;
    }
    const raw = sel.toString();
    // keep only CJK unified ideographs + common Chinese punctuation
    const chinese = raw.replace(/[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, "").trim();
    if (!chinese) {
      onSelectionChange("", null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    onSelectionChange(chinese, rect);
  }, [onSelectionChange]);

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      className="select-text cursor-text"
    >
      <div className="flex flex-wrap gap-x-0.5 gap-y-3 leading-none">
        {tokens.map((token, i) => {
          const isChinese = /[\u4e00-\u9fff]/.test(token.char);
          if (!isChinese) {
            return (
              <span key={i} className="font-chinese text-2xl self-end pb-0.5 text-muted-foreground">
                {token.char}
              </span>
            );
          }
          return (
            <span key={i} className="flex flex-col items-center" style={{ minWidth: "1.5rem" }}>
              <span className="block text-[0.65rem] text-primary italic leading-tight select-none whitespace-nowrap">
                {token.pinyin}
              </span>
              <span className="block font-chinese text-2xl leading-tight">{token.char}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Selection popup ──────────────────────────────────────────────────────────
interface PopupProps {
  popup: SelectionPopup;
  onClose: () => void;
  phraseListId?: string;
}

function SelectionPopupPanel({ popup, onClose, phraseListId }: PopupProps) {
  const { toast } = useToast();
  const [selectedListId, setSelectedListId] = useState(phraseListId ?? "");
  const popupRef = useRef<HTMLDivElement>(null);

  const { data: lists = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/phrase-lists"],
    queryFn: phraseListsApi.getAll,
  });

  const addMutation = useMutation({
    mutationFn: (listId: string) =>
      phraseListsApi.addItem(listId, {
        chinese: popup.chinese,
        pinyin: popup.pinyin,
        english: popup.translation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists"] });
      toast({ description: `Added "${popup.chinese}" to list` });
      onClose();
    },
    onError: () => toast({ description: "Failed to add phrase", variant: "destructive" }),
  });

  // Position the popup above the selection, clamped to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    // start at selection midpoint, then adjust after measure
    left: Math.max(8, Math.min(popup.x - 120, window.innerWidth - 256)),
    top: Math.max(8, popup.y - 8),
    transform: "translateY(-100%)",
  };

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      style={style}
      className="w-64 bg-popover border rounded-md shadow-lg p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-chinese text-xl font-semibold leading-tight">{popup.chinese}</div>
          {popup.loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mt-1" />
          ) : (
            <>
              <div className="text-xs text-primary italic mt-0.5">{popup.pinyin}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{popup.translation}</div>
            </>
          )}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!popup.loading && (
        <div className="pt-1 border-t space-y-2">
          {lists.length > 0 ? (
            <>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a list…" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="w-full"
                disabled={!selectedListId || addMutation.isPending}
                onClick={() => addMutation.mutate(selectedListId)}
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Add to List
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Create a phrase list first to save phrases.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Sentence Translator ─────────────────────────────────────────────────
interface SentenceTranslatorProps {
  /** If provided, the popup will pre-select this list */
  currentListId?: string;
}

export default function SentenceTranslator({ currentListId }: SentenceTranslatorProps) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ tokens: Token[]; translation: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [popup, setPopup] = useState<SelectionPopup | null>(null);

  const handleTranslate = async () => {
    const text = input.trim();
    if (!text) return;
    setIsTranslating(true);
    setResult(null);
    setPopup(null);
    try {
      const data = await translateApi.sentence(text);
      setResult(data);
    } catch {
      toast({ description: "Translation failed. Please try again.", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSelectionChange = useCallback(
    async (chinese: string, rect: DOMRect | null) => {
      if (!chinese || !rect) {
        setPopup(null);
        return;
      }
      const midX = rect.left + rect.width / 2;
      const topY = rect.top + window.scrollY;

      // Show popup immediately with loading state
      setPopup({ chinese, pinyin: "", translation: "", x: midX, y: topY, loading: true });

      // Fetch pinyin + translation in background
      try {
        const result = await translateApi.lookup(chinese);
        setPopup((prev) =>
          prev?.chinese === chinese
            ? { ...prev, pinyin: result.pinyin, translation: result.english, loading: false }
            : prev
        );
      } catch {
        setPopup(null);
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Sentence Translator</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste or type a Chinese sentence. After translating, select any sub-phrase to look it up or add it to a list.
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sentence-input">Chinese Sentence</Label>
            <Textarea
              id="sentence-input"
              placeholder="输入中文句子…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="font-chinese text-lg resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTranslate();
              }}
            />
            <p className="text-xs text-muted-foreground">Press Ctrl+Enter to translate</p>
          </div>
          <Button onClick={handleTranslate} disabled={!input.trim() || isTranslating}>
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Languages className="h-4 w-4 mr-2" />
            )}
            Translate
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Result</span>
              <Badge variant="outline" className="text-xs ml-auto">
                Select any phrase to look it up
              </Badge>
            </div>

            {/* Annotated characters */}
            <div className="py-2">
              <AnnotatedSentence tokens={result.tokens} onSelectionChange={handleSelectionChange} />
            </div>

            {/* English translation */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-1">English</p>
              <p className="text-base">{result.translation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection popup */}
      {popup && (
        <SelectionPopupPanel
          popup={popup}
          onClose={() => setPopup(null)}
          phraseListId={currentListId}
        />
      )}
    </div>
  );
}
