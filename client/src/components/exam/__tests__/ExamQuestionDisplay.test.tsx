import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExamQuestionDisplay } from "../ExamQuestionDisplay";
import type { ExamQuestion } from "@/hooks/use-exams";

describe("ExamQuestionDisplay", () => {
  const mcqQuestion: ExamQuestion = {
    type: "mcq",
    question: "What is 2+2?",
    marks: 2,
    rubric: "test",
    options: ["3", "4", "5"],
  };

  const shortAnswerQuestion: ExamQuestion = {
    type: "short",
    question: "What is your name?",
    marks: 1,
    rubric: "test",
  };

  const defaultProps = {
    question: mcqQuestion,
    questionIndex: 0,
    totalQuestions: 5,
    currentAnswer: null,
    isMarkedForReview: false,
    onAnswerChange: jest.fn(),
    onToggleReview: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    canGoPrevious: true,
    canGoNext: true,
  };

  test("renders question number and total", () => {
    render(<ExamQuestionDisplay {...defaultProps} />);
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
  });

  test("renders question text and marks", () => {
    render(<ExamQuestionDisplay {...defaultProps} />);
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText("(2 marks)")).toBeInTheDocument();
  });

  test("renders MCQ options as radio group", () => {
    render(<ExamQuestionDisplay {...defaultProps} />);
    expect(screen.getByLabelText("3")).toBeInTheDocument();
    expect(screen.getByLabelText("4")).toBeInTheDocument();
    expect(screen.getByLabelText("5")).toBeInTheDocument();
  });

  test("renders text input for short answer question", () => {
    render(
      <ExamQuestionDisplay {...defaultProps} question={shortAnswerQuestion} />
    );
    expect(screen.getByPlaceholderText("Type your answer")).toBeInTheDocument();
  });

  test("calls onAnswerChange when option selected", () => {
    const onAnswerChange = jest.fn();
    render(
      <ExamQuestionDisplay {...defaultProps} onAnswerChange={onAnswerChange} />
    );
    fireEvent.click(screen.getByLabelText("4"));
    expect(onAnswerChange).toHaveBeenCalledWith("4");
  });

  test("calls onAnswerChange when text input changed", () => {
    const onAnswerChange = jest.fn();
    render(
      <ExamQuestionDisplay
        {...defaultProps}
        question={shortAnswerQuestion}
        onAnswerChange={onAnswerChange}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Type your answer"), {
      target: { value: "John" },
    });
    expect(onAnswerChange).toHaveBeenCalledWith("John");
  });

  test("renders mark for review toggle", () => {
    render(<ExamQuestionDisplay {...defaultProps} />);
    expect(screen.getByText("Mark for Review")).toBeInTheDocument();
  });

  test("calls onToggleReview when mark for review clicked", () => {
    const onToggleReview = jest.fn();
    render(
      <ExamQuestionDisplay {...defaultProps} onToggleReview={onToggleReview} />
    );
    fireEvent.click(screen.getByText("Mark for Review"));
    expect(onToggleReview).toHaveBeenCalled();
  });

  test("highlights mark for review when active", () => {
    const { container } = render(
      <ExamQuestionDisplay {...defaultProps} isMarkedForReview={true} />
    );
    const reviewButton = screen.getByText("Mark for Review").closest("button");
    expect(reviewButton).toHaveClass("bg-blue-100");
  });

  test("renders prev and next buttons", () => {
    render(<ExamQuestionDisplay {...defaultProps} />);
    expect(screen.getByText("< Prev")).toBeInTheDocument();
    expect(screen.getByText("Next >")).toBeInTheDocument();
  });

  test("disables prev button when canGoPrevious is false", () => {
    render(<ExamQuestionDisplay {...defaultProps} canGoPrevious={false} />);
    expect(screen.getByText("< Prev")).toBeDisabled();
  });

  test("disables next button when canGoNext is false", () => {
    render(<ExamQuestionDisplay {...defaultProps} canGoNext={false} />);
    expect(screen.getByText("Next >")).toBeDisabled();
  });

  test("calls onPrevious when prev button clicked", () => {
    const onPrevious = jest.fn();
    render(<ExamQuestionDisplay {...defaultProps} onPrevious={onPrevious} />);
    fireEvent.click(screen.getByText("< Prev"));
    expect(onPrevious).toHaveBeenCalled();
  });

  test("calls onNext when next button clicked", () => {
    const onNext = jest.fn();
    render(<ExamQuestionDisplay {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText("Next >"));
    expect(onNext).toHaveBeenCalled();
  });

  test("pre-selects current answer for MCQ", () => {
    const { container } = render(
      <ExamQuestionDisplay {...defaultProps} currentAnswer="4" />
    );
    // Radix UI RadioGroup manages internal state through value prop
    // We can verify by checking the button elements have the correct aria-checked state
    const option4Button = container.querySelector('[role="radio"][value="4"]');
    expect(option4Button).toHaveAttribute("aria-checked", "true");
  });

  test("pre-fills text input with current answer", () => {
    render(
      <ExamQuestionDisplay
        {...defaultProps}
        question={shortAnswerQuestion}
        currentAnswer="My answer"
      />
    );
    expect(
      (screen.getByPlaceholderText("Type your answer") as HTMLInputElement).value
    ).toBe("My answer");
  });
});
