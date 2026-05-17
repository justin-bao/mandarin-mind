import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { grammarApi } from "../lib/api";
import type { KeyboardTextIssue } from "../types";
import { Badge, Button, Card, Field, EmptyState } from "../components/ui";
import { colors, styles } from "../theme";

function issueTone(severity: KeyboardTextIssue["severity"]) {
  if (severity === "important") return "danger";
  if (severity === "suggestion") return "warning";
  return "neutral";
}

function toneLabel(label: string) {
  return label.replace(/-/g, " ");
}

export function GrammarScreen() {
  const [text, setText] = useState("");
  const analysis = useMutation({
    mutationFn: () => grammarApi.analyze(text.trim()),
    onError: (error) => Alert.alert("Grammar check failed", error instanceof Error ? error.message : "Please try again.")
  });

  const result = analysis.data;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View>
        <Text style={styles.title}>Grammar</Text>
        <Text style={styles.muted}>Check Chinese characters, grammar, and how natural the wording sounds.</Text>
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.h3}>Draft</Text>
        <Field
          value={text}
          onChangeText={setText}
          placeholder="Type Chinese or mixed pinyin here..."
          multiline
          textAlignVertical="top"
          style={{ minHeight: 140, paddingTop: 12 }}
        />
        <Button loading={analysis.isPending} disabled={!text.trim()} onPress={() => analysis.mutate()}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
          <Text style={{ color: colors.white, fontWeight: "700" }}>Analyze Grammar</Text>
        </Button>
      </Card>

      {!result ? (
        <EmptyState title="No analysis yet" body="Submit a sentence to see corrections, grammar notes, and tone feedback." />
      ) : (
        <>
          <Card style={{ gap: 8 }}>
            <Text style={styles.h3}>Suggested Revision</Text>
            <Text style={{ color: colors.foreground, fontSize: 24, lineHeight: 32, fontWeight: "700" }}>{result.correctedText}</Text>
            {result.pinyin ? <Text style={[styles.body, { color: colors.primary, fontStyle: "italic" }]}>{result.pinyin}</Text> : null}
            {result.translation ? <Text style={styles.muted}>{result.translation}</Text> : null}
          </Card>

          <Card style={{ gap: 8 }}>
            <View style={[styles.row, { justifyContent: "space-between", gap: 12 }]}>
              <Text style={styles.h3}>Tone</Text>
              <Badge tone="primary">{result.tone.authenticityScore}/100</Badge>
            </View>
            <Text style={styles.body}>{toneLabel(result.tone.label)}</Text>
            <Text style={styles.muted}>{result.tone.summary}</Text>
          </Card>

          <View style={{ gap: 10 }}>
            <Text style={styles.h2}>Issues</Text>
            {result.issues.length === 0 ? (
              <EmptyState title="No issues found" body="The sentence looks natural based on the current analysis." />
            ) : (
              result.issues.map((issue, index) => (
                <Card key={`${issue.type}-${issue.rangeText}-${index}`} style={{ gap: 7 }}>
                  <View style={[styles.row, { justifyContent: "space-between", gap: 10 }]}>
                    <Text style={styles.h3}>{issue.rangeText || issue.type}</Text>
                    <Badge tone={issueTone(issue.severity)}>{issue.type}</Badge>
                  </View>
                  <Text style={styles.body}>{issue.message}</Text>
                  {issue.replacement ? <Text style={[styles.body, { color: colors.primary }]}>Use: {issue.replacement}</Text> : null}
                </Card>
              ))
            )}
          </View>

          {result.suggestions.length > 0 ? (
            <Card style={{ gap: 8 }}>
              <Text style={styles.h3}>Alternatives</Text>
              {result.suggestions.map((suggestion) => (
                <Text key={suggestion} style={styles.body}>- {suggestion}</Text>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
