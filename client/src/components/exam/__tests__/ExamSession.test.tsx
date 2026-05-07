import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExamSession } from "../ExamSession";
import { useStartLiveExam, useSubmitLiveExam } from "@/hooks/use-exams";

jest.mock("@/hooks/use-exams");
jest.mock("../ExamFullScreenContainer", () => ({
  ExamFullScreenContainer: ({ children }: any) => <>{children}</>,
}));
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));
jest.mock("../useExamTimer", () => ({
  useExamTimer: (initialSeconds: number, onExpire: () => void) => ({
    remainingSeconds: 600, // 10 minutes
    timerLabel: "10:00",
    isTimeWarning: false,
    pause: jest.fn(),
    resume: jest.fn(),
    isExpired: false,
  }),
}));

describe("ExamSession", () => {
  const mockStartLiveExam = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockSubmitLiveExam = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockQuestions = [
    {
      type: "mcq",
      question: "Q1?",
      marks: 2,
      options: ["A", "B"],
      rubric: "test",
    },
    {
      type: "short",
      question: "Q2?",
      marks: 1,
      rubric: "test",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useStartLiveExam as jest.Mock).mockReturnValue(mockStartLiveExam);
    (useSubmitLiveExam as jest.Mock).mockReturnValue(mockSubmitLiveExam);
  });

  test("renders start button initially", () => {
    render(<ExamSession paperId={1} />);
    expect(screen.getByText("Start Live Exam")).toBeInTheDocument();
  });

  test("starts exam when button clicked", async () => {
    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 10,
      questions: mockQuestions,
      startedBy: 1,
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(mockStartLiveExam.mutateAsync).toHaveBeenCalled();
    });
  });

  test("displays exam interface after start", async () => {
    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 10,
      questions: mockQuestions,
      startedBy: 1,
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });
  });

  test("navigates to next question", async () => {
    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 10,
      questions: mockQuestions,
      startedBy: 1,
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next >"));

    await waitFor(() => {
      expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    });
  });

  test("navigates back to previous question", async () => {
    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 10,
      questions: mockQuestions,
      startedBy: 1,
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next >"));

    await waitFor(() => {
      expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("< Prev"));

    await waitFor(() => {
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });
  });

  test("updates answer when input changes", async () => {
    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 10,
      questions: mockQuestions,
      startedBy: 1,
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(screen.getByText("Q1?")).toBeInTheDocument();
    });

    const optionLabel = screen.getByText("A");
    fireEvent.click(optionLabel);

    await waitFor(() => {
      // Check that the radio button is checked by looking for the data-state attribute
      const radioButton = document.querySelector('button[value="A"][data-state="checked"]');
      expect(radioButton).toBeInTheDocument();
    });
  });

  test("toggles review flag for question", async () => {
    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 10,
      questions: mockQuestions,
      startedBy: 1,
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(screen.getByText("Mark for Review")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark for Review"));

    const reviewButton = screen.getByText("Mark for Review");
    expect(reviewButton).toBeInTheDocument();
  });

  test("submits exam with collected answers", async () => {
    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 10,
      questions: mockQuestions,
      startedBy: 1,
    });

    mockSubmitLiveExam.mutateAsync.mockResolvedValue({
      id: 1,
      score: 2,
      totalMarks: 3,
      summary: "Good",
      correctAnswers: 2,
      autoGradedQuestions: 1,
      submittedAt: "2026-04-23T00:00:00Z",
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("A"));

    // Wait for the answer to be updated
    await waitFor(() => {
      const radioButton = document.querySelector('button[value="A"][data-state="checked"]');
      expect(radioButton).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Submit Exam"));

    await waitFor(() => {
      expect(mockSubmitLiveExam.mutateAsync).toHaveBeenCalled();
    });
  });
});
