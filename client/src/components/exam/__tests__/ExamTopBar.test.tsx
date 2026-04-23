import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExamTopBar } from "../ExamTopBar";

describe("ExamTopBar", () => {
  const defaultProps = {
    examTitle: "Math Exam",
    remainingSeconds: 1800, // 30 minutes
    totalSeconds: 3600,
    attemptedCount: 25,
    totalQuestions: 60,
    onExit: jest.fn(),
    onSubmit: jest.fn(),
    isSubmitting: false,
  };

  test("renders exam title", () => {
    render(<ExamTopBar {...defaultProps} />);
    expect(screen.getByText("Math Exam")).toBeInTheDocument();
  });

  test("displays timer in MM:SS format", () => {
    render(<ExamTopBar {...defaultProps} />);
    expect(screen.getByText("30:00")).toBeInTheDocument();
  });

  test("displays progress count", () => {
    render(<ExamTopBar {...defaultProps} />);
    expect(screen.getByText("25/60 Attempted")).toBeInTheDocument();
  });

  test("shows warning state when time < 5 minutes", () => {
    render(<ExamTopBar {...defaultProps} remainingSeconds={299} />);
    const timerElement = screen.getByText("04:59");
    expect(timerElement).toHaveClass("text-red-600");
  });

  test("calls onExit when exit button clicked", () => {
    const onExit = jest.fn();
    render(<ExamTopBar {...defaultProps} onExit={onExit} />);
    fireEvent.click(screen.getByText("Exit"));
    expect(onExit).toHaveBeenCalled();
  });

  test("calls onSubmit when submit button clicked", () => {
    const onSubmit = jest.fn();
    render(<ExamTopBar {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Submit Exam"));
    expect(onSubmit).toHaveBeenCalled();
  });

  test("disables submit button when remaining time is 0", () => {
    render(<ExamTopBar {...defaultProps} remainingSeconds={0} />);
    expect(screen.getByText("Submit Exam")).toBeDisabled();
  });

  test("shows spinner when isSubmitting is true", () => {
    render(<ExamTopBar {...defaultProps} isSubmitting={true} />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });
});
