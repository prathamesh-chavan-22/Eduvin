import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExamFullScreenContainer } from "../ExamFullScreenContainer";

describe("ExamFullScreenContainer", () => {
  beforeEach(() => {
    document.exitFullscreen = jest.fn();
    document.documentElement.requestFullscreen = jest.fn().mockResolvedValue(undefined);
  });

  test("renders children", () => {
    render(
      <ExamFullScreenContainer onExitAttempt={() => {}}>
        <div>Exam Content</div>
      </ExamFullScreenContainer>
    );
    expect(screen.getByText("Exam Content")).toBeInTheDocument();
  });

  test("requests fullscreen on mount", async () => {
    render(
      <ExamFullScreenContainer onExitAttempt={() => {}}>
        <div>Content</div>
      </ExamFullScreenContainer>
    );
    await waitFor(() => {
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });
  });

  test("calls onExitAttempt when ESC key is pressed", () => {
    const onExitAttempt = jest.fn();
    render(
      <ExamFullScreenContainer onExitAttempt={onExitAttempt}>
        <div>Content</div>
      </ExamFullScreenContainer>
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onExitAttempt).toHaveBeenCalled();
  });

  test("handles fullscreen request denial gracefully", async () => {
    document.documentElement.requestFullscreen = jest
      .fn()
      .mockRejectedValue(new Error("Permission denied"));

    const { container } = render(
      <ExamFullScreenContainer onExitAttempt={() => {}}>
        <div>Content</div>
      </ExamFullScreenContainer>
    );

    await waitFor(() => {
      expect(container).toBeInTheDocument(); // Still renders even if fullscreen fails
    });
  });

  test("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <ExamFullScreenContainer onExitAttempt={() => {}}>
        <div>Content</div>
      </ExamFullScreenContainer>
    );

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
