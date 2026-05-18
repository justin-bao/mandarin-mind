import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./src/lib/supabase";
import { apiRequest } from "./src/lib/api";
import type { AuthUser } from "./src/types";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ConversationScreen } from "./src/screens/ConversationScreen";
import { FlashcardsScreen } from "./src/screens/FlashcardsScreen";
import { PhrasesScreen } from "./src/screens/PhrasesScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { GrammarScreen } from "./src/screens/GrammarScreen";
import { MediaScreen } from "./src/screens/MediaScreen";
import { BrandMark } from "./src/components/ui";
import { colors, styles } from "./src/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    }
  }
});

type Tab = "conversation" | "phrases" | "grammar" | "flashcards" | "media" | "settings";

function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        return await apiRequest<AuthUser>("GET", "/api/auth/me");
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("401:")) return null;
        throw error;
      }
    }
  });
}

function TabButton({ tab, active, icon, label, onPress }: { tab: Tab; active: Tab; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: (tab: Tab) => void }) {
  const selected = tab === active;
  return (
    <Text
      accessibilityRole="button"
      onPress={() => onPress(tab)}
      style={{
        flex: 1,
        textAlign: "center",
        color: selected ? colors.primary : colors.mutedForeground,
        fontSize: 11,
        fontWeight: selected ? "800" : "600",
        paddingVertical: 6
      }}
    >
      <Ionicons name={icon} size={22} color={selected ? colors.primary : colors.mutedForeground} />{"\n"}
      {label}
    </Text>
  );
}

function MainApp({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState<Tab>("conversation");

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={[styles.row, { gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border }]}>
        <BrandMark size={34} />
        <Text style={{ flex: 1, color: colors.foreground, fontSize: 18, fontWeight: "800" }}>MandarinMind</Text>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "conversation" ? <ConversationScreen /> : null}
        {activeTab === "phrases" ? <PhrasesScreen userId={user.id} /> : null}
        {activeTab === "grammar" ? <GrammarScreen /> : null}
        {activeTab === "flashcards" ? <FlashcardsScreen userId={user.id} /> : null}
        {activeTab === "media" ? <MediaScreen userId={user.id} /> : null}
        {activeTab === "settings" ? <SettingsScreen user={user} /> : null}
      </View>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: "row", paddingHorizontal: 8 }}>
          <TabButton tab="conversation" active={activeTab} icon="chatbubble-ellipses-outline" label="Talk" onPress={setActiveTab} />
          <TabButton tab="phrases" active={activeTab} icon="library-outline" label="Phrases" onPress={setActiveTab} />
          <TabButton tab="grammar" active={activeTab} icon="checkmark-circle-outline" label="Grammar" onPress={setActiveTab} />
          <TabButton tab="flashcards" active={activeTab} icon="albums-outline" label="Cards" onPress={setActiveTab} />
          <TabButton tab="media" active={activeTab} icon="film-outline" label="Media" onPress={setActiveTab} />
          <TabButton tab="settings" active={activeTab} icon="settings-outline" label="Settings" onPress={setActiveTab} />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function AppContent() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useCurrentUser();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.screen, styles.page, { justifyContent: "center" }]}>
        <Text style={styles.h2}>Could not reach MandarinMind</Text>
        <Text style={styles.muted}>{error instanceof Error ? error.message : "Check the API URL and try again."}</Text>
      </SafeAreaView>
    );
  }

  if (!user) return <AuthScreen />;
  return <MainApp user={user} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
