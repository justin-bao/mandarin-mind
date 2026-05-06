import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type AiUsageSummary = {
  budgetUsdMicros: number;
  spentUsdMicros: number;
  remainingUsdMicros: number;
};

export function useAiUsage() {
  const queryClient = useQueryClient();
  const query = useQuery<AiUsageSummary>({
    queryKey: ["/api/usage/ai"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/usage/ai");
      return await res.json();
    },
  });

  return {
    ...query,
    isOutOfCredits: (query.data?.remainingUsdMicros ?? 1) <= 0,
    refreshAiUsage: () => queryClient.invalidateQueries({ queryKey: ["/api/usage/ai"] }),
  };
}
