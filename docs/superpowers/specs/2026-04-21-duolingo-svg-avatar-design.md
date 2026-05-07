# Duolingo-Style SVG Avatar for LMS Course Explanation (Design)

## Problem
Course narration currently uses a plain audio player in the course player. We need a Duolingo-like 2D mascot that lip-syncs to narration audio, integrated into the existing lesson experience.

## Goals
1. Add one reusable SVG mascot component to the course player.
2. Drive mouth visemes from Rhubarb timing data for real sync.
3. Keep v1 web-only, lightweight, and reliable.

## Non-Goals (v1)
1. Multiple mascots.
2. Full emotion system.
3. Mobile-specific rendering optimizations.

## Selected Approach
Use pure SVG + React integration with Rhubarb-generated viseme timelines.

Why this approach:
1. Fastest integration with existing React course player.
2. No heavy animation runtime required.
3. Maximum control over visual states and timing behavior.

## Architecture
### Frontend
- `AvatarNarrator` component renders one master SVG with grouped layers:
  - `mouth-A`, `mouth-B`, `mouth-C`, `mouth-D`, `mouth-E`, `mouth-F`
  - `eyes-open`, `eyes-blink`
- `useLipSyncTimeline` hook:
  - Accepts `audioRef` and timeline events.
  - Returns current viseme + blink state.
  - Maps audio time to active mouth group.

### Backend/Data
- For each module narration audio, run Rhubarb once.
- Persist timeline JSON and expose URL in module payload.
- Extend course module response with:
  - `audioUrl`
  - `lipSyncTimelineUrl` (or embedded timeline object)

## Data Flow
1. Course player loads module data.
2. If `audioUrl` exists, it renders audio controls and `AvatarNarrator`.
3. `AvatarNarrator` loads Rhubarb timeline.
4. On audio play/pause/seek/end:
   - Read `audio.currentTime`.
   - Select matching viseme window.
   - Toggle SVG `<g>` visibility for mouth shape.
5. On track end, revert to neutral idle mouth.

## Integration Points
- Course player file: `client/src/pages/courses/player.tsx` (existing audio narration block).
- New UI files:
  - `client/src/components/avatar/AvatarNarrator.tsx`
  - `client/src/components/avatar/avatar-types.ts`
  - `client/src/hooks/use-lip-sync-timeline.ts`

## Error Handling
1. Timeline missing/invalid:
   - Keep audio functional.
   - Fallback to simple open/close talking loop while playing.
2. Timeline fetch error:
   - Keep avatar in idle state and continue narration.
3. Audio error:
   - Reset avatar to idle and stop viseme updates.

## Testing Strategy
1. Unit tests for viseme selection from `(currentTime, timeline)`.
2. Component tests for `AvatarNarrator` state transitions:
   - idle -> speaking
   - speaking -> paused
   - speaking -> idle on end/error
3. Regression check: course player still behaves normally for modules without audio.

## Rollout
1. Gate avatar render to modules with narration audio.
2. Start with one mascot and 6 visemes + blink.
3. Keep styling/theme-compatible with current course player card layout.

