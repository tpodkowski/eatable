# Mobile App Agent Instructions

These instructions apply to `apps/mobile`. Follow them together with the repository-level `AGENTS.md`.

## React Effects

Use effects only to synchronize React state with something outside the render cycle, such as a network request, timer, animation, storage API, navigation, or imperative native view. Derive values from props and state during render (or with `useMemo` when calculation cost warrants it) instead of copying them into state through an effect.

- Give each effect one synchronization job. Separate unrelated requests, subscriptions, timers, and imperative UI updates.
- Keep route components focused on composition. Move data loading, persistence, and reusable lifecycle behavior into a feature hook or service.
- Keep the effect's setup and cleanup together. Cancel timers and animations, unsubscribe listeners, and ignore stale async results when the underlying API cannot cancel a request.
- List every reactive value used by the effect in its dependency array. Do not suppress dependency warnings to force a desired schedule; restructure the code instead.
- Do not use an effect for a user action. Call the relevant function from the event handler.

When adding or changing an effect, ask:

1. What external system is this effect synchronizing with?
2. Does it do one job, with unrelated work split into a separate effect or hook?
3. Does cleanup undo the setup and prevent stale updates?
4. Are its dependencies complete and stable for the intended lifecycle?
5. Could this be derived during render or handled directly by an event instead?

Short effects that each own one timer, animation, preference read, route synchronization, or data request are appropriate. The goal is clear ownership and lifecycle behavior, not minimizing the number of effects.

## Component Boundaries

- Keep screen components focused on composing feature components and coordinating screen-level state and navigation.
- When a screen contains a substantial, independently understandable UI section with its own rendering logic, interaction behavior, state, or styles, extract it into a named component in its own file within the feature directory. Do not leave a self-contained feature component embedded in a screen just because it is currently used once.
- Pass the extracted component the smallest clear set of props it needs. Keep component-specific styles and behavior with that component; keep shared UI in the existing shared components directory.
- Small, purely presentational fragments that have no independent behavior or meaningful reuse may remain inline when extraction would only add indirection.

## File Naming

- Use PascalCase for component files, matching the component name, and camelCase for hooks and utility modules, matching the hook or module's primary export.
- Never use kebab-case in filenames. This applies to route files and test files as well as source modules.
- Use dot-separated role suffixes before the extension for related files, such as `MyComponent.test.ts` or `MyComponent.story.ts`.
- Name colocated test files after the module they cover, followed by `.test` and the package-required extension while preserving the module's casing. For example, `mealSchedule.ts` is tested by `mealSchedule.test.mjs`.
