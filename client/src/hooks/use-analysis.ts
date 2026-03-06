import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { WorkflowAnalysis, AnalysisResult } from "@shared/schema";

type AnalysisList = WorkflowAnalysis[];
type AnalysisDetail = WorkflowAnalysis & { results: AnalysisResult[] };

export function useAnalyses() {
  return useQuery<AnalysisList>({
    queryKey: [api.analysis.list.path],
    queryFn: async () => {
      const res = await fetch(api.analysis.list.path);
      if (!res.ok) throw new Error("Failed to fetch analyses");
      return res.json();
    },
  });
}

export function useAnalysis(id: number | null) {
  return useQuery<AnalysisDetail>({
    queryKey: [api.analysis.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.analysis.get.path, { id: id! });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch analysis");
      return res.json();
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.status === "processing") return 3000;
      return false;
    },
  });
}

export function useUploadAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(api.analysis.upload.path, {
        method: api.analysis.upload.method,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload CSV");
      }
      return res.json() as Promise<WorkflowAnalysis>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.analysis.list.path] });
    },
  });
}
