# ToDoList Project Safety Rules

## Work process

- Before changing code, inspect the relevant files and explain the planned changes, likely side effects, data risks, and verification steps in beginner-friendly Korean.
- Wait for the user's explicit approval before making code, configuration, or data changes.
- Make the smallest safe change that fulfills the approved request. Do not make unrelated cleanup or refactoring changes.
- After a change, run proportionate checks, report the changed files and results, then stop unless asked to continue.

## Data and sync protection

- Keep the existing single `store` as the source of truth. Do not split state, `deletedItemIds`, `updatedAt`, or `syncRevision` into independent feature stores.
- Do not directly edit, clear, reset, or migrate browser `localStorage` or IndexedDB data unless the user explicitly requests it.
- Treat Firebase E2EE sync as one central flow. Do not add separate feature-level Firebase writes, encryption paths, or sync timers.
- Preserve existing user data, tombstones, and pending changes. Never use destructive Git commands or overwrite unrelated user changes.
- Treat vault file metadata and IndexedDB file contents as one coordinated feature; do not change one side without reviewing the other.

## Compatibility

- Preserve existing `window.UI`, `window.store`, and inline HTML event-handler behavior unless an approved migration explicitly includes compatibility work.
- Do not restructure or modularize `app.js` unless the user explicitly asks. Large architectural work is handled separately and must be incremental.
