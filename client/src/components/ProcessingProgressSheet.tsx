import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

export type StepStatus = "pending" | "in-progress" | "done" | "error";

export interface ProcessingStep {
  key: string;
  label: string;
  status: StepStatus;
}

interface Props {
  open: boolean;
  title: string;
  steps: ProcessingStep[];
  errorMessage?: string;
}

function stepIcon(status: StepStatus) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
  if (status === "in-progress") return <Loader2 className="h-5 w-5 text-primary flex-shrink-0 animate-spin" />;
  if (status === "error") return <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />;
  return <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />;
}

function computeProgress(steps: ProcessingStep[]): number {
  const total = steps.length;
  if (total === 0) return 0;
  const done = steps.filter((s) => s.status === "done").length;
  const inProgress = steps.some((s) => s.status === "in-progress") ? 0.5 : 0;
  return Math.round(((done + inProgress) / total) * 100);
}

export default function ProcessingProgressSheet({ open, title, steps, errorMessage }: Props) {
  const progress = computeProgress(steps);
  const hasError = !!errorMessage;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Progress value={hasError ? progress : progress} className={hasError ? "bg-destructive/20" : undefined} />

          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.key} className="flex items-center gap-3">
                {stepIcon(step.status)}
                <span
                  className={
                    step.status === "done"
                      ? "text-sm text-foreground"
                      : step.status === "in-progress"
                      ? "text-sm text-foreground font-medium"
                      : step.status === "error"
                      ? "text-sm text-destructive"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {hasError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {errorMessage}
            </p>
          )}

          {!hasError && steps.every((s) => s.status === "done") && (
            <p className="text-sm text-muted-foreground text-center">Opening viewer…</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
