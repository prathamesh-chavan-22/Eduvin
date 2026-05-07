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
  type: "essay" | "short" | "long" | "definition" | "mcq";
  question: string;
  marks: number;
  rubric: string;
  bloomLevel?: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
  options?: string[];
  answer?: string | number;
}

export interface ExamPaper {
  id: number;
  courseId: number;
  questions: ExamQuestion[];
  totalMarks: number;
  createdAt: string;
  bloomsDistribution?: Record<string, number> | null;
  questionFormat?: "mixed" | "objective" | "subjective";
  liveEnabled?: boolean;
  liveDurationMinutes?: number;
  notifyUserIds?: number[];
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

export interface ExamGenerationInput {
  questionCount: number;
  bloomsDistribution: Record<string, number>;
  questionFormat: "mixed" | "objective" | "subjective";
  liveEnabled: boolean;
  liveDurationMinutes: number;
  notifyUserIds: number[];
}

export interface LiveExamStart {
  paperId: number;
  durationMinutes: number;
  questions: ExamQuestion[];
  startedBy: number;
}

export interface LiveExamSubmission {
  id: number;
  score: number;
  totalMarks: number;
  summary: string;
  correctAnswers: number;
  autoGradedQuestions: number;
  submittedAt: string;
}

function normalizePaper(raw: any): ExamPaper {
  const questions = Array.isArray(raw?.questions)
    ? raw.questions.map((q: any) => ({
        ...q,
        bloomLevel: q?.bloomLevel ?? q?.bloom_level ?? undefined,
      }))
    : [];
  return {
    ...raw,
    questions,
    bloomsDistribution: raw?.bloomsDistribution ?? raw?.blooms_distribution ?? null,
    questionFormat: raw?.questionFormat ?? raw?.question_format ?? "mixed",
    liveEnabled: Boolean(raw?.liveEnabled ?? raw?.live_enabled ?? false),
    liveDurationMinutes: raw?.liveDurationMinutes ?? raw?.live_duration_minutes ?? 30,
    notifyUserIds: raw?.notifyUserIds ?? raw?.notify_user_ids ?? [],
  };
}

export function useExamPaper(courseId: number) {
  return useQuery<ExamPaper | null>({
    queryKey: ["exam-paper", courseId],
    queryFn: async () => {
      try {
        const raw = await apiFetch<any>(`/api/exam-papers/by-course/${courseId}`);
        return normalizePaper(raw);
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
    queryFn: async () => normalizePaper(await apiFetch<any>(`/api/exam-papers/${paperId}`)),
    enabled: !!paperId,
  });
}

export function useGenerateExamPaper(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation<ExamPaper, Error, ExamGenerationInput>({
    mutationFn: (payload) =>
      apiFetch<any>(`/api/exam-papers/generate/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(normalizePaper),
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

export function useStartLiveExam(paperId: number) {
  return useMutation<LiveExamStart, Error>({
    mutationFn: () => apiFetch<LiveExamStart>(`/api/exam-papers/${paperId}/live/start`, { method: "POST" }),
  });
}

export function useSubmitLiveExam(paperId: number) {
  const queryClient = useQueryClient();
  return useMutation<LiveExamSubmission, Error, (string | number | null)[]>({
    mutationFn: (answers) =>
      apiFetch<LiveExamSubmission>(`/api/exam-papers/${paperId}/live/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-results", paperId] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });
}
