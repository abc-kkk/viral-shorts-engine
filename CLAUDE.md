# 🤖 AI Assistant Guidelines for viral-shorts-engine

> [!CRITICAL]
> **READ THIS BEFORE MODIFYING ANY CODE. THIS IS YOUR PRIMARY MEMORY OVERRIDE.**
> You are working on a highly complex Electron + Next.js + Drizzle ORM architecture. Many historical pitfalls have destroyed the project in the past. Adhere strictly to the following 6 Iron Rules.

## 🔴 1. THE DRIZZLE SCHEMA RULE (`src/lib/schema.ts`)
- **NEVER** edit `schema.ts` without immediately running `npx drizzle-kit generate` in the `web` folder. 
- **DO NOT** run `npx drizzle-kit push`. The system applies SQL patches automatically at runtime via `migrate()` inside `db.ts`.

## 🔴 2. THE HOT-MIGRATION RULE (`src/lib/db.ts`)
- The `getDb()` function contains a critical Prisma-to-Drizzle migration block (creating `.bak.db`). 
- **DO NOT TOUCH, REFACTOR, OR OPTIMIZE THIS BLOCK.** It is the only safety net preventing legacy users from losing their entire life's work.

## 🔴 3. THE STATE PERSISTENCE RULE (`src/lib/db.ts`)
- When adding a new field to `useProjectState.ts`, you **MUST** map it inside `schema.ts` AND manually write the mapping logic inside the `loadState` and `saveState` (upsert blocks) in `db.ts`. 
- If you only save it to React memory, the app will break upon refresh.
- **Safety Net**: `__tests__/db.integration.test.ts` validates saveState→loadState roundtrip symmetry. `__tests__/fieldRegistry.test.ts` catches any new schema columns not yet tracked. Run `npx vitest run` to verify.

## 🔴 4. THE PROMPT TEMPLATE TRAPS (`src/lib/prompts/defaultTemplates.ts`)
- The templates are wrapped in JS Template Literals (`` `...` ``). 
- If you want the AI to output a literal backtick or `{@xxx}` tag, you **MUST ESCAPE IT** (e.g., `\`{@xxx}\``). A single unescaped backtick will crash the entire Next.js build AST.
- If you modify `systemPrompt` without adding new `variables`, it won't auto-upgrade in the user's disk cache!

## 🔴 5. THE DESKTOP NATIVE ABI RULE (`desktop/afterPack.js`)
- Do not refactor the recursive `better-sqlite3` deep-patching logic in `afterPack.js`. 
- Windows Next.js builds secretly clone hashed directories for Native node modules. This brute-force replacement is necessary to prevent `invalid invocation` C++ crashes.

## 🔴 6. THE STRONG TYPING & TEST RULE (Zod & Vitest)
- The project enforces strict Zod validation at the API Gateway boundaries.
- All hooks (`useWriterRoom`, `useCastingRoom`, `useStoryboard`, `useInboxPoller`) use `Pick<ProjectStateReturn, ...>` typed parameters — **never `any`**. When adding a field to a hook, update its Pick type.
- **AFTER any modification**, you MUST run `npx vitest run` in the `web` folder.
- **CRITICAL**: Unit tests are not enough. Next.js enforces extremely strict TypeScript checks during `npm run build`. You MUST run `npm run build` in the `web` folder to ensure no strict type errors (e.g., Zod generic arguments) break the production deployment.

## 🔴 7. WINDOWS PROCESS MANAGEMENT TRAP (Next.js & Electron)
- Never use standard `child.kill('SIGTERM')` for Next.js or Gateway processes spawned from Electron. On Windows, this leaves orphaned Turbopack workers (zombie `node.exe` processes) which will lock port 3000 and crash future launches.
- ALWAYS use `taskkill /pid <PID> /T /F` to destroy the entire process tree on Windows.
- `isPortAvailable` checks must omit the hostname (`server.listen(port)`) to properly scan all IPv4/IPv6 interfaces, preventing Next.js EADDRINUSE crashes.
