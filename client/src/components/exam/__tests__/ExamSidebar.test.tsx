import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExamSidebar } from "../ExamSidebar";
import type { ExamQuestion } from "@/hooks/use-exams";

describe("ExamSidebar", () => {
  const mockQuestions: ExamQuestion[] = Array.from({ length: 5 }, (_, i) => ({
    type: "mcq",
    question: `Question ${i + 1}`,
    marks: 2,
    rubric: "test rubric",
  }));

  const defaultProps = {
    questions: mockQuestions,
    answers: [null, "option A", null, "option B", null],
    reviewFlags: new Set([2]),
    currentQuestionIndex: 0,
    onSelectQuestion: jest.fn(),
  };

  test("renders all questions", () => {
    render(<ExamSidebar {...defaultProps} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Q${i}`)).toBeInTheDocument();
    }
  });

  test("shows attempted badge for answered questions", () => {
    const { container } = render(<ExamSidebar {...defaultProps} />);
    const attemptedItems = container.querySelectorAll(".text-green-600");
    expect(attemptedItems.length).toBeGreaterThan(0);
  });

  test("shows not-attempted badge for unanswered questions", () => {
    const { container } = render(<ExamSidebar {...defaultProps} />);
    const notAttemptedItems = container.querySelectorAll(".text-gray-400");
    expect(notAttemptedItems.length).toBeGreaterThan(0);
  });

  test("shows review badge for marked questions", () => {
    const { container } = render(<ExamSidebar {...defaultProps} />);
    const reviewItems = container.querySelectorAll(".text-blue-600");
    expect(reviewItems.length).toBeGreaterThan(0);
  });

  test("highlights current question", () => {
    const { container } = render(<ExamSidebar {...defaultProps} />);
    const currentItem = container.querySelector(".bg-blue-100");
    expect(currentItem).toBeInTheDocument();
  });

  test("calls onSelectQuestion when question is clicked", () => {
    const onSelectQuestion = jest.fn();
    render(<ExamSidebar {...defaultProps} onSelectQuestion={onSelectQuestion} />);
    fireEvent.click(screen.getByText("Q2"));
    expect(onSelectQuestion).toHaveBeenCalledWith(1);
  });

  test("displays summary with attempt count", () => {
    const { container } = render(<ExamSidebar {...defaultProps} />);
    const footer = container.querySelector(".border-t");
    expect(footer?.textContent).toMatch(/2\/5.*Attempted/);
  });

  test("displays marked for review count", () => {
    const { container } = render(<ExamSidebar {...defaultProps} />);
    const footer = container.querySelector(".border-t");
    expect(footer?.textContent).toMatch(/1.*Marked for Review/);
  });

  test("scrolls current question into view", () => {
    const { rerender } = render(<ExamSidebar {...defaultProps} />);
    const scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    
    rerender(
      <ExamSidebar {...defaultProps} currentQuestionIndex={4} />
    );
    
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
});
