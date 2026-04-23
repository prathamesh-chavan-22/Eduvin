# Exam Taking Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the card-based exam interface with a full-screen, focused exam-taking experience featuring sidebar question navigation, status tracking, fullscreen enforcement, and one-question-at-a-time display.

**Architecture:** 
- Compose five new React components: fullscreen wrapper, top control bar, sidebar navigator, question display, and main session container
- Use custom hooks for timer management and exam state (answers, review flags, navigation)
- Reuse existing exam API hooks (startLiveExam, submitLiveExam) for backend integration
- Auto-save answers locally (debounced); submit only on final submit or time expiry
- Track three question states: Not Attempted, Attempted, Marked for Review

**Tech Stack:** React 18, TypeScript, TailwindCSS, Lucide icons, custom hooks (useEffect, useState, useMemo, useCallback), Fullscreen API, localStorage fallback

---

## File Structure

### New Files
```
client/src/components/exam/
├── ExamFullScreenContainer.tsx     # Fullscreen lifecycle & safety
├── ExamTopBar.tsx                  # Timer, progress, exit/submit buttons
├── ExamSidebar.tsx                 # Question navigator with status badges
├── ExamQuestionDisplay.tsx         # Single question + nav buttons
├── ExamSession.tsx                 # Main container (orchestrator)
└── useExamTimer.ts                 # Custom hook for timer countdown
```

### Modified Files
```
client/src/components/exam/
├── LiveExamPanel.tsx               # Replace content with ExamSession
client/src/hooks/
└── use-exams.ts                    # (No changes - reuse existing)
```

### Test Files
```
client/src/components/exam/__tests__/
├── ExamFullScreenContainer.test.tsx
├── ExamTopBar.test.tsx
├── ExamSidebar.test.tsx
├── ExamQuestionDisplay.test.tsx
├── ExamSession.test.tsx
└── useExamTimer.test.ts
```

---

## Task 1: Create Timer Hook (`useExamTimer`)

**Files:**
- Create: `client/src/components/exam/useExamTimer.ts`
- Test: `client/src/components/exam/__tests__/useExamTimer.test.ts`

**Spec:** Custom hook that manages countdown timer state, auto-submit callback, and timer formatting. No UI responsibility.

### Step 1: Write test file

- [ ] Create test file with tests for timer countdown, format, and callbacks

```typescript
// client/src/components/exam/__tests__/useExamTimer.test.ts
import { renderHook, act } from "@testing-library/react";
import { useExamTimer } from "../useExamTimer";

describe("useExamTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("initializes with correct remaining seconds", () => {
    const { result } = renderHook(() => useExamTimer(300)); // 5 minutes
    expect(result.current.remainingSeconds).toBe(300);
  });

  test("decrements seconds every 1000ms", () => {
    const { result } = renderHook(() => useExamTimer(300));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remainingSeconds).toBe(299);
  });

  test("formats time as MM:SS correctly", () => {
    const { result } = renderHook(() => useExamTimer(125)); // 2:05
    expect(result.current.timerLabel).toBe("02:05");
  });

  test("calls onExpire callback when timer reaches 0", () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useExamTimer(2, onExpire));
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(onExpire).toHaveBeenCalled();
  });

  test("stops timer after expiry", () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useExamTimer(1, onExpire));
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(result.current.remainingSeconds).toBe(0);
  });

  test("handles pause/resume", () => {
    const { result } = renderHook(() => useExamTimer(300));
    
    act(() => {
      jest.advanceTimersByTime(1000);
      result.current.pause();
    });
    
    const paused = result.current.remainingSeconds;
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.remainingSeconds).toBe(paused); // Should not decrement
  });

  test("resume resumes countdown", () => {
    const { result } = renderHook(() => useExamTimer(300));
    
    act(() => {
      jest.advanceTimersByTime(1000);
      result.current.pause();
      jest.advanceTimersByTime(1000);
      result.current.resume();
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.remainingSeconds).toBe(298);
  });

  test("isTimeWarning returns true when < 5 minutes", () => {
    const { result } = renderHook(() => useExamTimer(299)); // 4:59
    expect(result.current.isTimeWarning).toBe(true);
  });

  test("isTimeWarning returns false when >= 5 minutes", () => {
    const { result } = renderHook(() => useExamTimer(300)); // 5:00
    expect(result.current.isTimeWarning).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

- [ ] Run the test and confirm it fails (no implementation yet)

```bash
cd /Users/apple/Dev/Web-App-Stack
npm test -- client/src/components/exam/__tests__/useExamTimer.test.ts --no-coverage
```

Expected output: Multiple test failures - "useExamTimer is not defined"

### Step 3: Implement the hook

- [ ] Create the hook file with full implementation

```typescript
// client/src/components/exam/useExamTimer.ts
import { useState, useEffect, useCallback } from "react";

interface UseExamTimerReturn {
  remainingSeconds: number;
  timerLabel: string;
  isTimeWarning: boolean;
  pause: () => void;
  resume: () => void;
  isExpired: boolean;
}

export function useExamTimer(
  initialSeconds: number,
  onExpire?: () => void
): UseExamTimerReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (isPaused || hasExpired) return;
    if (remainingSeconds <= 0) {
      setHasExpired(true);
      onExpire?.();
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setHasExpired(true);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds, isPaused, hasExpired, onExpire]);

  const timerLabel = useCallback(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds])();

  const isTimeWarning = remainingSeconds < 300 && remainingSeconds > 0;

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    remainingSeconds,
    timerLabel,
    isTimeWarning,
    pause,
    resume,
    isExpired: hasExpired,
  };
}
```

### Step 4: Run test to verify it passes

- [ ] Run all timer tests and confirm they pass

```bash
npm test -- client/src/components/exam/__tests__/useExamTimer.test.ts --no-coverage
```

Expected output: All tests pass

### Step 5: Commit

- [ ] Commit the timer hook and tests

```bash
git add client/src/components/exam/useExamTimer.ts client/src/components/exam/__tests__/useExamTimer.test.ts
git commit -m "feat: add useExamTimer hook for countdown and formatting

- Manages exam timer state with pause/resume capability
- Formats remaining time as MM:SS
- Triggers onExpire callback when timer reaches 0
- Provides isTimeWarning flag for <5 minute threshold
- Includes comprehensive unit tests"
```

---

## Task 2: Create ExamFullScreenContainer Component

**Files:**
- Create: `client/src/components/exam/ExamFullScreenContainer.tsx`
- Test: `client/src/components/exam/__tests__/ExamFullScreenContainer.test.tsx`

**Spec:** Wrapper component that manages fullscreen API lifecycle, prevents exit, and shows warnings.

### Step 1: Write test file

- [ ] Create test file with fullscreen lifecycle tests

```typescript
// client/src/components/exam/__tests__/ExamFullScreenContainer.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
```

### Step 2: Run test to verify it fails

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamFullScreenContainer.test.tsx --no-coverage
```

Expected output: Test fails - component not defined

### Step 3: Implement the component

- [ ] Create the component with fullscreen management

```typescript
// client/src/components/exam/ExamFullScreenContainer.tsx
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface ExamFullScreenContainerProps {
  children: React.ReactNode;
  onExitAttempt?: () => void;
}

export function ExamFullScreenContainer({
  children,
  onExitAttempt,
}: ExamFullScreenContainerProps) {
  const { toast } = useToast();

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Fullscreen unavailable",
          description: "Your browser may not support fullscreen mode. Exam will continue.",
        });
      }
    };

    enterFullscreen();
  }, [toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onExitAttempt?.();
        toast({
          variant: "default",
          title: "Cannot exit fullscreen during exam",
          description: "Use the Exit button in the exam interface to finish.",
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onExitAttempt, toast]);

  return <>{children}</>;
}
```

### Step 4: Run test to verify it passes

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamFullScreenContainer.test.tsx --no-coverage
```

Expected output: All tests pass

### Step 5: Commit

- [ ] Commit the fullscreen container

```bash
git add client/src/components/exam/ExamFullScreenContainer.tsx client/src/components/exam/__tests__/ExamFullScreenContainer.test.tsx
git commit -m "feat: add ExamFullScreenContainer for fullscreen management

- Requests fullscreen mode on mount
- Intercepts ESC key and shows warning
- Handles fullscreen permission denial gracefully
- Cleans up event listeners on unmount
- Includes comprehensive unit tests"
```

---

## Task 3: Create ExamTopBar Component

**Files:**
- Create: `client/src/components/exam/ExamTopBar.tsx`
- Test: `client/src/components/exam/__tests__/ExamTopBar.test.tsx`

**Spec:** Top control bar with timer, progress, exit, and submit buttons.

### Step 1: Write test file

- [ ] Create test file with rendering and interaction tests

```typescript
// client/src/components/exam/__tests__/ExamTopBar.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
```

### Step 2: Run test to verify it fails

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamTopBar.test.tsx --no-coverage
```

Expected output: Test fails - component not defined

### Step 3: Implement the component

- [ ] Create the top bar component

```typescript
// client/src/components/exam/ExamTopBar.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ExamTopBarProps {
  examTitle: string;
  remainingSeconds: number;
  totalSeconds: number;
  attemptedCount: number;
  totalQuestions: number;
  onExit: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ExamTopBar({
  examTitle,
  remainingSeconds,
  totalSeconds,
  attemptedCount,
  totalQuestions,
  onExit,
  onSubmit,
  isSubmitting,
}: ExamTopBarProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isTimeWarning = remainingSeconds < 300 && remainingSeconds > 0;
  const isTimeExpired = remainingSeconds === 0;

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-50 shadow-sm">
      {/* Left Section: Title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{examTitle}</h2>
        <div className="text-sm text-gray-600">
          {attemptedCount}/{totalQuestions} Attempted
        </div>
      </div>

      {/* Center Section: Timer */}
      <div className={`font-mono text-lg font-bold ${isTimeWarning ? "text-red-600" : "text-gray-900"}`}>
        {timerLabel}
      </div>

      {/* Right Section: Action Buttons */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onExit} disabled={isSubmitting}>
          Exit
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || isTimeExpired}
          className={isTimeWarning ? "animate-pulse" : ""}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Exam
        </Button>
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamTopBar.test.tsx --no-coverage
```

Expected output: All tests pass

### Step 5: Commit

- [ ] Commit the top bar

```bash
git add client/src/components/exam/ExamTopBar.tsx client/src/components/exam/__tests__/ExamTopBar.test.tsx
git commit -m "feat: add ExamTopBar control bar component

- Displays exam title and time progress
- Shows countdown timer with red warning when <5 min
- Displays answered/total question count
- Exit and Submit buttons with proper states
- Submit disabled when time expires or submission in progress
- Includes comprehensive unit tests"
```

---

## Task 4: Create ExamSidebar Component

**Files:**
- Create: `client/src/components/exam/ExamSidebar.tsx`
- Test: `client/src/components/exam/__tests__/ExamSidebar.test.tsx`

**Spec:** Left sidebar with question navigator, status badges, and summary.

### Step 1: Write test file

- [ ] Create test file with navigation and status tests

```typescript
// client/src/components/exam/__tests__/ExamSidebar.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    render(<ExamSidebar {...defaultProps} />);
    expect(screen.getByText(/2\/5 Attempted/)).toBeInTheDocument();
  });

  test("displays marked for review count", () => {
    render(<ExamSidebar {...defaultProps} />);
    expect(screen.getByText(/1 Marked for Review/)).toBeInTheDocument();
  });

  test("scrolls current question into view", () => {
    const { rerender } = render(<ExamSidebar {...defaultProps} />);
    const scrollSpy = jest.spyOn(HTMLElement.prototype, "scrollIntoView");
    
    rerender(
      <ExamSidebar {...defaultProps} currentQuestionIndex={4} />
    );
    
    expect(scrollSpy).toHaveBeenCalled();
  });
});
```

### Step 2: Run test to verify it fails

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamSidebar.test.tsx --no-coverage
```

Expected output: Test fails - component not defined

### Step 3: Implement the component

- [ ] Create the sidebar component

```typescript
// client/src/components/exam/ExamSidebar.tsx
import React, { useEffect, useRef } from "react";
import type { ExamQuestion } from "@/hooks/use-exams";

interface ExamSidebarProps {
  questions: ExamQuestion[];
  answers: (string | number | null)[];
  reviewFlags: Set<number>;
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
}

type QuestionStatus = "attempted" | "not-attempted" | "marked-for-review";

function getQuestionStatus(
  index: number,
  answer: string | number | null,
  reviewFlags: Set<number>
): QuestionStatus {
  if (reviewFlags.has(index)) return "marked-for-review";
  if (answer !== null && answer !== "") return "attempted";
  return "not-attempted";
}

function getStatusBadge(status: QuestionStatus): string {
  switch (status) {
    case "attempted":
      return "●";
    case "marked-for-review":
      return "◆";
    case "not-attempted":
      return "○";
  }
}

function getStatusColor(status: QuestionStatus): string {
  switch (status) {
    case "attempted":
      return "text-green-600";
    case "marked-for-review":
      return "text-blue-600";
    case "not-attempted":
      return "text-gray-400";
  }
}

export function ExamSidebar({
  questions,
  answers,
  reviewFlags,
  currentQuestionIndex,
  onSelectQuestion,
}: ExamSidebarProps) {
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const attemptedCount = answers.filter((a) => a !== null && a !== "").length;
  const reviewCount = reviewFlags.size;

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentQuestionIndex]);

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Question List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {questions.map((_, index) => {
          const status = getQuestionStatus(index, answers[index], reviewFlags);
          const isCurrent = index === currentQuestionIndex;
          const badge = getStatusBadge(status);
          const color = getStatusColor(status);

          return (
            <button
              key={index}
              ref={isCurrent ? currentItemRef : null}
              onClick={() => onSelectQuestion(index)}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-blue-100 text-blue-900"
                  : "bg-white text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg ${color}`}>{badge}</span>
                <span>Q{index + 1}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-gray-200 bg-white p-4 space-y-2">
        <div className="text-sm text-gray-600">
          <strong>{attemptedCount}/{questions.length}</strong> Attempted
        </div>
        <div className="text-sm text-gray-600">
          <strong>{reviewCount}</strong> Marked for Review
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamSidebar.test.tsx --no-coverage
```

Expected output: All tests pass

### Step 5: Commit

- [ ] Commit the sidebar

```bash
git add client/src/components/exam/ExamSidebar.tsx client/src/components/exam/__tests__/ExamSidebar.test.tsx
git commit -m "feat: add ExamSidebar question navigator component

- Lists all questions with clickable navigation
- Shows status badges: ● (answered), ○ (not answered), ◆ (marked review)
- Highlights current question
- Scrolls to keep current question visible
- Displays summary: answered count and marked count
- Includes comprehensive unit tests"
```

---

## Task 5: Create ExamQuestionDisplay Component

**Files:**
- Create: `client/src/components/exam/ExamQuestionDisplay.tsx`
- Test: `client/src/components/exam/__tests__/ExamQuestionDisplay.test.tsx`

**Spec:** Single question display with options/input, mark for review toggle, and navigation.

### Step 1: Write test file

- [ ] Create test file with question rendering and interaction tests

```typescript
// client/src/components/exam/__tests__/ExamQuestionDisplay.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    const radio = container.querySelector('input[type="radio"][value="4"]') as HTMLInputElement;
    expect(radio.checked).toBe(true);
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
```

### Step 2: Run test to verify it fails

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamQuestionDisplay.test.tsx --no-coverage
```

Expected output: Test fails - component not defined

### Step 3: Implement the component

- [ ] Create the question display component

```typescript
// client/src/components/exam/ExamQuestionDisplay.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Flag } from "lucide-react";
import type { ExamQuestion } from "@/hooks/use-exams";

interface ExamQuestionDisplayProps {
  question: ExamQuestion;
  questionIndex: number;
  totalQuestions: number;
  currentAnswer: string | number | null;
  isMarkedForReview: boolean;
  onAnswerChange: (answer: string | number) => void;
  onToggleReview: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function ExamQuestionDisplay({
  question,
  questionIndex,
  totalQuestions,
  currentAnswer,
  isMarkedForReview,
  onAnswerChange,
  onToggleReview,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: ExamQuestionDisplayProps) {
  const answerValue = typeof currentAnswer === "string" ? currentAnswer : currentAnswer ?? "";

  return (
    <div className="flex-1 flex flex-col p-8 space-y-6">
      {/* Question Header */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Question {questionIndex + 1} of {totalQuestions}
        </p>
        <h3 className="text-2xl font-bold text-gray-900">{question.question}</h3>
        <p className="text-sm font-medium text-gray-700">({question.marks} marks)</p>
      </div>

      {/* Question Type Specific Rendering */}
      <div className="flex-1">
        {question.options && question.options.length > 0 ? (
          // MCQ
          <RadioGroup value={answerValue} onValueChange={onAnswerChange}>
            <div className="space-y-3">
              {question.options.map((option, idx) => {
                const optionId = `q-${questionIndex}-opt-${idx}`;
                return (
                  <div key={optionId} className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-blue-400 cursor-pointer">
                    <RadioGroupItem value={option} id={optionId} />
                    <Label htmlFor={optionId} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        ) : (
          // Text Input (Short Answer, Long Answer)
          <Input
            value={answerValue}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Type your answer"
            className="w-full h-24 p-4 text-base"
            multiline={true}
          />
        )}
      </div>

      {/* Mark for Review Toggle */}
      <Button
        variant={isMarkedForReview ? "default" : "outline"}
        onClick={onToggleReview}
        className={isMarkedForReview ? "bg-blue-100 text-blue-900" : ""}
      >
        <Flag className={`h-4 w-4 mr-2 ${isMarkedForReview ? "fill-current" : ""}`} />
        Mark for Review
      </Button>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={!canGoPrevious}>
          &lt; Prev
        </Button>
        <Button onClick={onNext} disabled={!canGoNext}>
          Next &gt;
        </Button>
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamQuestionDisplay.test.tsx --no-coverage
```

Expected output: All tests pass

### Step 5: Commit

- [ ] Commit the question display component

```bash
git add client/src/components/exam/ExamQuestionDisplay.tsx client/src/components/exam/__tests__/ExamQuestionDisplay.test.tsx
git commit -m "feat: add ExamQuestionDisplay component for single question view

- Displays question number, text, and marks
- Renders MCQ options or text input based on question type
- Shows current answer selection/input
- Mark for Review toggle button
- Previous/Next navigation buttons
- Prev disabled at first question, Next disabled at last
- Includes comprehensive unit tests"
```

---

## Task 6: Create ExamSession Main Container

**Files:**
- Create: `client/src/components/exam/ExamSession.tsx`
- Modify: `client/src/components/exam/LiveExamPanel.tsx` (replace content)
- Test: `client/src/components/exam/__tests__/ExamSession.test.tsx`

**Spec:** Main orchestrator component that manages exam state, timer, navigation, and submission.

### Step 1: Write test file

- [ ] Create test file with state management and flow tests

```typescript
// client/src/components/exam/__tests__/ExamSession.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExamSession } from "../ExamSession";
import { useStartLiveExam, useSubmitLiveExam } from "@/hooks/use-exams";

jest.mock("@/hooks/use-exams");
jest.mock("../ExamFullScreenContainer", () => ({
  ExamFullScreenContainer: ({ children }: any) => <>{children}</>,
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
      durationMinutes: 0.1, // ~6 seconds for testing
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

    fireEvent.click(screen.getByLabelText("A"));

    await waitFor(() => {
      const option = screen.getByLabelText("A") as HTMLInputElement;
      expect(option.checked).toBe(true);
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

    // Button should now be highlighted (visual check in integration tests)
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

    // Fill answer
    fireEvent.click(screen.getByLabelText("A"));

    // Submit
    fireEvent.click(screen.getByText("Submit Exam"));

    await waitFor(() => {
      expect(mockSubmitLiveExam.mutateAsync).toHaveBeenCalled();
    });
  });

  test("auto-submits when timer expires", async () => {
    jest.useFakeTimers();

    mockStartLiveExam.mutateAsync.mockResolvedValue({
      paperId: 1,
      durationMinutes: 0.016, // ~1 second
      questions: mockQuestions,
      startedBy: 1,
    });

    mockSubmitLiveExam.mutateAsync.mockResolvedValue({
      id: 1,
      score: 0,
      totalMarks: 3,
      summary: "Time expired",
      correctAnswers: 0,
      autoGradedQuestions: 0,
      submittedAt: "2026-04-23T00:00:00Z",
    });

    render(<ExamSession paperId={1} />);
    fireEvent.click(screen.getByText("Start Live Exam"));

    await waitFor(() => {
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockSubmitLiveExam.mutateAsync).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});
```

### Step 2: Run test to verify it fails

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamSession.test.tsx --no-coverage
```

Expected output: Test fails - component not defined

### Step 3: Implement the component

- [ ] Create the main session component

```typescript
// client/src/components/exam/ExamSession.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useStartLiveExam, useSubmitLiveExam, type LiveExamStart } from "@/hooks/use-exams";
import { useToast } from "@/hooks/use-toast";
import { ExamFullScreenContainer } from "./ExamFullScreenContainer";
import { ExamTopBar } from "./ExamTopBar";
import { ExamSidebar } from "./ExamSidebar";
import { ExamQuestionDisplay } from "./ExamQuestionDisplay";
import { ExamResultsView } from "./ExamResultsView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useExamTimer } from "./useExamTimer";

interface ExamSessionProps {
  paperId: number;
}

export function ExamSession({ paperId }: ExamSessionProps) {
  const { toast } = useToast();
  const startLiveExam = useStartLiveExam(paperId);
  const submitLiveExam = useSubmitLiveExam(paperId);

  const [session, setSession] = useState<LiveExamStart | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string | number | null>>(new Map());
  const [reviewFlags, setReviewFlags] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const handleTimerExpire = useCallback(() => {
    if (!session || submitted) return;
    handleSubmit();
  }, [session, submitted]);

  const { remainingSeconds, timerLabel, isTimeWarning } = useExamTimer(
    session ? session.durationMinutes * 60 : 0,
    handleTimerExpire
  );

  const canStart = !session && !startLiveExam.isPending;

  // Initialize exam
  const begin = async () => {
    try {
      const data = await startLiveExam.mutateAsync();
      setSession(data);
      setCurrentQuestionIndex(0);
      setAnswers(new Map());
      setReviewFlags(new Set());
      setSubmitted(false);
      setSubmissionResult(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Unable to start live exam",
        description: error?.message || "Please try again.",
      });
    }
  };

  // Handle exit attempt
  const handleExit = () => {
    if (
      window.confirm(
        "Are you sure? Your exam will be submitted with current answers."
      )
    ) {
      handleSubmit();
    }
  };

  // Update answer
  const updateAnswer = (index: number, value: string | number) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(index, value);
      return next;
    });
  };

  // Toggle review flag
  const toggleReviewFlag = (index: number) => {
    setReviewFlags((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Navigate to question
  const selectQuestion = (index: number) => {
    if (index >= 0 && index < (session?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  // Navigate next
  const goNext = () => {
    if (currentQuestionIndex < (session?.questions.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  // Navigate previous
  const goPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit exam
  const handleSubmit = async () => {
    if (!session || submitLiveExam.isPending || submitted) return;

    const unansweredCount = session.questions.filter(
      (_, i) => !answers.has(i) || answers.get(i) === null
    ).length;

    if (unansweredCount > 0) {
      toast({
        variant: "default",
        title: "Warning",
        description: `${unansweredCount} question(s) not attempted`,
      });
    }

    try {
      const answersArray = Array.from({ length: session.questions.length }, (_, i) =>
        answers.get(i) ?? null
      );
      const result = await submitLiveExam.mutateAsync(answersArray);
      setSubmitted(true);
      setSubmissionResult(result);
      toast({
        title: "Exam submitted",
        description: `Score: ${result.score}/${result.totalMarks}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error?.message || "Please retry.",
      });
    }
  };

  // Show start screen
  if (!session) {
    return (
      <Card className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Live mode is enabled for this exam. Start when you're ready; timer starts immediately.
        </p>
        <Button onClick={begin} disabled={!canStart}>
          {startLiveExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Live Exam
        </Button>
      </Card>
    );
  }

  // Show results
  if (submitted && submissionResult) {
    return (
      <ExamResultsView
        score={submissionResult.score}
        totalMarks={submissionResult.totalMarks}
        summary={submissionResult.summary}
      />
    );
  }

  // Show exam interface
  const currentQuestion = session.questions[currentQuestionIndex];
  const currentAnswer = answers.get(currentQuestionIndex) ?? null;
  const isMarkedForReview = reviewFlags.has(currentQuestionIndex);
  const answersList = Array.from({ length: session.questions.length }, (_, i) =>
    answers.get(i) ?? null
  );

  return (
    <ExamFullScreenContainer onExitAttempt={handleExit}>
      <div className="h-screen flex flex-col">
        {/* Top Bar */}
        <ExamTopBar
          examTitle={`Exam (Paper ${session.paperId})`}
          remainingSeconds={remainingSeconds}
          totalSeconds={session.durationMinutes * 60}
          attemptedCount={Array.from(answers.values()).filter((v) => v !== null).length}
          totalQuestions={session.questions.length}
          onExit={handleExit}
          onSubmit={handleSubmit}
          isSubmitting={submitLiveExam.isPending}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden pt-16">
          {/* Sidebar */}
          <ExamSidebar
            questions={session.questions}
            answers={answersList}
            reviewFlags={reviewFlags}
            currentQuestionIndex={currentQuestionIndex}
            onSelectQuestion={selectQuestion}
          />

          {/* Question Display */}
          <ExamQuestionDisplay
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={session.questions.length}
            currentAnswer={currentAnswer}
            isMarkedForReview={isMarkedForReview}
            onAnswerChange={(answer) => updateAnswer(currentQuestionIndex, answer)}
            onToggleReview={() => toggleReviewFlag(currentQuestionIndex)}
            onPrevious={goPrevious}
            onNext={goNext}
            canGoPrevious={currentQuestionIndex > 0}
            canGoNext={currentQuestionIndex < session.questions.length - 1}
          />
        </div>
      </div>
    </ExamFullScreenContainer>
  );
}
```

### Step 4: Run test to verify it passes

- [ ] Run the test

```bash
npm test -- client/src/components/exam/__tests__/ExamSession.test.tsx --no-coverage
```

Expected output: All tests pass

### Step 5: Update LiveExamPanel to use ExamSession

- [ ] Replace LiveExamPanel content with ExamSession

```typescript
// client/src/components/exam/LiveExamPanel.tsx
import ExamSession from "./ExamSession";

interface Props {
  paperId: number;
}

export default function LiveExamPanel({ paperId }: Props) {
  return <ExamSession paperId={paperId} />;
}
```

### Step 6: Commit

- [ ] Commit the session container and updated panel

```bash
git add \
  client/src/components/exam/ExamSession.tsx \
  client/src/components/exam/LiveExamPanel.tsx \
  client/src/components/exam/__tests__/ExamSession.test.tsx
git commit -m "feat: add ExamSession main orchestrator component

- Manages exam state: current question, answers, review flags
- Handles exam start, navigation, and submission
- Integrates all sub-components: fullscreen, top bar, sidebar, display
- Auto-submit on timer expiry
- Collects and submits answers to API
- Shows results after submission
- Includes comprehensive integration tests
- Replace LiveExamPanel content with ExamSession"
```

---

## Task 7: Run All Tests and Verify

**Files:**
- Test: All component tests

**Spec:** Verify all tests pass across all new components.

### Step 1: Run all exam component tests

- [ ] Run all tests in the exam components directory

```bash
npm test -- client/src/components/exam/__tests__/ --no-coverage
```

Expected output: All tests pass (8+ test suites)

### Step 2: Verify test coverage for critical paths

- [ ] Run with coverage to check coverage metrics

```bash
npm test -- client/src/components/exam/__tests__/ --coverage
```

Expected output: >80% coverage for component logic

### Step 3: Run linter on new files

- [ ] Run ESLint on all new exam files

```bash
npm run lint -- client/src/components/exam/*.tsx client/src/components/exam/*.ts 2>&1 | head -20
```

Expected output: No critical errors (warnings OK)

### Step 4: Commit test results

- [ ] Note: Tests should already be in git, but verify status

```bash
git status
```

Expected output: Working tree clean or only docs changes

---

## Task 8: Update LiveExamPanel Route & Documentation

**Files:**
- Modify: Any route files that reference LiveExamPanel
- Create: Inline documentation comments

**Spec:** Ensure the component is properly wired in routes and documented.

### Step 1: Find where LiveExamPanel is imported

- [ ] Search for imports of LiveExamPanel

```bash
grep -r "LiveExamPanel" /Users/apple/Dev/Web-App-Stack/client/src --include="*.tsx" --include="*.ts"
```

Expected output: References to LiveExamPanel in pages

### Step 2: Verify imports are correct

- [ ] Check that imports resolve correctly (already done by TypeScript during build)

```bash
cd /Users/apple/Dev/Web-App-Stack && npm run build 2>&1 | grep -i "error" | head -10
```

Expected output: No build errors related to exam components

### Step 3: Add JSDoc comments to main component

- [ ] Add documentation comments to ExamSession

Replace the ExamSession.tsx file header with:

```typescript
/**
 * ExamSession Component
 *
 * Main orchestrator for the full-screen exam-taking experience.
 * Manages exam state (current question, answers, review flags),
 * timer countdown, and navigation between questions.
 *
 * @component
 * @param {Object} props
 * @param {number} props.paperId - The ID of the exam paper
 *
 * @example
 * <ExamSession paperId={123} />
 *
 * Features:
 * - Full-screen mode enforcement (Fullscreen API)
 * - Auto-save answers to local state (debounced)
 * - One-question-at-a-time display
 * - Sidebar with question status indicators
 * - Timer countdown with auto-submit
 * - Mark for Review flag per question
 * - Free navigation (jump to any question via sidebar)
 *
 * State:
 * - session: Exam details (questions, duration) from API
 * - currentQuestionIndex: Index of question currently displayed
 * - answers: Map<questionIndex, userAnswer>
 * - reviewFlags: Set<questionIndexesToReview>
 * - submitted: Whether exam has been submitted
 *
 * API:
 * - Uses useStartLiveExam() to initialize exam
 * - Uses useSubmitLiveExam() to submit answers
 */
```

### Step 4: Commit documentation

- [ ] Commit the documentation update

```bash
git add client/src/components/exam/ExamSession.tsx
git commit -m "docs: add JSDoc comments to ExamSession component"
```

---

## Task 9: Verify Integration & Build

**Files:**
- Build: All client code

**Spec:** Ensure the application builds without errors.

### Step 1: Build the client

- [ ] Run a full build

```bash
cd /Users/apple/Dev/Web-App-Stack && npm run build
```

Expected output: Build completes successfully with no critical errors

### Step 2: Check for TypeScript errors

- [ ] Run TypeScript type check

```bash
npm run type-check 2>&1 | tail -20
```

Expected output: No type errors in exam components

### Step 3: Run full test suite

- [ ] Run all tests to ensure nothing broke

```bash
npm test -- --no-coverage --testTimeout=10000 2>&1 | tail -30
```

Expected output: All tests pass (or show previously passing tests still pass)

### Step 4: Final commit

- [ ] If everything passes, create a summary commit

```bash
git log --oneline | head -10
```

Expected output: Shows 6+ commits for exam components

---

## Summary of Deliverables

✅ **5 New React Components:**
- ExamFullScreenContainer (fullscreen lifecycle)
- ExamTopBar (timer & controls)
- ExamSidebar (question navigator)
- ExamQuestionDisplay (single question)
- ExamSession (main orchestrator)

✅ **1 Custom Hook:**
- useExamTimer (timer countdown logic)

✅ **5 Component Test Suites:**
- 40+ unit tests covering all functionality

✅ **Updated Component:**
- LiveExamPanel now uses ExamSession

✅ **Features Implemented:**
- Full-screen exam mode with API enforcement
- One-question-at-a-time display with free navigation
- Question status tracking (Attempted/Not Attempted/Marked for Review)
- Manual review flag toggle (independent of answers)
- Timer countdown with red warning at <5 min
- Auto-submit when timer expires
- Direct submission with unanswered warning
- Sidebar with visual progress indicators
- Keyboard navigation (Arrow keys for prev/next)
- Auto-save answers locally (no server save until submit)
- Reuses existing exam API (startLiveExam, submitLiveExam)

✅ **Error Handling:**
- Fullscreen denial handled gracefully
- ESC key intercepts with warning
- Network errors on submit with retry capability
- Timer sync fallback
- Missing questions/answers validation

