import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SpeakingPractice,
  SpeakingTopic,
  SpeakingLesson,
  UserLessonProgress,
} from "@shared/schema";

// Types for API responses
type TopicWithProgress = SpeakingTopic & {
  progress?: {
    totalLessons: number;
    completedLessons: number;
    completionPct: number;
    avgScore: number;
  };
  lessons?: SpeakingLesson[];
};

type LessonWithProgress = SpeakingLesson & {
  progress?: UserLessonProgress;
  prompt?: string;
  audioUrl?: string;
};

type ProgressStats = {
  totalLessons: number;
  completedLessons: number;
  completionPct: number;
  totalAttempts: number;
  avgScore: number;
  topicProgress: TopicWithProgress[];
};

type Recommendations = {
  continueLesson?: SpeakingLesson;
  nextLesson?: SpeakingLesson;
  suggestedTopics: (SpeakingTopic & {
    incompleteCount: number;
    totalCount: number;
  })[];
};

// Hooks

export function useSpeakingPractices() {
  return useQuery<SpeakingPractice[]>({
    queryKey: ["/api/speaking"],
    queryFn: async () => {
      const res = await fetch("/api/speaking");
      if (!res.ok) throw new Error("Failed to fetch speaking practices");
      return res.json();
    },
  });
}

export function useCreateSpeakingPractice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      prompt: string;
      transcript?: string;
      audioUrl?: string;
      lessonId?: number;
    }) => {
      const res = await fetch("/api/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create speaking practice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speaking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/speaking/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/speaking/recommendations"] });
    },
  });
}

export function useSpeakingTopics() {
  return useQuery<TopicWithProgress[]>({
    queryKey: ["/api/speaking/topics"],
    queryFn: async () => {
      const res = await fetch("/api/speaking/topics");
      if (!res.ok) throw new Error("Failed to fetch speaking topics");
      return res.json();
    },
  });
}

export function useSpeakingTopic(topicId: number | null) {
  return useQuery<TopicWithProgress>({
    queryKey: ["/api/speaking/topics", topicId],
    queryFn: async () => {
      if (!topicId) throw new Error("Topic ID is required");
      const res = await fetch(`/api/speaking/topics/${topicId}`);
      if (!res.ok) throw new Error("Failed to fetch speaking topic");
      return res.json();
    },
    enabled: !!topicId,
  });
}

export function useSpeakingLessons(filters?: {
  topicId?: number;
  difficultyLevel?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.topicId) params.append("topicId", filters.topicId.toString());
  if (filters?.difficultyLevel) params.append("difficultyLevel", filters.difficultyLevel.toString());
  
  return useQuery<LessonWithProgress[]>({
    queryKey: ["/api/speaking/lessons", filters],
    queryFn: async () => {
      const res = await fetch(`/api/speaking/lessons?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch speaking lessons");
      return res.json();
    },
  });
}

export function useSpeakingLesson(lessonId: number | null) {
  return useQuery<LessonWithProgress>({
    queryKey: ["/api/speaking/lessons", lessonId],
    queryFn: async () => {
      if (!lessonId) throw new Error("Lesson ID is required");
      const res = await fetch(`/api/speaking/lessons/${lessonId}`);
      if (!res.ok) throw new Error("Failed to fetch speaking lesson");
      return res.json();
    },
    enabled: !!lessonId,
  });
}

export function useSpeakingProgress() {
  return useQuery<ProgressStats>({
    queryKey: ["/api/speaking/progress"],
    queryFn: async () => {
      const res = await fetch("/api/speaking/progress");
      if (!res.ok) throw new Error("Failed to fetch speaking progress");
      return res.json();
    },
  });
}

export function useSpeakingRecommendations() {
  return useQuery<Recommendations>({
    queryKey: ["/api/speaking/recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/speaking/recommendations");
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
  });
}

export function useUpdateLanguage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (preferredLanguage: string) => {
      const res = await fetch("/api/user/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update language preference");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate the auth/me query since language preference is part of user profile
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/speaking/lessons"] });
    },
  });
}
