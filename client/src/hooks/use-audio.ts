import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/audio";

export type AudioUploadStatus = "uploading" | "transcribing" | "generating_mindmap" | "ready" | "failed";

export interface AudioUploadListItem {
  id: number;
  filename: string;
  status: AudioUploadStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface AudioUploadDetail {
  id: number;
  filename: string;
  transcript: string | null;
  mindmapData: Record<string, any> | null;
  status: AudioUploadStatus;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export function useAudioUploads(limit = 20) {
  return useQuery<AudioUploadListItem[]>({
    queryKey: ["audio-uploads", limit],
    queryFn: async () => {
      const res = await fetch(`/api/audio/list?limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch audio uploads");
      return res.json();
    },
  });
}

export function useAudioUpload(id: number | null) {
  return useQuery<AudioUploadDetail>({
    queryKey: ["audio-upload", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch audio upload");
      return res.json();
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 3 seconds while processing
      if (data && (data.status === "uploading" || data.status === "transcribing" || data.status === "generating_mindmap")) {
        return 3000;
      }
      return false;
    },
  });
}

export function useUploadAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload audio");
      }
      return res.json() as Promise<{ id: number; status: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-uploads"] });
    },
  });
}

export function useDeleteAudioUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete audio upload");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-uploads"] });
    },
  });
}
