import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Constraint } from "@/types";

export function useConstraints() {
  return useQuery<Constraint[]>({
    queryKey: ["/api/constraints"],
  });
}

export function useConstraint(id: string) {
  return useQuery<Constraint>({
    queryKey: ["/api/constraints", id],
    enabled: !!id,
  });
}

export function useUpdateConstraint() {
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Constraint> }) => {
      const res = await apiRequest("PUT", `/api/constraints/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constraints"] });
    },
  });
}
