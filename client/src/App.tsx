import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";

import TopicSelector from "@/components/TopicSelector";
import PhraseListsManager from "@/components/PhraseListsManager";
import ConversationInterface from "@/components/ConversationInterface";
import ConversationHistory from "@/components/ConversationHistory";
import NavigationTabs from "@/components/NavigationTabs";
import Settings from "@/components/Settings";
import ThemeToggle from "@/components/ThemeToggle";
import Flashcards from "@/components/Flashcards";
import MediaMode from "@/components/MediaMode";

type AuthUser = { id: string; email: string; createdAt: string | null };

function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: Infinity,
  });
}

function MainApp({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState("conversation");
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationMode, setConversationMode] = useState<"topics" | "practice" | "freeform" | "active">("topics");
  const [practiceWords, setPracticeWords] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const handleTopicSelect = (topic: any) => {
    if (isRecording) return;
    setSelectedTopic(topic);
    setConversationMode("active");
  };

  const handleStartPractice = (words: any[]) => {
    if (isRecording) return;
    setPracticeWords(words);
    setConversationMode("active");
  };

  const handleBack = () => {
    if (isRecording) return;
    setConversationMode("topics");
    setSelectedTopic(null);
    setPracticeWords([]);
  };

  const handleTabChange = (tabId: string) => {
    if (isRecording) return;
    setActiveTab(tabId);
  };

  const renderContent = () => {
    if (activeTab === "conversation") {
      if (conversationMode === "active") {
        return (
          <ConversationInterface
            topic={selectedTopic}
            conversationId={selectedConversationId ?? undefined}
            onBack={() => {
              if (isRecording) return;
              setConversationMode("topics");
              setSelectedTopic(null);
              setPracticeWords([]);
              setSelectedConversationId(null);
            }}
            externalIsRecording={isRecording}
            onRecordingStateChange={setIsRecording}
          />
        );
      }

      return (
        <div className="p-4 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Mandarin Tutor</h1>
            <ThemeToggle />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="cursor-pointer hover-elevate p-6 rounded-lg border bg-card"
              onClick={() => setConversationMode("topics")}
            >
              <h3 className="text-xl font-semibold mb-2">Topic Conversation</h3>
              <p className="text-muted-foreground">Choose from guided conversation topics</p>
            </div>

            <div
              className="cursor-pointer hover-elevate p-6 rounded-lg border bg-card"
              onClick={() => setConversationMode("freeform")}
            >
              <h3 className="text-xl font-semibold mb-2">Free Conversation</h3>
              <p className="text-muted-foreground">Start an open conversation</p>
            </div>
          </div>

          {conversationMode === "topics" && (
            <TopicSelector
              onTopicSelect={handleTopicSelect}
              selectedTopic={selectedTopic}
              isRecordingActive={isRecording}
            />
          )}

          {conversationMode === "freeform" && (
            <ConversationInterface onBack={handleBack} />
          )}
        </div>
      );
    }

    if (activeTab === "practice") {
      return (
        <div className="p-4">
          <PhraseListsManager onStartPractice={handleStartPractice} />
        </div>
      );
    }

    if (activeTab === "flashcards") {
      return (
        <div className="p-4">
          <Flashcards />
        </div>
      );
    }

    if (activeTab === "media") {
      return <MediaMode />;
    }

    if (activeTab === "history") {
      return (
        <div className="p-4">
          <ConversationHistory
            onConversationSelect={(conv) => {
              setSelectedTopic({
                id: conv.topic,
                name: conv.topic,
                nameZh: conv.topicZh,
                difficulty: conv.difficulty,
              });
              setConversationMode("active");
              setActiveTab("conversation");
              setSelectedConversationId(conv.id);
            }}
          />
        </div>
      );
    }

    if (activeTab === "settings") {
      return (
        <div className="p-4">
          <Settings user={user} />
        </div>
      );
    }

    return <NotFound />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-16 overflow-auto">{renderContent()}</main>
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="fixed bottom-0 left-0 right-0 z-50"
      />
    </div>
  );
}

function AppShell() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <MainApp user={user} />;
}

function Router() {
  return (
    <Switch>
      <Route component={AppShell} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
