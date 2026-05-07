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
    });
    
    act(() => {
      result.current.pause();
    });
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    act(() => {
      result.current.resume();
    });
    
    act(() => {
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

  test("allows configurable warning threshold", () => {
    const { result } = renderHook(() => useExamTimer(350, undefined, 300));
    expect(result.current.isTimeWarning).toBe(false);
    
    const { result: result2 } = renderHook(() => useExamTimer(250, undefined, 300));
    expect(result2.current.isTimeWarning).toBe(true);
  });

  test("works without onExpire callback", () => {
    const { result } = renderHook(() => useExamTimer(2)); // No callback
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(result.current.isExpired).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
  });
});
