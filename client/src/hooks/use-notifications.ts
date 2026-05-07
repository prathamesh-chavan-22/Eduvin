import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Notification = z.infer<typeof api.notifications.list.responses[200]>[0];

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: [api.notifications.list.path],
    queryFn: async () => apiFetch<Notification[]>(api.notifications.list.path),
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.notifications.markRead.path, { id });
      return apiFetch<Notification>(url, {
        method: api.notifications.markRead.method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
  });
}
