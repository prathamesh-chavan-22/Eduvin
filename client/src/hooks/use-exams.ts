import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

export interface ExamQuestion {
  type: "essay" | "short" | "long" | "definition";
  question: string;
  marks: number;
  rubric: string;
}

export interface ExamPaper {
  id: number;
  courseId: number;
  questions: ExamQuestion[];
  totalMarks: number;
  createdAt: string;
}

export interface ExamAttempt {
  id: number;
  userId: number;
  score: number | null;
  totalMarks: number | null;
  summary?: string | null;
  evaluationText: string | null;
  imageUrls: string[];
  submittedAt: string;
}

export interface ExamResults {
  paperId: number;
  attempts: ExamAttempt[];
}

export function useExamPaper(courseId: number) {
  return useQuery<ExamPaper | null>({
    queryKey: ["exam-paper", courseId],
    queryFn: async () => {
      try {
        return await apiFetch<ExamPaper>(`/api/exam-papers/by-course/${courseId}`);
      } catch {
        return null;
      }
    },
    enabled: !!courseId,
  });
}

export function useExamPaperById(paperId: number) {
  return useQuery<ExamPaper>({
    queryKey: ["exam-paper-by-id", paperId],
    queryFn: () => apiFetch<ExamPaper>(`/api/exam-papers/${paperId}`),
    enabled: !!paperId,
  });
}

export function useGenerateExamPaper(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation<ExamPaper, Error>({
    mutationFn: () => apiFetch<ExamPaper>(`/api/exam-papers/generate/${courseId}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-paper", courseId] });
    },
  });
}

export function useUploadExamAttempt(paperId: number) {
  const queryClient = useQueryClient();
  return useMutation<ExamAttempt, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      const res = await fetch(`/api/exam-papers/${paperId}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-results", paperId] });
    },
  });
}

export function useExamResults(paperId: number) {
  return useQuery<ExamResults>({
    queryKey: ["exam-results", paperId],
    queryFn: () => apiFetch<ExamResults>(`/api/exam-papers/${paperId}/results`),
    enabled: !!paperId,
  });
}
