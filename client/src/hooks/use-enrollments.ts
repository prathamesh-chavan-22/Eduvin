import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Enrollment = z.infer<typeof api.enrollments.list.responses[200]>[0];
type InsertEnrollment = z.infer<typeof api.enrollments.create.input>;
type UpdateProgress = z.infer<typeof api.enrollments.updateProgress.input>;

export function useEnrollments() {
  return useQuery<Enrollment[]>({
    queryKey: [api.enrollments.list.path],
    queryFn: async () => {
      const res = await fetch(api.enrollments.list.path);
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return res.json();
    },
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertEnrollment) => {
      const res = await fetch(api.enrollments.create.path, {
        method: api.enrollments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to enroll user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.enrollments.list.path] });
    },
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateProgress }) => {
      const url = buildUrl(api.enrollments.updateProgress.path, { id });
      const res = await fetch(url, {
        method: api.enrollments.updateProgress.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update progress");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.enrollments.list.path] });
    },
  });
}
