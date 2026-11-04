# Agent Instructions

These instructions apply to the entire Eatable monorepo (`apps/api`, `apps/mobile`, and `packages/shared`). If a subdirectory contains its own `AGENTS.md`, follow it together with these instructions.

## Language

- English is the only language to use when creating or modifying code and repository documentation.
- Write source code, identifiers, comments, user-facing strings, commit-facing technical notes, API descriptions, tests, configuration explanations, and documentation in English.
- Keep existing non-English content only when a change does not touch it; translate or replace it when editing that content.

## Source File Naming

- Use PascalCase for component files and camelCase for hooks, helpers, and other source modules, matching each file to its component, hook, or primary export.
- Never use kebab-case for source or test filenames. Name a test after the module it covers and append the package's established test suffix, preserving the module's casing (for example, `mealSchedule.test.mjs`).
- Use dot-separated role suffixes before the extension for related files, such as `MyComponent.test.ts` or `MyComponent.story.ts`. Keep the base name's PascalCase or camelCase and use the extension required by the file type and package tooling.
- Keep tool-required names for configuration and generated files when the tool depends on those exact filenames.

## TypeScript Conventions

- Prefer an `as const` object and a type derived from its values over TypeScript `enum`s. Use a PascalCase name for both the object and its derived union type, for example:
  ```ts
  const Direction = {
    Up: "UP",
    Down: "DOWN",
    Left: "LEFT",
    Right: "RIGHT",
  } as const;

  type Direction = (typeof Direction)[keyof typeof Direction];
  ```

## Git Commit Attribution

- Attribute commits to the real human user configured for the repository; never use an AI agent's name or identity as the commit author or committer.
- Do not change Git author or committer configuration to impersonate a user. Use the existing repository or user Git configuration, and ask the user to configure it if it does not identify them correctly.
- Do not create or amend commits unless the user asks for that action.

## Features and Tests

- Every new feature must include automated tests covering its key behavior and relevant edge cases.
- When changing an existing feature, add or update tests to cover the changed behavior.
- Run the relevant tests after making changes and fix failures caused by the implementation. If tests cannot be run, explain why.
- Place tests alongside the code or in a test directory, following the conventions of the relevant package. If a package has no established testing convention, choose an approach consistent with its stack and add the required scripts or dependencies.

## API and Bruno Collection

- Keep `apps/api` organized by domain: register endpoints in focused domain routers, keep application setup separate from server startup, and move domain rules and database operations out of route handlers into small modules with clear responsibilities.
- Treat the API root (`/`) as an API endpoint; do not serve an HTML landing page there. Use explicit health or status endpoints such as `/health` when needed.
- Document every new or changed API endpoint in the repository's Bruno collection.
- Add a Bruno request for each endpoint, including its method, path, required headers or input data, and an example response where applicable.
- Keep the Bruno collection and environment files free of secrets; use environment variables for URLs and sensitive values.
- If a Bruno collection does not exist yet, create one with the first API change and document how to use it in the README.
- When API contracts change, update related types or schemas in `packages/shared` where applicable.

## Mobile App Structure

- Keep Expo Router files in `apps/mobile/src/app` focused on navigation and route composition. Put screen UI and behavior in `features/<domain>` and have route files delegate to those screens.
- Organize feature-specific screens, components, and hooks together by domain. Keep reusable UI in `components`, app-wide providers in `providers`, and cross-feature utilities or service clients in `lib`.
- Keep screens focused on composition and user interaction. Move reusable stateful behavior into hooks and move API or platform access into service modules rather than embedding it in UI components.
- Keep shared presentation concerns such as theme tokens and translations in their existing app-wide modules. Avoid duplicating these values inside feature components.
- Prefer small modules with one clear responsibility. Split a component or module when it starts owning unrelated UI, state, and data access responsibilities.
- Reuse API contract types from `packages/shared` instead of redefining them in the mobile app.
- Declare component props in a separate named type or interface; do not write props types inline in a function parameter. Name the props type after the component (for example, `MacroProgressItemViewProps`), never with a generic name such as `Props`.
