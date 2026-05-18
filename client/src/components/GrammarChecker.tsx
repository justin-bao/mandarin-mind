import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { grammarApi, type KeyboardTextIssue } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

function issueVariant(severity: KeyboardTextIssue["severity"]) {
  if (severity === "important") return "destructive";
  return "secondary";
}

function formatTone(label: string) {
  return label.replace(/-/g, " ");
}

export default function GrammarChecker() {
  const { toast } = useToast();
  const [text, setText] = useState("");

  const analysis = useMutation({
    mutationFn: () => grammarApi.analyze(text.trim()),
    onError: (error: Error) => {
      toast({
        title: "Grammar check failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const result = analysis.data;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold">Grammar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check characters, grammar, and how natural the wording sounds.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="text-lg font-semibold">Draft</h2>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type Chinese or mixed pinyin here..."
          className="min-h-36 resize-y text-base"
          data-testid="textarea-grammar-input"
        />
        <Button
          onClick={() => analysis.mutate()}
          disabled={!text.trim() || analysis.isPending}
          data-testid="button-analyze-grammar"
        >
          {analysis.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Analyze Grammar
        </Button>
      </Card>

      {!result ? (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            Submit a sentence to see corrections, issue-level feedback, and tone analysis.
          </p>
        </Card>
      ) : (
        <>
          <Card className="space-y-2 p-4">
            <h2 className="text-lg font-semibold">Suggested Revision</h2>
            <div className="font-chinese text-3xl font-semibold leading-tight">{result.correctedText}</div>
            {result.pinyin ? <p className="text-primary italic">{result.pinyin}</p> : null}
            {result.translation ? <p className="text-sm text-muted-foreground">{result.translation}</p> : null}
          </Card>

          <Card className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Tone</h2>
              <Badge>{result.tone.authenticityScore}/100</Badge>
            </div>
            <p className="capitalize">{formatTone(result.tone.label)}</p>
            <p className="text-sm text-muted-foreground">{result.tone.summary}</p>
          </Card>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">Issues</h2>
            {result.issues.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  No issues found in the current analysis.
                </p>
              </Card>
            ) : (
              result.issues.map((issue, index) => (
                <Card key={`${issue.type}-${issue.rangeText}-${index}`} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{issue.rangeText || issue.type}</h3>
                    <Badge variant={issueVariant(issue.severity)}>{issue.type}</Badge>
                  </div>
                  <p>{issue.message}</p>
                  {issue.replacement ? (
                    <p className="text-sm text-primary">Use: {issue.replacement}</p>
                  ) : null}
                </Card>
              ))
            )}
          </section>

          {result.suggestions.length > 0 ? (
            <Card className="space-y-2 p-4">
              <h2 className="text-lg font-semibold">Alternatives</h2>
              <ul className="list-disc space-y-1 pl-5">
                {result.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
