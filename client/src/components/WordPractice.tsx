import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  X, 
  Play,
  Volume2,
  BookOpen
} from "lucide-react";

interface WordEntry {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
}

interface WordPracticeProps {
  onStartPractice?: (words: WordEntry[]) => void;
}

export default function WordPractice({ onStartPractice }: WordPracticeProps) {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [newWord, setNewWord] = useState({
    chinese: '',
    pinyin: '',
    english: ''
  });

  // Todo: Remove mock suggestions
  const commonWords: WordEntry[] = [
    { id: 'w1', chinese: '你好', pinyin: 'nǐ hǎo', english: 'hello' },
    { id: 'w2', chinese: '谢谢', pinyin: 'xiè xiè', english: 'thank you' },
    { id: 'w3', chinese: '再见', pinyin: 'zài jiàn', english: 'goodbye' },
    { id: 'w4', chinese: '对不起', pinyin: 'duì bu qǐ', english: 'sorry' },
    { id: 'w5', chinese: '请问', pinyin: 'qǐng wèn', english: 'excuse me' },
    { id: 'w6', chinese: '多少钱', pinyin: 'duō shǎo qián', english: 'how much' }
  ];

  const addWord = () => {
    if (newWord.chinese && newWord.english) {
      const word: WordEntry = {
        id: Date.now().toString(),
        chinese: newWord.chinese,
        pinyin: newWord.pinyin || 'Add pinyin',
        english: newWord.english
      };
      setWords([...words, word]);
      setNewWord({ chinese: '', pinyin: '', english: '' });
      console.log('Word added:', word);
    }
  };

  const removeWord = (id: string) => {
    setWords(words.filter(w => w.id !== id));
    console.log('Word removed:', id);
  };

  const addSuggestion = (word: WordEntry) => {
    if (!words.find(w => w.chinese === word.chinese)) {
      setWords([...words, { ...word, id: Date.now().toString() }]);
      console.log('Suggestion added:', word);
    }
  };

  const playPronunciation = (word: WordEntry) => {
    console.log('Playing pronunciation for:', word.chinese);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Word Practice</h2>
        <p className="text-muted-foreground">Add words and phrases you want to practice</p>
      </div>

      {/* Add New Word */}
      <Card className="p-4">
        <Label className="text-base font-medium mb-4 block">Add New Word/Phrase</Label>
        <div className="space-y-3">
          <div>
            <Label htmlFor="chinese" className="text-sm">Chinese Characters</Label>
            <Input
              id="chinese"
              placeholder="你好"
              value={newWord.chinese}
              onChange={(e) => setNewWord({ ...newWord, chinese: e.target.value })}
              className="font-chinese text-lg"
              data-testid="input-chinese"
            />
          </div>
          <div>
            <Label htmlFor="pinyin" className="text-sm">Pinyin (Optional)</Label>
            <Input
              id="pinyin"
              placeholder="nǐ hǎo"
              value={newWord.pinyin}
              onChange={(e) => setNewWord({ ...newWord, pinyin: e.target.value })}
              className="italic"
              data-testid="input-pinyin"
            />
          </div>
          <div>
            <Label htmlFor="english" className="text-sm">English Translation</Label>
            <Input
              id="english"
              placeholder="hello"
              value={newWord.english}
              onChange={(e) => setNewWord({ ...newWord, english: e.target.value })}
              data-testid="input-english"
            />
          </div>
          <Button 
            onClick={addWord} 
            disabled={!newWord.chinese || !newWord.english}
            data-testid="button-add-word"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Word
          </Button>
        </div>
      </Card>

      {/* Common Suggestions */}
      <Card className="p-4">
        <Label className="text-base font-medium mb-4 block flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Common Words & Phrases
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commonWords.map((word) => (
            <div
              key={word.id}
              className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-chinese text-lg">{word.chinese}</div>
                <div className="text-sm text-muted-foreground italic">{word.pinyin}</div>
                <div className="text-sm">{word.english}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSuggestion(word)}
                disabled={words.find(w => w.chinese === word.chinese) !== undefined}
                data-testid={`button-add-suggestion-${word.id}`}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected Words */}
      {words.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-medium">Your Practice List</Label>
            <Badge variant="secondary">{words.length} words</Badge>
          </div>
          <div className="space-y-3 mb-4">
            {words.map((word) => (
              <div
                key={word.id}
                className="flex items-center justify-between p-3 bg-card border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-chinese text-lg">{word.chinese}</div>
                  <div className="text-sm text-muted-foreground italic">{word.pinyin}</div>
                  <div className="text-sm">{word.english}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => playPronunciation(word)}
                    data-testid={`button-play-${word.id}`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWord(word.id)}
                    data-testid={`button-remove-${word.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button 
            size="lg" 
            className="w-full"
            onClick={() => {
              onStartPractice?.(words);
              console.log('Starting practice with words:', words);
            }}
            data-testid="button-start-practice"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Practice Session
          </Button>
        </Card>
      )}
    </div>
  );
}