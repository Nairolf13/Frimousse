TypeScript guidelines

- Avoid using `any`. Prefer explicit types, generics, union types, or `unknown` with proper type guards.
- If you must bypass typing temporarily, use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a TODO and a reference to a ticket.
- Add small, focused types near the consumer when appropriate (e.g., API response shapes).
- Run `npx tsc --noEmit` before committing to catch regressions.
