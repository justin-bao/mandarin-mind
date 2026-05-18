import { useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { colors, styles } from "../theme";
import { BrandMark, Button, Card, Field } from "../components/ui";

export function AuthScreen() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (mode === "register" && password !== confirm) {
      Alert.alert("Passwords do not match");
      return;
    }

    setLoading(true);
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });

    if (result.error) {
      setLoading(false);
      Alert.alert(mode === "login" ? "Login failed" : "Registration failed", result.error.message);
      return;
    }

    if (mode === "register" && !result.data.session) {
      setLoading(false);
      Alert.alert("Check your email", "Confirm your account, then sign in.");
    }

    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }]}>
        <BrandMark size={56} />
        <ActivityIndicator color={colors.primary} />
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={styles.h2}>{mode === "login" ? "Signing in" : "Creating account"}</Text>
          <Text style={[styles.muted, { textAlign: "center" }]}>Connecting to your MandarinMind account...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.page, { flexGrow: 1, justifyContent: "center", paddingTop: 40, paddingBottom: 40 }]}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
    >
      <View style={{ gap: 10, alignItems: "center", marginBottom: 12 }}>
        <BrandMark size={48} />
        <Text style={styles.title}>MandarinMind</Text>
        <Text style={[styles.muted, { textAlign: "center", maxWidth: 310 }]}>
          Voice-first Mandarin practice, phrase study, and flashcards in your pocket.
        </Text>
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button variant={mode === "login" ? "primary" : "secondary"} style={{ flex: 1 }} onPress={() => setMode("login")}>
            Sign In
          </Button>
          <Button variant={mode === "register" ? "primary" : "secondary"} style={{ flex: 1 }} onPress={() => setMode("register")}>
            Create
          </Button>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.muted}>Email</Text>
          <Field value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.muted}>Password</Text>
          <Field value={password} onChangeText={setPassword} secureTextEntry placeholder={mode === "login" ? "Password" : "Min. 8 characters"} />
        </View>
        {mode === "register" ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.muted}>Confirm Password</Text>
            <Field value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" />
          </View>
        ) : null}

        <Button loading={loading} onPress={submit}>
          {mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </Card>

      <View style={{ flexDirection: "row", gap: 12, justifyContent: "center", marginTop: 8 }}>
        {["chatbubble-ellipses-outline", "mic-outline", "albums-outline", "film-outline"].map((icon) => (
          <View key={icon} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={icon as never} size={20} color={colors.primary} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
