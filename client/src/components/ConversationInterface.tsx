import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationBubble from "./ConversationBubble";
import VoiceRecorder from "./VoiceRecorder";
import { Loader2, ArrowLeft, Settings2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  pinyin: string;
  translation: string;
  isUser: boolean;
  timestamp: string;
}

interface ConversationInterfaceProps {
  topic?: any;
  onBack?: () => void;
}

export default function ConversationInterface({ topic, onBack }: ConversationInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Todo: Remove mock initial message
  useEffect(() => {
    if (topic) {
      const welcomeMessage: Message = {
        id: '1',
        text: `你好！我们来聊聊${topic.nameZh}吧。`,
        pinyin: `Nǐ hǎo! Wǒmen lái liáo liáo ${topic.name} ba.`,
        translation: `Hello! Let's talk about ${topic.name}.`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([welcomeMessage]);
    } else {
      const freeFormMessage: Message = {
        id: '1',
        text: '你好！你想聊什么呢？',
        pinyin: 'Nǐ hǎo! Nǐ xiǎng liáo shén me ne?',
        translation: 'Hello! What would you like to talk about?',
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([freeFormMessage]);
    }
  }, [topic]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleRecordingComplete = (audioBlob: Blob) => {
    console.log('Audio recorded:', audioBlob);
    setIsLoading(true);
    setShowVoiceRecorder(false);

    // Todo: Replace with actual speech-to-text processing
    setTimeout(() => {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: '我很好，谢谢！',
        pinyin: 'Wǒ hěn hǎo, xiè xiè!',
        translation: 'I\'m doing well, thank you!',
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, userMessage]);

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: '很棒！你最近在做什么有趣的事情吗？',
          pinyin: 'Hěn bàng! Nǐ zuì jìn zài zuò shén me yǒu qù de shì qíng ma?',
          translation: 'Great! Have you been doing anything interesting lately?',
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Card className="p-4 rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="font-semibold">
                {topic ? topic.name : 'Free Conversation'}
              </h2>
              {topic && (
                <p className="text-sm text-muted-foreground font-chinese">
                  {topic.nameZh}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => console.log('Settings opened')}
            data-testid="button-conversation-settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ConversationBubble
              key={message.id}
              text={message.text}
              pinyin={message.pinyin}
              translation={message.translation}
              isUser={message.isUser}
              timestamp={message.timestamp}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Voice Input */}
      <Card className="p-4 rounded-none border-x-0 border-b-0">
        {showVoiceRecorder ? (
          <div className="space-y-4">
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            <Button
              variant="outline"
              onClick={() => setShowVoiceRecorder(false)}
              className="w-full"
              data-testid="button-cancel-recording"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            onClick={() => setShowVoiceRecorder(true)}
            disabled={isLoading}
            className="w-full"
            data-testid="button-start-recording"
          >
            Start Speaking
          </Button>
        )}
      </Card>
    </div>
  );
}