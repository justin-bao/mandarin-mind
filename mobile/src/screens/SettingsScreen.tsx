import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { apiRequest, API_BASE_URL } from "../lib/api";
import type { AuthUser } from "../types";
import { Button, Card } from "../components/ui";
import { styles } from "../theme";

function formatUsd(micros?: number) {
  return `$${((micros ?? 0) / 1_000_000).toFixed(2)}`;
}

export function SettingsScreen({ user }: { user: AuthUser }) {
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const usage = useQuery({
    queryKey: ["mobile", "usage", "ai"],
    queryFn: () => apiRequest<{ budgetUsdMicros?: number; spentUsdMicros?: number }>("GET", "/api/usage/ai")
  });

  async function signOut() {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        Alert.alert("Sign out failed", error.message);
        return;
      }
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.removeQueries({
        predicate: (query) => JSON.stringify(query.queryKey) !== JSON.stringify(["/api/auth/me"])
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <View style={[styles.screen, styles.page]}>
      <View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.muted}>Account and backend connection</Text>
      </View>

      <Card style={{ gap: 8 }}>
        <Text style={styles.h3}>{user.email}</Text>
        <Text style={styles.muted}>User ID: {user.id}</Text>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={styles.h3}>AI Usage</Text>
        <Text style={styles.body}>
          {formatUsd(usage.data?.spentUsdMicros ?? user.aiUsageSpentUsdMicros)} spent of {formatUsd(usage.data?.budgetUsdMicros ?? user.aiUsageBudgetUsdMicros)}
        </Text>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={styles.h3}>API</Text>
        <Text style={styles.muted}>{API_BASE_URL}</Text>
      </Card>

      <Button variant="danger" loading={isSigningOut} onPress={signOut}>Sign Out</Button>
    </View>
  );
}
