# Agent Instructions

These instructions apply to the entire Eatable monorepo (`apps/api`, `apps/mobile`, and `packages/shared`). If a subdirectory contains its own `AGENTS.md`, follow it together with these instructions.

## Language

- English is the only language to use when creating or modifying code and repository documentation.
- Write source code, identifiers, comments, user-facing strings, commit-facing technical notes, API descriptions, tests, configuration explanations, and documentation in English.
- Keep existing non-English content only when a change does not touch it; translate or replace it when editing that content.

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

- Document every new or changed API endpoint in the repository's Bruno collection.
- Add a Bruno request for each endpoint, including its method, path, required headers or input data, and an example response where applicable.
- Keep the Bruno collection and environment files free of secrets; use environment variables for URLs and sensitive values.
- If a Bruno collection does not exist yet, create one with the first API change and document how to use it in the README.
- When API contracts change, update related types or schemas in `packages/shared` where applicable.
