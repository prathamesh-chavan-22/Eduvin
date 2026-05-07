import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TutorMessage {
    id: number;
    userId: number;
    courseId: number;
    moduleId: number | null;
    role: "user" | "assistant";
    content: string;
    audioUrl: string | null;
    createdAt: string | null;
}

interface LearnerProfile {
    id: number;
    userId: number;
    knowledgeLevel: string;
    avgQuizScore: number;
    totalModulesCompleted: number;
    struggleTopics: string[] | null;
    strongTopics: string[] | null;
    preferredPace: string;
    updatedAt: string | null;
}

interface TutorChatInput {
    message: string;
    moduleId: number;
    courseId: number;
}

export function useTutorHistory(courseId: number) {
    return useQuery<TutorMessage[]>({
        queryKey: [`/api/tutor/history/${courseId}`],
        enabled: courseId > 0,
        staleTime: 0,
        refetchInterval: false,
    });
}

export function useTutorChat() {
    const queryClient = useQueryClient();

    return useMutation<TutorMessage, Error, TutorChatInput>({
        mutationFn: async (input) => {
            const res = await apiRequest("POST", "/api/tutor/chat", input);
            return res.json();
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: [`/api/tutor/history/${variables.courseId}`],
            });
        },
    });
}

export function useLearnerProfile() {
    return useQuery<LearnerProfile>({
        queryKey: ["/api/tutor/profile"],
    });
}

export function useUpdateLearnerProfile() {
    const queryClient = useQueryClient();

    return useMutation<LearnerProfile, Error, { quizScore: number; moduleTitle: string }>({
        mutationFn: async (input) => {
            const res = await apiRequest("POST", "/api/tutor/profile/update", input);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tutor/profile"] });
        },
    });
}

export type { TutorMessage, LearnerProfile };
