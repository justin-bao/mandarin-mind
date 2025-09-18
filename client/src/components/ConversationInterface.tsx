import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationBubble from "./ConversationBubble";
import VoiceRecorder from "./VoiceRecorder";
import { Loader2, ArrowLeft, Settings2 } from "lucide-react";
import { conversationApi } from "@/lib/api";

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
  externalIsRecording?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export default function ConversationInterface({ 
  topic, 
  onBack,
  externalIsRecording = false,
  onRecordingStateChange
}: ConversationInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Create conversation when component mounts
  const createConversationMutation = useMutation({
    mutationFn: () => conversationApi.create({
      topic: topic?.name,
      topicZh: topic?.nameZh,
      difficulty: topic?.difficulty || 'Beginner'
    }),
    onSuccess: (data: any) => {
      setConversationId(data.id);
    }
  });

  // Get messages for the conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationApi.getMessages(conversationId!),
    enabled: !!conversationId,
  });

  // Send audio mutation
  const sendAudioMutation = useMutation({
    mutationFn: (audioBlob: Blob) => conversationApi.sendAudio(conversationId!, audioBlob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setShowVoiceRecorder(false);
    },
  });

  // Initialize conversation on mount
  useEffect(() => {
    if (!conversationId && !createConversationMutation.isPending) {
      createConversationMutation.mutate();
    }
  }, []);

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
    if (!conversationId) return;
    onRecordingStateChange?.(false);
    sendAudioMutation.mutate(audioBlob);
  };

  const handleRecordingStart = () => {
    console.log('handleRecordingStart called - setting external isRecording to true');
    onRecordingStateChange?.(true);
  };

  const handleRecordingStop = () => {
    console.log('handleRecordingStop called - setting external isRecording to false');
    onRecordingStateChange?.(false);
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
          {messages.map((message: any) => (
            <ConversationBubble
              key={message.id}
              text={message.text}
              pinyin={message.pinyin || ''}
              translation={message.translation || ''}
              isUser={message.isUser === 1}
              timestamp={new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
          ))}
          
          {(messagesLoading || sendAudioMutation.isPending) && (
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
            <VoiceRecorder 
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={handleRecordingStart}
              onRecordingStop={handleRecordingStop}
              externalIsRecording={externalIsRecording}
            />
            <Button
              variant="outline"
              onClick={() => {
                setShowVoiceRecorder(false);
                onRecordingStateChange?.(false);
              }}
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
            disabled={sendAudioMutation.isPending || !conversationId}
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