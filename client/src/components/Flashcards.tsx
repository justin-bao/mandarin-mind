import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { phraseListsApi } from "@/lib/api";
import { VOCAB_CATEGORIES, type VocabPhrase } from "@/data/vocab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Compass,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Layers,
  TrendingUp,
  List,
  Eye,
} from "lucide-react";
import type { PhraseList, PhraseListItem } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = "list" | "discover";
type Screen = "setup" | "loading" | "session" | "summary";
type CardResult = "known" | "unknown";

interface FlashCard {
  chinese: string;
  pinyin: string;
  english: string;
  sourceListId?: string;
}

// ─── Shuffle utility ──────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Flip Card ────────────────────────────────────────────────────────────────
function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: FlashCard;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1200px", height: "280px" }}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === " " || e.key === "Enter" ? onFlip() : undefined}
    >
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face — Chinese only */}
        <div
          className="absolute inset-0 rounded-lg border bg-card flex flex-col items-center justify-center gap-3 p-6"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="font-chinese text-6xl font-medium text-center leading-tight">
            {card.chinese}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
            <Eye className="h-3.5 w-3.5" />
            <span>Tap to reveal</span>
          </div>
        </div>

        {/* Back face — full answer */}
        <div
          className="absolute inset-0 rounded-lg border bg-card flex flex-col items-center justify-center gap-2 p-6"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="font-chinese text-4xl font-medium text-center leading-tight">
            {card.chinese}
          </div>
          <div className="text-base text-primary italic mt-1">{card.pinyin}</div>
          <div className="text-xl font-medium text-center mt-1">{card.english}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Category card for Discover setup ────────────────────────────────────────
function CategoryCard({
  category,
  selected,
  onToggle,
}: {
  category: (typeof VOCAB_CATEGORIES)[0];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left rounded-md border p-3 transition-colors hover-elevate ${
        selected
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${selected ? "text-primary" : ""}`}>
            {category.name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {category.description}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={selected ? "default" : "secondary"} className="text-xs">
            {category.phrases.length}
          </Badge>
          {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
      </div>
    </button>
  );
}

// ─── Phrase List selector card ────────────────────────────────────────────────
function ListSelectorCard({
  list,
  selected,
  onToggle,
}: {
  list: PhraseList & { itemCount?: number };
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left rounded-md border p-3 transition-colors hover-elevate ${
        selected
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${selected ? "text-primary" : ""}`}>
            {list.name}
          </div>
          {list.description && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {list.description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={selected ? "default" : "secondary"} className="text-xs">
            {(list as any).itemCount ?? 0} phrases
          </Badge>
          {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
      </div>
    </button>
  );
}

// ─── Setup screen ─────────────────────────────────────────────────────────────
interface SetupProps {
  onStart: (deck: FlashCard[]) => void;
}

function SetupScreen({ onStart }: SetupProps) {
  const [mode, setMode] = useState<Mode>("discover");
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(VOCAB_CATEGORIES.map((c) => c.id))
  );
  const [cardCount, setCardCount] = useState(20);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const { data: lists = [] } = useQuery<(PhraseList & { itemCount: number })[]>({
    queryKey: ["/api/phrase-lists"],
    queryFn: phraseListsApi.getAll,
  });

  const toggleList = (id: string) =>
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleCategory = (id: string) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allCatsSelected = selectedCategories.size === VOCAB_CATEGORIES.length;
  const toggleAllCategories = () =>
    setSelectedCategories(
      allCatsSelected ? new Set() : new Set(VOCAB_CATEGORIES.map((c) => c.id))
    );

  const discoverPool = useMemo(
    () =>
      VOCAB_CATEGORIES.filter((c) => selectedCategories.has(c.id)).flatMap(
        (c) => c.phrases
      ),
    [selectedCategories]
  );

  const handleStart = async () => {
    if (mode === "discover") {
      const deck = shuffle(discoverPool)
        .slice(0, cardCount)
        .map((p) => ({ ...p }));
      onStart(deck);
    } else {
      setIsLoadingItems(true);
      try {
        const allItems = await Promise.all(
          Array.from(selectedListIds).map((lid) => phraseListsApi.getItems(lid))
        );
        const deck = shuffle(allItems.flat()).map((item: PhraseListItem) => ({
          chinese: item.chinese,
          pinyin: item.pinyin ?? "",
          english: item.english,
          sourceListId: item.listId,
        }));
        onStart(deck);
      } catch {
        /* no-op; stay on setup */
      } finally {
        setIsLoadingItems(false);
      }
    }
  };

  const canStart =
    mode === "discover"
      ? selectedCategories.size > 0 && discoverPool.length > 0
      : selectedListIds.size > 0;

  const CARD_COUNT_OPTIONS = [10, 20, 30, 50, 100];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Flashcards</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose a mode, pick your source, then start drilling.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("discover")}
          className={`rounded-md border p-4 text-left hover-elevate transition-colors ${
            mode === "discover"
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-border bg-card"
          }`}
        >
          <Compass
            className={`h-5 w-5 mb-2 ${mode === "discover" ? "text-primary" : "text-muted-foreground"}`}
          />
          <div className={`text-sm font-medium ${mode === "discover" ? "text-primary" : ""}`}>
            Discover
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            HSK vocab by level
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`rounded-md border p-4 text-left hover-elevate transition-colors ${
            mode === "list"
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-border bg-card"
          }`}
        >
          <BookOpen
            className={`h-5 w-5 mb-2 ${mode === "list" ? "text-primary" : "text-muted-foreground"}`}
          />
          <div className={`text-sm font-medium ${mode === "list" ? "text-primary" : ""}`}>
            My Lists
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Drill your saved phrases
          </div>
        </button>
      </div>

      {/* ── Discover options ── */}
      {mode === "discover" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">HSK Levels</span>
            <button
              type="button"
              onClick={toggleAllCategories}
              className="text-xs text-primary hover:underline"
            >
              {allCatsSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {VOCAB_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                selected={selectedCategories.has(cat.id)}
                onToggle={() => toggleCategory(cat.id)}
              />
            ))}
          </div>

          {/* Card count */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cards per session</span>
              <span className="text-sm text-muted-foreground">
                {Math.min(cardCount, discoverPool.length)} / {discoverPool.length} available
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CARD_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCardCount(n)}
                  className={`px-3 py-1 rounded-md border text-sm transition-colors hover-elevate ${
                    cardCount === n
                      ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCardCount(999)}
                className={`px-3 py-1 rounded-md border text-sm transition-colors hover-elevate ${
                  cardCount === 999
                    ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary font-medium"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── List options ── */}
      {mode === "list" && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Select lists to include</span>
          {lists.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <List className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No phrase lists yet. Create some in the Practice tab first.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {lists.map((list) => (
                <ListSelectorCard
                  key={list.id}
                  list={list}
                  selected={selectedListIds.has(list.id)}
                  onToggle={() => toggleList(list.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!canStart || isLoadingItems}
        onClick={handleStart}
      >
        {isLoadingItems ? (
          <>Loading cards…</>
        ) : (
          <>
            <Layers className="h-4 w-4 mr-2" />
            Start{" "}
            {mode === "discover"
              ? `${Math.min(cardCount, discoverPool.length)} cards`
              : `${selectedListIds.size > 0 ? `${selectedListIds.size} list${selectedListIds.size > 1 ? "s" : ""}` : ""}`}
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Session screen ───────────────────────────────────────────────────────────
interface SessionProps {
  deck: FlashCard[];
  onComplete: (results: CardResult[]) => void;
  onExit: () => void;
}

function SessionScreen({ deck, onComplete, onExit }: SessionProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);

  const card = deck[index];
  const progress = (index / deck.length) * 100;
  const knownSoFar = results.filter((r) => r === "known").length;

  const handleFlip = useCallback(() => setFlipped((f) => !f), []);

  const handleRate = useCallback(
    (result: CardResult) => {
      const newResults = [...results, result];
      if (index + 1 >= deck.length) {
        onComplete(newResults);
      } else {
        setResults(newResults);
        setIndex((i) => i + 1);
        setFlipped(false);
      }
    },
    [results, index, deck.length, onComplete]
  );

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {index + 1} / {deck.length}
            </span>
            <span className="text-primary font-medium">{knownSoFar} known</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col justify-center gap-4">
        <FlipCard card={card} flipped={flipped} onFlip={handleFlip} />

        {/* Rating buttons — only visible once flipped */}
        <div
          className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${
            flipped ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Button
            variant="outline"
            size="lg"
            className="border-destructive/50 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
            onClick={() => handleRate("unknown")}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Still learning
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10 dark:hover:bg-green-500/20"
            onClick={() => handleRate("known")}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Got it!
          </Button>
        </div>

        {!flipped && (
          <p className="text-center text-xs text-muted-foreground">
            Tap the card to reveal pinyin and translation
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Summary screen ───────────────────────────────────────────────────────────
interface SummaryProps {
  deck: FlashCard[];
  results: CardResult[];
  onReviewMissed: (missed: FlashCard[]) => void;
  onRestart: () => void;
}

function SummaryScreen({ deck, results, onReviewMissed, onRestart }: SummaryProps) {
  const total = results.length;
  const knownCount = results.filter((r) => r === "known").length;
  const unknownCount = total - knownCount;
  const pct = total > 0 ? Math.round((knownCount / total) * 100) : 0;

  const missedCards = deck.filter((_, i) => results[i] === "unknown");

  const message =
    pct === 100
      ? "Perfect score!"
      : pct >= 80
      ? "Great work!"
      : pct >= 60
      ? "Good progress!"
      : "Keep practising!";

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="text-center space-y-1 pt-2">
        <div className="text-3xl font-bold">{message}</div>
        <p className="text-sm text-muted-foreground">Session complete</p>
      </div>

      {/* Big score ring */}
      <div className="flex justify-center">
        <div className="relative flex items-center justify-center w-36 h-36">
          <svg className="absolute inset-0" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000"
              style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
            />
          </svg>
          <div className="text-center">
            <div className="text-3xl font-bold">{pct}%</div>
            <div className="text-xs text-muted-foreground">score</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground mt-0.5">cards</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {knownCount}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">known</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{unknownCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">missed</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Known</span>
          <span>Missed</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-green-500 dark:bg-green-600 transition-all duration-700 rounded-l-full"
            style={{ width: `${pct}%` }}
          />
          <div
            className="h-full bg-destructive/70 transition-all duration-700 rounded-r-full"
            style={{ width: `${100 - pct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {missedCards.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onReviewMissed(missedCards)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Review {missedCards.length} missed card{missedCards.length !== 1 ? "s" : ""}
          </Button>
        )}
        <Button className="w-full" onClick={onRestart}>
          <TrendingUp className="h-4 w-4 mr-2" />
          New session
        </Button>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function Flashcards() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [deck, setDeck] = useState<FlashCard[]>([]);
  const [results, setResults] = useState<CardResult[]>([]);

  const handleStart = useCallback((newDeck: FlashCard[]) => {
    setDeck(newDeck);
    setResults([]);
    setScreen("session");
  }, []);

  const handleComplete = useCallback((res: CardResult[]) => {
    setResults(res);
    setScreen("summary");
  }, []);

  const handleReviewMissed = useCallback((missed: FlashCard[]) => {
    setDeck(shuffle(missed));
    setResults([]);
    setScreen("session");
  }, []);

  const handleRestart = useCallback(() => {
    setDeck([]);
    setResults([]);
    setScreen("setup");
  }, []);

  if (screen === "session") {
    return (
      <SessionScreen
        deck={deck}
        onComplete={handleComplete}
        onExit={() => setScreen("setup")}
      />
    );
  }

  if (screen === "summary") {
    return (
      <SummaryScreen
        deck={deck}
        results={results}
        onReviewMissed={handleReviewMissed}
        onRestart={handleRestart}
      />
    );
  }

  return <SetupScreen onStart={handleStart} />;
}
