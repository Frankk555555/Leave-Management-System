---
trigger: always_on
---

# Development Planning Rule

Before implementing, modifying, refactoring, or adding any feature, the AI Agent MUST analyze and plan the work before writing or changing any code.

## Required Workflow

The Agent MUST follow this sequence:

```text
Understand
    ↓
Analyze
    ↓
Plan
    ↓
Review Plan
    ↓
Implement
    ↓
Test
    ↓
Verify
```

### 1. Understand

Before making changes, inspect the existing implementation and understand:

* Project architecture
* Related frontend components
* Related backend services
* API endpoints
* Database schema
* Authentication and authorization
* Existing business logic
* Existing reusable components
* Existing validation
* Existing tests
* Dependencies and integrations

Do not make assumptions about how the system works.

---

### 2. Analyze

Identify:

* What files will be affected
* What existing functionality is related
* Dependencies between components
* Potential side effects
* Existing patterns that should be followed
* Edge cases
* Security implications
* Data integrity implications
* Backward compatibility concerns

Avoid unnecessary changes outside the feature scope.

---

### 3. Create an Implementation Plan

Before writing code, create a clear implementation plan.

The plan MUST include:

```text
## Feature

What is being implemented?

## Objective

What problem does this feature solve?

## Current Behavior

How does the system currently work?

## Expected Behavior

How should the system work after the change?

## Files to Modify

List the files that are expected to change.

## Files to Create

List any new files that are required.

## Database Changes

Describe required schema or migration changes.

## API Changes

Describe new or modified endpoints.

## Frontend Changes

Describe affected pages, components, state, and UI behavior.

## Backend Changes

Describe affected controllers, services, middleware, validation, etc.

## Security Considerations

Describe authentication, authorization, validation, and data-access considerations.

## Testing Plan

Describe unit, integration, and E2E tests required.

## Risks

Identify possible regressions or side effects.

## Implementation Steps

Provide an ordered list of implementation steps.
```

---

### 4. Do Not Implement Immediately

After creating the plan, STOP before making code changes.

The Agent must review the plan for:

* Missing requirements
* Incorrect assumptions
* Unnecessary complexity
* Duplicate functionality
* Potential regressions
* Security issues
* Database inconsistencies
* API compatibility issues

Only proceed to implementation after the plan is sufficiently complete.

---

### 5. Implement According to the Plan

Once implementation begins:

* Follow the approved plan
* Make the smallest reasonable changes
* Reuse existing architecture and components
* Follow existing coding conventions
* Do not introduce unnecessary dependencies
* Do not refactor unrelated code
* Do not change existing behavior unless explicitly required

If implementation reveals that the original plan is incorrect or incomplete:

```text
STOP
↓
Explain the problem
↓
Update the plan
↓
Continue implementation
```

Do not silently change the scope.

---

### 6. Test After Implementation

Every feature must be tested after implementation.

At minimum, verify:

* Happy path
* Validation
* Error handling
* Authorization
* Edge cases
* Regression of existing functionality
* Relevant API behavior
* Relevant UI behavior
* E2E workflow when applicable

Do not consider a feature complete simply because the code compiles.

---

### 7. Final Verification

Before declaring the task complete, verify:

```text
Requirement
    ↓
Implementation
    ↓
Test
    ↓
Expected Result
```

Report:

* What was changed
* What was tested
* Test results
* Any remaining issues
* Any known limitations
* Any recommended follow-up work

---

# Strict Rules

The Agent MUST NOT:

* Start coding immediately after receiving a feature request
* Modify files before understanding the existing implementation
* Guess the architecture
* Guess API behavior
* Guess database relationships
* Create duplicate functionality
* Perform unrelated refactoring
* Add dependencies without justification
* Change security behavior without explicit reasoning
* Mark work as complete without testing

The Agent SHOULD prefer:

```text
Understand existing code
→ Reuse existing patterns
→ Plan the change
→ Make minimal changes
→ Test thoroughly
→ Verify the result
```

## Core Principle

> **Plan first. Code second. Test third.**

No feature should be implemented without a documented implementation plan.