# Loop Engineering in Leave Management System

This document outlines the principles of **Loop Engineering** applied to the development of the Leave Management System. Loop engineering treats AI-assisted software development as an iterative system, rather than expecting single-shot answers.

## The Core Loop

Every development task in this project should follow this five-stage loop:

1. **Intent**: Clearly define the target outcome. E.g., "Add a date validation constraint so end dates cannot be before start dates in the leave request form."
2. **Context**: Gather relevant code (e.g., `LeaveRequest.jsx`, API schema, CSS files), documentation, constraints, and current error logs.
3. **Action**: Make the smallest, coherent code change necessary. Use specific tools to edit files directly.
4. **Observation**: Run validation. In this project, this means checking the React frontend (`npm run dev` in `client`), checking the Node/Express backend (`npm run dev` in `server`), and reviewing any console errors or UI changes.
5. **Adjustment**: Read the feedback (compiler errors, runtime issues, diffs) and refine the approach. Repeat until the task is successfully completed.

## Principles of a Good Loop

To ensure safe and effective AI collaboration on this repository, adhere to the following principles:

### 1. Clear Objectives
Always start with concrete, observable goals rather than vague requests. Include the desired user-visible behavior, constraints, and how to validate success.

### 2. Relevant Context
Before making changes, use `grep_search` and `view_file` to thoroughly inspect the codebase. Understand the existing patterns (e.g., how Toast notifications are handled, how CSS classes are reused) before introducing new ones.

### 3. Small Reversible Actions
Favor small, reviewable changes over large speculative rewrites. A small diff is easier to verify and repair. If a task is large, break it down into smaller sub-tasks.

### 4. Reliable Observability
Rely on actual signals to verify work:
- Run backend API tests or manual API calls if modifying server logic.
- Check React terminal output for build errors or ESLint warnings.
- Ask for user verification on UI/UX changes (e.g., color updates, animations).

### 5. Stopping Rules
The loop must know when to stop. Stop and ask the human developer for input if:
- Requirements are ambiguous.
- The change involves destructive actions (e.g., dropping database tables, overwriting critical data).
- We encounter a persistent blocker (e.g., repeating the same error more than twice).

## Common Loops for this Project

- **UI Iteration Loop**: Edit CSS/JSX -> Observe React Hot Reload -> Adjust layout/colors -> Seek human visual approval.
- **API Integration Loop**: Modify backend route -> Update frontend hook (`useLeaveRequests.js`) -> Test end-to-end flow -> Review server logs -> Adjust.
- **Debugging Loop**: Read error trace -> Search codebase for the faulty function -> Add logging or patch the logic -> Trigger the error again -> Verify fix.
