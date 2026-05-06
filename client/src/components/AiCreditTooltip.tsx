import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const OUT_OF_CREDITS_MESSAGE = "You're out of Credits. Add credits to use this AI feature.";

type AiCreditTooltipProps = {
  disabled: boolean;
  children: ReactElement;
  className?: string;
};

export default function AiCreditTooltip({ disabled, children, className }: AiCreditTooltipProps) {
  if (!disabled) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex cursor-not-allowed", className)}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{OUT_OF_CREDITS_MESSAGE}</TooltipContent>
    </Tooltip>
  );
}
