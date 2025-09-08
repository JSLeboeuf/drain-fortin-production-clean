import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings } from "@/types";

export function useSettings() {
  return useQuery<Settings[]>({
    queryKey: ["/api/settings"],
  });
}

export function useSetting(key: string) {
  return useQuery<Settings>({
    queryKey: ["/api/settings", key],
    enabled: !!key,
  });
}

export function useUpdateSetting() {
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const res = await apiRequest("PUT", `/api/settings/${key}`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
}
