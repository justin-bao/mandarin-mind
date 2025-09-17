import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Import components
import TopicSelector from "@/components/TopicSelector";
import WordPractice from "@/components/WordPractice";
import ConversationInterface from "@/components/ConversationInterface";
import ConversationHistory from "@/components/ConversationHistory";
import NavigationTabs from "@/components/NavigationTabs";
import Settings from "@/components/Settings";
import ThemeToggle from "@/components/ThemeToggle";

function Router() {
  return (
    <Switch>
      {/* Fallback to main app */}
      <Route component={MainApp} />
    </Switch>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('conversation');
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [conversationMode, setConversationMode] = useState<'topics' | 'practice' | 'freeform' | 'active'>('topics');
  const [practiceWords, setPracticeWords] = useState<any[]>([]);

  const handleTopicSelect = (topic: any) => {
    setSelectedTopic(topic);
    setConversationMode('active');
  };

  const handleStartPractice = (words: any[]) => {
    setPracticeWords(words);
    setConversationMode('active');
  };

  const handleBack = () => {
    setConversationMode('topics');
    setSelectedTopic(null);
    setPracticeWords([]);
  };

  const renderContent = () => {
    if (activeTab === 'conversation') {
      if (conversationMode === 'active') {
        return (
          <ConversationInterface
            topic={selectedTopic}
            onBack={handleBack}
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
              onClick={() => setConversationMode('topics')}
            >
              <h3 className="text-xl font-semibold mb-2">Topic Conversation</h3>
              <p className="text-muted-foreground">Choose from guided conversation topics</p>
            </div>
            
            <div 
              className="cursor-pointer hover-elevate p-6 rounded-lg border bg-card"
              onClick={() => setConversationMode('freeform')}
            >
              <h3 className="text-xl font-semibold mb-2">Free Conversation</h3>
              <p className="text-muted-foreground">Start an open conversation</p>
            </div>
          </div>
          
          {conversationMode === 'topics' && (
            <TopicSelector 
              onTopicSelect={handleTopicSelect}
              selectedTopic={selectedTopic}
            />
          )}
          
          {conversationMode === 'freeform' && (
            <ConversationInterface onBack={handleBack} />
          )}
        </div>
      );
    }

    if (activeTab === 'practice') {
      return (
        <div className="p-4">
          <WordPractice onStartPractice={handleStartPractice} />
        </div>
      );
    }

    if (activeTab === 'history') {
      return (
        <div className="p-4">
          <ConversationHistory onConversationSelect={(conv) => {
            console.log('Continue conversation:', conv);
          }} />
        </div>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div className="p-4">
          <Settings />
        </div>
      );
    }

    return <NotFound />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-16 overflow-auto">
        {renderContent()}
      </main>
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="fixed bottom-0 left-0 right-0 z-50"
      />
    </div>
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
