# Live Exam Taking Interface Redesign

**Date:** 2026-04-23  
**Status:** Approved  

## Overview

Replace the current inline card-based exam interface with a dedicated full-screen exam-taking experience. Students will progress through questions one at a time in a distraction-free environment with a sidebar showing question progress, status tracking, and comprehensive exam controls.

## Requirements Summary

| Decision | Choice |
|---|---|
| Display mode | Browser fullscreen API (user cannot exit) |
| Question navigation | Free navigation - click sidebar to jump to any question |
| Status tracking | Three states: Not Attempted, Attempted, Marked for Review |
| Review flagging | Manual toggle button per question (independent of answer) |
| Submission flow | Direct submit with warning for unanswered questions |
| Layout | Left sidebar (15-20%) + Main content (80-85%) + Top control bar |
| Question display | One question at a time with prev/next buttons |
| Timer behavior | Countdown display, auto-submit when time expires |
| Auto-save | Debounced (500ms) to state; no server save until submission |

## User Experience Flow

1. **Exam Start Screen**
   - User clicks "Start Live Exam" button
   - Fullscreen mode activated
   - Timer begins immediately
   - First question displayed

2. **Question Navigation**
   - User answers current question or skips
   - Can mark for review with flag toggle
   - Clicks prev/next to navigate sequentially
   - OR clicks any question in sidebar to jump

3. **Progress Tracking**
   - Sidebar shows all questions with status badges
   - Attempted: ● (filled circle)
   - Not Attempted: ○ (empty circle)
   - Marked for Review: ◆ (diamond)
   - Sidebar summary: "X/Y Attempted | Z Marked for Review"

4. **Submission**
   - User clicks "Submit Exam" button
   - Toast warning if questions remain unanswered
   - Direct submit (no review screen)
   - Results displayed immediately

5. **Timer Auto-Submit**
   - When timer reaches 0:00, exam auto-submits
   - Fullscreen exited
   - Results shown

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Exam Title | 00:45:30 | 25/60 Attempted | Exit | Submit Exam  │
├──────────────┬─────────────────────────────────────────────────┤
│              │                                                   │
│  Sidebar     │          Main Question Display                   │
│  (15-20%)    │          (80-85%)                               │
│              │                                                   │
│ ┌──────────┐ │  ┌──────────────────────────────────────────┐  │
│ │Question  │ │  │ Question 1 of 60                        │  │
│ │Navigator │ │  │ (Multiple Choice - 2 marks)             │  │
│ │          │ │  │                                          │  │
│ │ Q1 ●     │ │  │ Which of the following is correct?      │  │
│ │ Q2 ○     │ │  │                                          │  │
│ │ Q3 ◆     │ │  │ ◯ Option A                             │  │
│ │ Q4 ○     │ │  │ ◉ Option B (selected)                  │  │
│ │ Q5 ●     │ │  │ ◯ Option C                             │  │
│ │ ...      │ │  │                                          │  │
│ │ Q60 ○    │ │  │ [Flag Icon] Mark for Review             │  │
│ │          │ │  │                                          │  │
│ │Summary:  │ │  │ [< Prev] [Next >]                      │  │
│ │25/60     │ │  └──────────────────────────────────────────┘  │
│ │Attempted │ │                                                   │
│ │5 Marked  │ │                                                   │
│ │for Review│ │                                                   │
│ └──────────┘ │                                                   │
└──────────────┴─────────────────────────────────────────────────┘
```

## Component Architecture

### New Components

#### 1. **ExamFullScreenContainer** (Wrapper)
Manages fullscreen lifecycle and safety.

**Responsibilities:**
- Activate fullscreen on mount using Fullscreen API
- Request fullscreen on user interaction (click "Start")
- Catch fullscreen exit attempts
- Show warning toast if user tries ESC to exit
- Prevent exit until exam is submitted or time expires
- Clean up fullscreen on unmount

**Props:**
```typescript
interface ExamFullScreenContainerProps {
  children: React.ReactNode;
  onExitAttempt?: () => void;
}
```

**Key Methods:**
```typescript
enterFullscreen(): Promise<void>
handleFullscreenChange(event: FullscreenChangeEvent)
handleKeyPress(event: KeyboardEvent) // Intercept ESC
```

---

#### 2. **ExamTopBar** (Control Bar)
Displays exam metadata, timer, and action buttons.

**Responsibilities:**
- Show exam title and duration
- Display countdown timer (MM:SS format)
- Highlight timer in red when < 5:00 remaining
- "Exit" button with confirmation
- "Submit Exam" button (enabled when time > 0)
- Progress summary: "25/60 Attempted"

**Props:**
```typescript
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
```

**Styling:**
- Fixed at top, height: 64px
- Flexbox: space-between layout
- Timer turns red at 300 seconds remaining
- Buttons styled with primary/secondary variants

---

#### 3. **ExamSidebar** (Question Navigator)
Displays all questions with status indicators.

**Responsibilities:**
- List all questions numbered Q1–QN
- Show status badge for each (●/○/◆)
- Highlight current question
- Make each question clickable to jump
- Scroll to keep current question in view
- Show bottom summary: "X/Y Attempted | Z Marked for Review"

**Props:**
```typescript
interface ExamSidebarProps {
  questions: Question[];
  answers: (string | number | null)[];
  reviewFlags: Set<number>;
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
}
```

**Question Item Structure:**
```typescript
interface QuestionNavItem {
  index: number;
  status: 'attempted' | 'not-attempted' | 'marked-for-review';
  isCurrent: boolean;
  onClick: () => void;
}
```

**Status Badge:**
- ● (filled circle, green): attempted
- ○ (empty circle, gray): not attempted
- ◆ (diamond, blue): marked for review

---

#### 4. **ExamQuestionDisplay** (Main Content)
Displays a single question with input controls.

**Responsibilities:**
- Show question number and total: "Question 1 of 60"
- Show question type (MCQ, Short Answer, etc.)
- Show marks: "(2 marks)"
- Display question text
- Render question options or input field based on type
- Handle answer changes (update parent state)
- Toggle "Mark for Review" flag
- Prev/Next navigation buttons
- Disable navigation buttons at boundaries

**Props:**
```typescript
interface ExamQuestionDisplayProps {
  question: Question;
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
```

**Question Type Rendering:**
- **MCQ:** Radio group with options
- **Short Answer:** Text input field
- **Long Answer:** Textarea with character count
- **Numeric:** Number input

**Mark for Review Toggle:**
- Flag icon button below question
- Label: "Mark for Review"
- Styling: highlighted when active
- Keyboard shortcut: R key

**Navigation:**
- [< Prev] button (disabled if currentIndex === 0)
- [Next >] button (disabled if currentIndex === totalQuestions - 1)
- Alternative: Only show [Next] on last question as [Submit]

---

#### 5. **ExamSession** (Main Container/Controller)
Orchestrates the entire exam experience.

**Responsibilities:**
- Manage exam state: currentQuestionIndex, answers, reviewFlags, submitted
- Start exam (activate fullscreen, start timer)
- Handle answer updates with debounced auto-save
- Handle question navigation (validate, update index)
- Aggregate status counts (attempted, review)
- Submit exam (call API, show results)
- Handle timer expiry (auto-submit)
- Prevent accidental exit

**State:**
```typescript
interface ExamState {
  currentQuestionIndex: number;
  answers: Map<number, string | number | null>;
  reviewFlags: Set<number>;
  submitted: boolean;
  remainingSeconds: number;
  isLoading: boolean;
  errorMessage: string | null;
}
```

**Key Methods:**
```typescript
startExam(): Promise<void>
updateAnswer(index: number, answer: string | number): void
toggleReviewFlag(index: number): void
selectQuestion(index: number): void
navigateNext(): void
navigatePrevious(): void
submitExam(): Promise<void>
handleTimerExpiry(): void
```

---

### Component Hierarchy

```
ExamFullScreenContainer
├── ExamTopBar
│   ├── Timer
│   ├── Progress Label
│   ├── Exit Button
│   └── Submit Button
├── Layout Container (flex)
│   ├── ExamSidebar
│   │   ├── Question Navigator Items
│   │   └── Summary Footer
│   └── Main Content Area
│       └── ExamQuestionDisplay
│           ├── Question Text
│           ├── Options/Input
│           ├── Review Toggle
│           └── Navigation Buttons
└── ExamResults (shown after submit)
    ├── Score Display
    ├── Feedback
    └── Review Answers (optional)
```

---

## Data Model

### Question Type

```typescript
interface Question {
  id: string;
  type: 'mcq' | 'short-answer' | 'long-answer' | 'numeric';
  question: string;
  marks: number;
  options?: string[];        // For MCQ
  correctAnswer?: string;    // Populated only after submission
  explanation?: string;      // Populated only after submission
}
```

### Session Data

```typescript
interface ExamSession {
  sessionId: string;
  paperId: number;
  userId: string;
  startedAt: Date;
  durationMinutes: number;
  questions: Question[];
}

interface ExamProgress {
  answers: Map<number, string | number | null>;
  reviewFlags: Set<number>;
  submittedAt?: Date;
  score?: number;
  totalMarks?: number;
}
```

---

## State Management

**Local Component State** (React.useState):
- `currentQuestionIndex`
- `answers` (Map or array)
- `reviewFlags` (Set)
- `submitted`
- `remainingSeconds`

**No external state library required** for initial MVP. Use React Context if needed for deeply nested components.

**Auto-Save Logic:**
```typescript
// Debounced save on answer change
const debouncedSave = useMemo(
  () => debounce((index: number, answer: any) => {
    // Update local state only (not API)
    setAnswers(prev => ({ ...prev, [index]: answer }));
  }, 500),
  []
);
```

---

## API Integration

### Endpoints (Already Exist - No Changes)

- `POST /api/exams/{paperId}/start` → Returns `LiveExamStart` with questions + duration
- `POST /api/exams/{paperId}/submit` → Submits answers, returns score + feedback

### Data Flow

1. **Start Exam**
   ```
   User clicks "Start" 
   → ExamSession requests startExam API 
   → State initialized with questions + timer
   → Fullscreen activated
   ```

2. **During Exam**
   ```
   User answers question
   → updateAnswer called
   → Debounced state update
   → NO server call (answers stored locally)
   ```

3. **Submit**
   ```
   User clicks "Submit" OR timer expires
   → Prepare answers object
   → submitLiveExam API call
   → Parse results
   → Disable fullscreen
   → Show ExamResults component
   ```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Fullscreen denied | Show error toast, allow exam to proceed in normal view |
| User exits fullscreen | Show warning toast, offer to re-enter or submit |
| Timer sync lost | Re-fetch remaining time from server, adjust countdown |
| API submit fails | Retry button, keep answers in state, don't lose progress |
| Network drops during exam | Show offline banner, preserve state, retry on reconnect |
| Question render error | Show error for that question, allow continue |

---

## UI/UX Behavior

### Keyboard Shortcuts
- **Arrow Left/Right:** Navigate prev/next question
- **R:** Toggle "Mark for Review" on current question
- **Tab:** Move focus between questions in sidebar
- **ESC:** Show exit confirmation (if fullscreen)

### Visual Feedback
- Current question highlighted in sidebar with background color
- Hovered question in sidebar shows hover state
- Answered questions show filled status badge
- Marked questions show diamond badge (distinct color)
- Timer red when <5 minutes
- Submit button pulsates/highlights if exam is ending soon

### Responsiveness
- Sidebar collapses/hides on screens < 768px (mobile)
- On mobile: bottom tab bar for question navigation instead
- Main content remains full-width for readability
- Touch-friendly buttons (min 44px height)

---

## Validation & Safety

### Before Submission
- Show warning toast if any questions unanswered: "X questions not attempted"
- User can still submit (warning is advisory only)
- Check remaining time > 0 before allowing submit

### After Submission
- Lock all inputs (read-only)
- Show results immediately
- Disable fullscreen requirement
- Offer to review answers (optional)

---

## Performance Considerations

- **Lazy render:** Only render current + adjacent questions (current ± 1)
- **Debounced state updates:** 500ms to reduce re-renders
- **Memoized components:** Use React.memo for sidebar items to prevent unnecessary re-renders
- **Timer optimization:** Update timer in separate effect, don't trigger re-renders on every tick if not visible

---

## Testing Strategy

### Unit Tests
- Question status calculation (attempted/review flags)
- Navigation boundaries (prev/next button disable states)
- Answer storage and retrieval
- Timer countdown logic

### Integration Tests
- Start exam → Load questions → Submit → Show results
- Navigation between questions (sidebar + buttons)
- Mark for review toggle
- Timer auto-submit

### E2E Tests
- Full exam flow: start → answer questions → submit → results
- Fullscreen enforcement
- Exit attempt handling

---

## Migration Path

### Phase 1: New Component (No Breaking Changes)
- Add `ExamSession`, `ExamFullScreenContainer`, and supporting components
- Keep existing `LiveExamPanel` (can coexist)
- Feature flag or new page route to test

### Phase 2: Replace LiveExamPanel
- Update routes to use new `ExamSession`
- Remove old `LiveExamPanel` after validation

### Phase 3: Extend (Future)
- Analytics: track time per question, skips, review patterns
- Accessibility: screen reader support, keyboard navigation
- Proctoring: camera feed, activity monitoring (if required)

---

## Dependencies

**New npm packages:** None (uses existing Lucide icons, UI components)

**Browser APIs:**
- Fullscreen API (standard in modern browsers)
- LocalStorage for fallback (optional: resume exam if interrupted)

**Existing Utilities:**
- Debounce (use existing or add lodash-es)
- Toast notifications (existing useToast hook)

---

## Success Criteria

✅ Student can complete exam without leaving fullscreen (except on exit/submit)  
✅ Sidebar shows all questions with accurate status badges  
✅ Navigation works fluidly (click sidebar or prev/next buttons)  
✅ Mark for Review flag works independently of answer  
✅ Timer displays correctly and auto-submits at 0:00  
✅ Answers auto-saved (prevent loss on accidental close)  
✅ Submit shows warning for unanswered but allows submission  
✅ Results display with score and feedback  
✅ Fullscreen cannot be exited during exam (only via exit button/timer)  
