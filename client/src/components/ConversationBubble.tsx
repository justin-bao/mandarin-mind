import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";

interface ConversationBubbleProps {
  text: string;
  pinyin: string;
  translation: string;
  isUser: boolean;
  timestamp: string;
}

export default function ConversationBubble({
  text,
  pinyin,
  translation,
  isUser,
  timestamp
}: ConversationBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    console.log('Playing audio for:', text);
    setIsPlaying(true);
    // Simulate audio playback
    setTimeout(() => setIsPlaying(false), 2000);
  };

  const handleTextTap = () => {
    setShowTranslation(!showTranslation);
    console.log('Translation toggled for:', text);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <Card className={`p-4 ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-12' 
            : 'bg-card text-card-foreground mr-12'
        }`}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div
                onClick={handleTextTap}
                className="cursor-pointer font-chinese text-lg leading-7 hover-elevate rounded p-1"
                data-testid={`text-chinese-${isUser ? 'user' : 'ai'}`}
              >
                {text}
              </div>
              <div className="text-sm opacity-75 mt-1 italic" data-testid={`text-pinyin-${isUser ? 'user' : 'ai'}`}>
                {pinyin}
              </div>
              {showTranslation && (
                <div className="text-sm mt-2 p-2 bg-accent/50 rounded text-accent-foreground" data-testid={`text-translation-${isUser ? 'user' : 'ai'}`}>
                  {translation}
                </div>
              )}
            </div>
            {!isUser && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayAudio}
                disabled={isPlaying}
                className="shrink-0 h-8 w-8"
                data-testid="button-play-audio"
              >
                {isPlaying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </Card>
        <div className="text-xs text-muted-foreground px-2" data-testid={`text-timestamp-${isUser ? 'user' : 'ai'}`}>
          {timestamp}
        </div>
      </div>
    </div>
  );
}