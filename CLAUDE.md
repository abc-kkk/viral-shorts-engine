# 🤖 AI Assistant Guidelines for viral-shorts-engine

> [!CRITICAL]
> **DATABASE SCHEMA MIGRATION RULES - READ CAREFULLY**
> This project has fully transitioned from Prisma to **Drizzle ORM** with `better-sqlite3`.

## 🚨 ALWAYS REMEMBER WHEN MODIFYING Drizzle Schema (`src/lib/schema.ts`) 🚨

If you add, remove, or modify columns/tables in `web/src/lib/schema.ts`, you **MUST** follow these steps to ensure the changes are applied safely to user databases:

**How to migrate data correctly:**
1. Open and modify `web/src/lib/schema.ts` using Drizzle ORM syntax.
2. Run `npx drizzle-kit generate` inside the `web` directory. This will automatically generate the corresponding SQL migration files in the `web/drizzle` folder.
3. **DO NOT** run `npx drizzle-kit push` manually for local user migrations unless you are testing locally. The desktop application automatically handles this at startup.

**Automatic Migration & Upgrades:**
- Inside `web/src/lib/db.ts` (`getDb` function), the application automatically executes `migrate(dbInstance, { migrationsFolder })` on startup.
- There is also a robust legacy upgrade hook in `getDb()` that automatically detects old Prisma databases lacking `__drizzle_migrations`, renames them to `.bak.db`, rebuilds the schema using Drizzle, and seamlessly copies the legacy data over.
- You **do not** need to write raw `db.exec("ALTER TABLE...")` scripts anymore. Rely on Drizzle's `generate` command and the automated runtime migration logic.

Failure to follow these rules (e.g. modifying `schema.ts` without running `drizzle-kit generate`) will cause Next.js backend errors (like 500s on `/api/state`) when querying fields that don't yet exist in the local SQLite file.
