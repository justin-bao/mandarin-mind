import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import { AppSidebar } from "@/components/AppSidebar";

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

const sidebarStyle = {
  "--sidebar-width": "13rem",
  "--sidebar-width-icon": "3.5rem",
};

function MainApp({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState("conversation");
  const [conversationSubTab, setConversationSubTab] = useState<"conversation" | "history">("conversation");
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

  const handleConversationSelect = (conv: any) => {
    setSelectedTopic({
      id: conv.topic,
      name: conv.topic,
      nameZh: conv.topicZh,
      difficulty: conv.difficulty,
    });
    setConversationMode("active");
    setConversationSubTab("conversation");
    setSelectedConversationId(conv.id);
  };

  const renderContent = () => {
    if (activeTab === "conversation") {
      // When a conversation is active, show it full-screen (no sub-tabs)
      if (conversationMode === "active") {
        return (
          <div className="h-full">
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
          </div>
        );
      }

      // topics / freeform landing with History sub-tab
      return (
        <div className="flex flex-col h-full">
          {/* Sub-tabs */}
          <div className="flex border-b border-border bg-card">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                conversationSubTab === "conversation"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
              onClick={() => setConversationSubTab("conversation")}
              data-testid="subtab-conversation"
            >
              Conversation
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                conversationSubTab === "history"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
              onClick={() => setConversationSubTab("history")}
              data-testid="subtab-history"
            >
              History
            </button>
          </div>

          {conversationSubTab === "history" ? (
            <div className="flex-1 overflow-auto p-4">
              <ConversationHistory onConversationSelect={handleConversationSelect} />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 space-y-6 max-w-5xl mx-auto w-full">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">MandarinMind</h1>
                <ThemeToggle />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  className="cursor-pointer hover-elevate p-6 rounded-lg border bg-card"
                  onClick={() => setConversationMode("topics")}
                  data-testid="button-mode-topics"
                >
                  <h3 className="text-xl font-semibold mb-2">Topic Conversation</h3>
                  <p className="text-muted-foreground">Choose from guided conversation topics</p>
                </div>

                <div
                  className="cursor-pointer hover-elevate p-6 rounded-lg border bg-card"
                  onClick={() => setConversationMode("freeform")}
                  data-testid="button-free-conversation"
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
          )}
        </div>
      );
    }

    if (activeTab === "practice") {
      return (
        <div className="p-4 max-w-5xl mx-auto">
          <PhraseListsManager onStartPractice={handleStartPractice} />
        </div>
      );
    }

    if (activeTab === "flashcards") {
      return (
        <div className="p-4 max-w-5xl mx-auto">
          <Flashcards />
        </div>
      );
    }

    if (activeTab === "media") {
      return (
        <div className="h-full">
          <MediaMode />
        </div>
      );
    }

    if (activeTab === "settings") {
      return (
        <div className="p-4 max-w-5xl mx-auto">
          <Settings user={user} />
        </div>
      );
    }

    return <NotFound />;
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties} defaultOpen>
      <div className="flex h-screen w-full">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            {renderContent()}
          </main>
          <NavigationTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          />
        </div>
      </div>
    </SidebarProvider>
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
