import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { phraseListsApi, phraseLookupApi, audioApi, playAudio } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  ChevronLeft,
  Trash2,
  Play,
  Volume2,
  Loader2,
  Search,
  FolderOpen,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Languages,
} from "lucide-react";
import type { PhraseList, PhraseListItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAiUsage } from "@/hooks/use-ai-usage";
import SentenceTranslator, { SelectionPopupPanel, useSelectionPopup } from "./SentenceTranslator";
import AiCreditTooltip from "./AiCreditTooltip";

type ExampleSentence = { sentence: string; pinyin: string; translation: string };

// ─── Common phrase dictionary for autocomplete ───────────────────────────────
const PHRASE_DICT: { chinese: string; pinyin: string; english: string }[] = [
  // Greetings
  { chinese: "你好", pinyin: "nǐ hǎo", english: "hello" },
  { chinese: "你好吗", pinyin: "nǐ hǎo ma", english: "how are you?" },
  { chinese: "我很好", pinyin: "wǒ hěn hǎo", english: "I'm fine" },
  { chinese: "再见", pinyin: "zài jiàn", english: "goodbye" },
  { chinese: "早上好", pinyin: "zǎo shang hǎo", english: "good morning" },
  { chinese: "晚上好", pinyin: "wǎn shang hǎo", english: "good evening" },
  { chinese: "晚安", pinyin: "wǎn ān", english: "good night" },
  { chinese: "谢谢", pinyin: "xiè xiè", english: "thank you" },
  { chinese: "不客气", pinyin: "bù kè qi", english: "you're welcome" },
  { chinese: "对不起", pinyin: "duì bu qǐ", english: "I'm sorry" },
  { chinese: "没关系", pinyin: "méi guān xi", english: "it's okay / no problem" },
  { chinese: "请问", pinyin: "qǐng wèn", english: "excuse me / may I ask" },
  { chinese: "我叫", pinyin: "wǒ jiào", english: "my name is" },
  { chinese: "你叫什么名字", pinyin: "nǐ jiào shén me míng zì", english: "what's your name?" },
  { chinese: "很高兴认识你", pinyin: "hěn gāo xìng rèn shi nǐ", english: "nice to meet you" },

  // Restaurant
  { chinese: "菜单", pinyin: "cài dān", english: "menu" },
  { chinese: "服务员", pinyin: "fú wù yuán", english: "waiter / waitress" },
  { chinese: "买单", pinyin: "mǎi dān", english: "the bill please" },
  { chinese: "多少钱", pinyin: "duō shǎo qián", english: "how much does it cost?" },
  { chinese: "我要点菜", pinyin: "wǒ yào diǎn cài", english: "I'd like to order" },
  { chinese: "推荐什么菜", pinyin: "tuī jiàn shén me cài", english: "what do you recommend?" },
  { chinese: "不辣", pinyin: "bù là", english: "not spicy" },
  { chinese: "素食", pinyin: "sù shí", english: "vegetarian" },
  { chinese: "好吃", pinyin: "hǎo chī", english: "delicious" },
  { chinese: "一杯水", pinyin: "yī bēi shuǐ", english: "a glass of water" },
  { chinese: "我对花生过敏", pinyin: "wǒ duì huā shēng guò mǐn", english: "I'm allergic to peanuts" },
  { chinese: "打包", pinyin: "dǎ bāo", english: "to go / take-away" },
  { chinese: "小费", pinyin: "xiǎo fèi", english: "tip (gratuity)" },
  { chinese: "预订座位", pinyin: "yù dìng zuò wèi", english: "to reserve a table" },
  { chinese: "几位", pinyin: "jǐ wèi", english: "how many people?" },

  // Transport / Train Station
  { chinese: "火车站", pinyin: "huǒ chē zhàn", english: "train station" },
  { chinese: "地铁站", pinyin: "dì tiě zhàn", english: "subway station" },
  { chinese: "公共汽车", pinyin: "gōng gòng qì chē", english: "bus" },
  { chinese: "出租车", pinyin: "chū zū chē", english: "taxi" },
  { chinese: "飞机场", pinyin: "fēi jī chǎng", english: "airport" },
  { chinese: "去哪里", pinyin: "qù nǎ lǐ", english: "where are you going?" },
  { chinese: "去…怎么走", pinyin: "qù … zěn me zǒu", english: "how do I get to…?" },
  { chinese: "坐几号线", pinyin: "zuò jǐ hào xiàn", english: "which subway line to take?" },
  { chinese: "换乘", pinyin: "huàn chéng", english: "transfer (transport)" },
  { chinese: "终点站", pinyin: "zhōng diǎn zhàn", english: "final station" },
  { chinese: "下一站", pinyin: "xià yī zhàn", english: "next stop" },
  { chinese: "票", pinyin: "piào", english: "ticket" },
  { chinese: "单程票", pinyin: "dān chéng piào", english: "one-way ticket" },
  { chinese: "来回票", pinyin: "lái huí piào", english: "round-trip ticket" },
  { chinese: "行李", pinyin: "xíng lǐ", english: "luggage" },

  // Shopping
  { chinese: "我只是看看", pinyin: "wǒ zhǐ shì kàn kàn", english: "I'm just looking" },
  { chinese: "太贵了", pinyin: "tài guì le", english: "too expensive" },
  { chinese: "便宜一点", pinyin: "pián yì yī diǎn", english: "a bit cheaper please" },
  { chinese: "可以试穿吗", pinyin: "kě yǐ shì chuān ma", english: "can I try it on?" },
  { chinese: "有没有大码", pinyin: "yǒu méi yǒu dà mǎ", english: "do you have a larger size?" },
  { chinese: "收现金吗", pinyin: "shōu xiàn jīn ma", english: "do you accept cash?" },
  { chinese: "刷卡", pinyin: "shuā kǎ", english: "pay by card" },
  { chinese: "打折", pinyin: "dǎ zhé", english: "discount / sale" },
  { chinese: "退货", pinyin: "tuì huò", english: "return / refund" },
  { chinese: "收据", pinyin: "shōu jù", english: "receipt" },

  // Job Interview
  { chinese: "请做自我介绍", pinyin: "qǐng zuò zì wǒ jiè shào", english: "please introduce yourself" },
  { chinese: "你的优点是什么", pinyin: "nǐ de yōu diǎn shì shén me", english: "what are your strengths?" },
  { chinese: "你的缺点是什么", pinyin: "nǐ de quē diǎn shì shén me", english: "what are your weaknesses?" },
  { chinese: "工作经验", pinyin: "gōng zuò jīng yàn", english: "work experience" },
  { chinese: "薪资要求", pinyin: "xīn zī yāo qiú", english: "salary expectations" },
  { chinese: "全职工作", pinyin: "quán zhí gōng zuò", english: "full-time job" },
  { chinese: "兼职工作", pinyin: "jiān zhí gōng zuò", english: "part-time job" },
  { chinese: "团队合作", pinyin: "tuán duì hé zuò", english: "teamwork" },
  { chinese: "领导能力", pinyin: "lǐng dǎo néng lì", english: "leadership ability" },
  { chinese: "为什么想加入我们", pinyin: "wèi shén me xiǎng jiā rù wǒ men", english: "why do you want to join us?" },
  { chinese: "你有什么问题吗", pinyin: "nǐ yǒu shén me wèn tí ma", english: "do you have any questions?" },
  { chinese: "期望工作时间", pinyin: "qī wàng gōng zuò shí jiān", english: "expected working hours" },

  // Healthcare
  { chinese: "我头疼", pinyin: "wǒ tóu téng", english: "I have a headache" },
  { chinese: "我发烧了", pinyin: "wǒ fā shāo le", english: "I have a fever" },
  { chinese: "我需要看医生", pinyin: "wǒ xū yào kàn yī shēng", english: "I need to see a doctor" },
  { chinese: "药店在哪里", pinyin: "yào diàn zài nǎ lǐ", english: "where is the pharmacy?" },
  { chinese: "这里痛", pinyin: "zhè lǐ tòng", english: "it hurts here" },
  { chinese: "过敏", pinyin: "guò mǐn", english: "allergy" },
  { chinese: "保险", pinyin: "bǎo xiǎn", english: "insurance" },

  // Daily life
  { chinese: "在哪里", pinyin: "zài nǎ lǐ", english: "where is it?" },
  { chinese: "厕所在哪里", pinyin: "cè suǒ zài nǎ lǐ", english: "where is the bathroom?" },
  { chinese: "我不懂", pinyin: "wǒ bù dǒng", english: "I don't understand" },
  { chinese: "请再说一遍", pinyin: "qǐng zài shuō yī biàn", english: "please say it again" },
  { chinese: "请说慢一点", pinyin: "qǐng shuō màn yī diǎn", english: "please speak more slowly" },
  { chinese: "我的中文不好", pinyin: "wǒ de zhōng wén bù hǎo", english: "my Chinese is not good" },
  { chinese: "你会说英文吗", pinyin: "nǐ huì shuō yīng wén ma", english: "do you speak English?" },
  { chinese: "帮我一下", pinyin: "bāng wǒ yī xià", english: "help me please" },
  { chinese: "紧急情况", pinyin: "jǐn jí qíng kuàng", english: "emergency" },
  { chinese: "报警", pinyin: "bào jǐng", english: "call the police" },
  { chinese: "我迷路了", pinyin: "wǒ mí lù le", english: "I'm lost" },
  { chinese: "Wi-Fi 密码是多少", pinyin: "Wi-Fi mì mǎ shì duō shǎo", english: "what's the Wi-Fi password?" },

  // Numbers / Time
  { chinese: "现在几点", pinyin: "xiàn zài jǐ diǎn", english: "what time is it now?" },
  { chinese: "今天几号", pinyin: "jīn tiān jǐ hào", english: "what date is today?" },
  { chinese: "明天", pinyin: "míng tiān", english: "tomorrow" },
  { chinese: "昨天", pinyin: "zuó tiān", english: "yesterday" },
  { chinese: "星期一", pinyin: "xīng qī yī", english: "Monday" },
  { chinese: "小时", pinyin: "xiǎo shí", english: "hour" },
  { chinese: "分钟", pinyin: "fēn zhōng", english: "minute" },
];

function matchesSuggestion(entry: typeof PHRASE_DICT[0], query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  return (
    entry.chinese.includes(query) ||
    entry.pinyin.toLowerCase().includes(q) ||
    entry.english.toLowerCase().includes(q)
  );
}

// ─── Add Phrase Dialog ────────────────────────────────────────────────────────
interface AddPhraseDialogProps {
  open: boolean;
  listId: string;
  onClose: () => void;
}

function AddPhraseDialog({ open, listId, onClose }: AddPhraseDialogProps) {
  const { toast } = useToast();
  const [chinese, setChinese] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [english, setEnglish] = useState("");
  const [suggestions, setSuggestions] = useState<typeof PHRASE_DICT>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const addItemMutation = useMutation({
    mutationFn: (data: { chinese: string; pinyin?: string; english: string }) =>
      phraseListsApi.addItem(listId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists", listId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists"] });
      toast({ description: "Phrase added to list" });
      resetAndClose();
    },
    onError: () => {
      toast({ description: "Failed to add phrase", variant: "destructive" });
    },
  });

  const resetAndClose = () => {
    setChinese("");
    setPinyin("");
    setEnglish("");
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  const handleChineseChange = (value: string) => {
    setChinese(value);
    // Clear auto-filled fields when user changes the chinese text
    if (!value) {
      setPinyin("");
      setEnglish("");
    }
    // Filter suggestions
    if (value.trim()) {
      const matches = PHRASE_DICT.filter((e) => matchesSuggestion(e, value.trim())).slice(0, 8);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (entry: typeof PHRASE_DICT[0]) => {
    setChinese(entry.chinese);
    setPinyin(entry.pinyin);
    setEnglish(entry.english);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleLookup = async () => {
    if (!chinese.trim()) return;
    setLookingUp(true);
    try {
      const result = await phraseLookupApi.lookup(chinese.trim());
      setPinyin(result.pinyin);
      setEnglish(result.english);
    } catch {
      toast({ description: "Lookup failed. Please fill in manually.", variant: "destructive" });
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = () => {
    if (!chinese.trim() || !english.trim()) return;
    addItemMutation.mutate({ chinese: chinese.trim(), pinyin: pinyin.trim() || undefined, english: english.trim() });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionRef.current && !suggestionRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Phrase</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Chinese input with autocomplete */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="dlg-chinese">Chinese Characters</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  id="dlg-chinese"
                  placeholder="你好 or type pinyin/English to search…"
                  value={chinese}
                  onChange={(e) => handleChineseChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  className="font-chinese text-lg pr-8"
                  autoComplete="off"
                />
                {chinese && (
                  <button
                    type="button"
                    onClick={() => { setChinese(""); setPinyin(""); setEnglish(""); setSuggestions([]); setShowSuggestions(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionRef}
                    className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-md overflow-hidden"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.chinese}
                        type="button"
                        className="w-full text-left px-3 py-2 hover-elevate flex items-center gap-3 border-b last:border-b-0"
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                      >
                        <span className="font-chinese text-base font-medium">{s.chinese}</span>
                        <span className="text-sm text-muted-foreground italic">{s.pinyin}</span>
                        <span className="text-sm text-muted-foreground ml-auto">{s.english}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleLookup}
                disabled={!chinese.trim() || lookingUp}
                title="Auto-fill pinyin & English using AI"
              >
                {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Type Chinese characters, pinyin, or English to search. Click the search icon to auto-fill with AI.
            </p>
          </div>

          {/* Pinyin */}
          <div className="space-y-1.5">
            <Label htmlFor="dlg-pinyin">Pinyin</Label>
            <Input
              id="dlg-pinyin"
              placeholder="nǐ hǎo"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              className="italic"
            />
          </div>

          {/* English */}
          <div className="space-y-1.5">
            <Label htmlFor="dlg-english">English Translation</Label>
            <Input
              id="dlg-english"
              placeholder="hello"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!chinese.trim() || !english.trim() || addItemMutation.isPending}
          >
            {addItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Phrase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit List Dialog ────────────────────────────────────────────────
interface ListFormDialogProps {
  open: boolean;
  existing?: PhraseList | null;
  onClose: () => void;
}

function ListFormDialog({ open, existing, onClose }: ListFormDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");

  useEffect(() => {
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => phraseListsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists"] });
      toast({ description: "List created" });
      onClose();
    },
    onError: () => toast({ description: "Failed to create list", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      phraseListsApi.update(existing!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists"] });
      toast({ description: "List updated" });
      onClose();
    },
    onError: () => toast({ description: "Failed to update list", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), description: description.trim() || undefined };
    if (existing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit List" : "New Phrase List"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="list-name">Name</Label>
            <Input
              id="list-name"
              placeholder="e.g. Restaurant, Job Interview…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="list-desc">Description (optional)</Label>
            <Textarea
              id="list-desc"
              placeholder="What's this list for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {existing ? "Save Changes" : "Create List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── List Detail View ─────────────────────────────────────────────────────────
interface ListDetailProps {
  list: PhraseList & { itemCount?: number };
  onBack: () => void;
  onStartPractice: (words: { chinese: string; pinyin: string; english: string }[]) => void;
}

function parseExamples(raw: string | null | undefined): ExampleSentence[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as ExampleSentence[]; } catch { return []; }
}

// ─── Phrase card with example sentences ───────────────────────────────────────
// Helper: extracts CJK characters from a mouse/touch selection and fires onSelectionChange
function useExampleSelectionHandler(
  onSelectionChange: (chinese: string, rect: DOMRect | null) => void
) {
  return useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { onSelectionChange("", null); return; }
    const raw = sel.toString();
    const chinese = raw.replace(/[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, "").trim();
    if (!chinese) { onSelectionChange("", null); return; }
    const range = sel.getRangeAt(0);
    onSelectionChange(chinese, range.getBoundingClientRect());
  }, [onSelectionChange]);
}

function ExampleItem({
  ex,
  onSelectionChange,
}: {
  ex: ExampleSentence;
  onSelectionChange: (chinese: string, rect: DOMRect | null) => void;
}) {
  const handleMouseUp = useExampleSelectionHandler(onSelectionChange);

  return (
    <div
      className="rounded-md bg-muted/50 p-2 space-y-0.5 select-text cursor-text"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
    >
      <div className="font-chinese text-base leading-snug">{ex.sentence}</div>
      {ex.pinyin && (
        <div className="text-xs text-primary italic">{ex.pinyin}</div>
      )}
      <div className="text-xs text-foreground/70">{ex.translation}</div>
    </div>
  );
}

function PhraseCard({
  item,
  listId,
  playingId,
  onPlay,
  onDelete,
  isOutOfCredits,
  refreshAiUsage,
}: {
  item: PhraseListItem;
  listId: string;
  playingId: string | null;
  onPlay: (item: PhraseListItem) => void;
  onDelete: (id: string) => void;
  isOutOfCredits: boolean;
  refreshAiUsage: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const examples = parseExamples(item.exampleSentences);
  const { popup, setPopup, handleSelectionChange } = useSelectionPopup();

  const generateMutation = useMutation({
    mutationFn: () => phraseLookupApi.exampleSentence(item.chinese, item.english),
    onSuccess: (newExample) => {
      refreshAiUsage();
      const updated = [...examples, newExample];
      phraseListsApi.updateItem(listId, item.id, {
        exampleSentences: JSON.stringify(updated),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists", listId, "items"] });
      });
      setExpanded(true);
    },
    onError: () => toast({ description: "Failed to generate example", variant: "destructive" }),
  });

  return (
    <>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-chinese text-lg leading-tight">{item.chinese}</div>
              {item.pinyin && (
                <div className="text-sm text-muted-foreground italic">{item.pinyin}</div>
              )}
              <div className="text-sm text-foreground/80">{item.english}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <AiCreditTooltip disabled={isOutOfCredits}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPlay(item)}
                  disabled={playingId !== null || isOutOfCredits}
                  title="Play pronunciation"
                >
                  {playingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </AiCreditTooltip>
              <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} title="Remove phrase">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Example sentences section */}
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {examples.length > 0
                  ? `${examples.length} example${examples.length !== 1 ? "s" : ""}`
                  : "Example sentences"}
              </button>
              <AiCreditTooltip disabled={isOutOfCredits}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || isOutOfCredits}
                  className="h-6 px-2 text-xs"
                  title="Generate an example sentence"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Generate
                </Button>
              </AiCreditTooltip>
            </div>

            {expanded && examples.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-[0.65rem] text-muted-foreground">
                  Select any Chinese sub-phrase to look it up
                </p>
                {examples.map((ex, i) => (
                  <ExampleItem key={i} ex={ex} onSelectionChange={handleSelectionChange} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sub-phrase selection popup */}
      {popup && (
        <SelectionPopupPanel
          popup={popup}
          onClose={() => setPopup(null)}
          preferredListId={listId}
        />
      )}
    </>
  );
}

function ListDetail({ list, onBack, onStartPractice }: ListDetailProps) {
  const { toast } = useToast();
  const { isOutOfCredits, refreshAiUsage } = useAiUsage();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<PhraseListItem[]>({
    queryKey: ["/api/phrase-lists", list.id, "items"],
    queryFn: () => phraseListsApi.getItems(list.id),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => phraseListsApi.deleteItem(list.id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists", list.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists"] });
      setDeleteItemId(null);
    },
    onError: () => toast({ description: "Failed to remove phrase", variant: "destructive" }),
  });

  const handlePlay = async (item: PhraseListItem) => {
    if (playingId) return;
    setPlayingId(item.id);
    try {
      const { audioUrl } = await audioApi.generate(item.chinese);
      refreshAiUsage();
      await playAudio(audioUrl);
    } catch {
      toast({ description: "Failed to play audio", variant: "destructive" });
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">{list.name}</h2>
          {list.description && (
            <p className="text-sm text-muted-foreground truncate">{list.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} title="Edit list">
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Phrase
        </Button>
        {items.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              onStartPractice(
                items.map((i) => ({ chinese: i.chinese, pinyin: i.pinyin ?? "", english: i.english }))
              )
            }
          >
            <Play className="h-4 w-4 mr-2" />
            Practice This List
          </Button>
        )}
        <Badge variant="secondary" className="self-center ml-auto">
          {items.length} {items.length === 1 ? "phrase" : "phrases"}
        </Badge>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No phrases yet. Add your first one!</p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Phrase
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <PhraseCard
              key={item.id}
              item={item}
              listId={list.id}
              playingId={playingId}
              onPlay={handlePlay}
              onDelete={(id) => setDeleteItemId(id)}
              isOutOfCredits={isOutOfCredits}
              refreshAiUsage={refreshAiUsage}
            />
          ))}
        </div>
      )}

      <AddPhraseDialog open={addOpen} listId={list.id} onClose={() => setAddOpen(false)} />
      <ListFormDialog open={editOpen} existing={list} onClose={() => setEditOpen(false)} />

      <AlertDialog open={!!deleteItemId} onOpenChange={(o) => { if (!o) setDeleteItemId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove phrase?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the phrase from this list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && deleteItemMutation.mutate(deleteItemId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Lists Overview ───────────────────────────────────────────────────────────
type PhraseListWithCount = PhraseList & { itemCount: number };

interface PhraseListsManagerProps {
  onStartPractice?: (words: { chinese: string; pinyin: string; english: string }[]) => void;
}

export default function PhraseListsManager({ onStartPractice }: PhraseListsManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"lists" | "translate">("lists");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<PhraseListWithCount | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);

  const { data: lists = [], isLoading } = useQuery<PhraseListWithCount[]>({
    queryKey: ["/api/phrase-lists"],
    queryFn: phraseListsApi.getAll,
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => phraseListsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrase-lists"] });
      setDeleteListId(null);
      if (selectedList?.id === deleteListId) setSelectedList(null);
      toast({ description: "List deleted" });
    },
    onError: () => toast({ description: "Failed to delete list", variant: "destructive" }),
  });

  // If a list is selected, show detail view
  if (selectedList) {
    return (
      <ListDetail
        list={selectedList}
        onBack={() => setSelectedList(null)}
        onStartPractice={(words) => {
          onStartPractice?.(words);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("lists")}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "lists"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          My Lists
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("translate")}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "translate"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Languages className="h-4 w-4" />
          Translate
        </button>
      </div>

      {/* Translate tab */}
      {activeTab === "translate" && (
        <SentenceTranslator />
      )}

      {/* Lists tab */}
      {activeTab === "lists" && <>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">My Phrase Lists</h2>
          <p className="text-sm text-muted-foreground">Organize phrases into collections for focused practice</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New List
        </Button>
      </div>

      {/* Lists grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">No lists yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a collection like "Restaurant", "Job Interview", or "Travel" to get started.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.map((list) => (
            <Card key={list.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedList(list)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{list.name}</div>
                  {list.description && (
                    <div className="text-sm text-muted-foreground truncate">{list.description}</div>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {list.itemCount} {list.itemCount === 1 ? "phrase" : "phrases"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); setDeleteListId(list.id); }}
                  title="Delete list"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <AlertDialog open={!!deleteListId} onOpenChange={(o) => { if (!o) setDeleteListId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the list and all its phrases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteListId && deleteListMutation.mutate(deleteListId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>}
    </div>
  );
}
