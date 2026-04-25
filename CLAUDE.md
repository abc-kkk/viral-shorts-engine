# 🤖 AI Assistant Guidelines for viral-shorts-engine

> [!CRITICAL]
> **DATABASE SCHEMA MIGRATION RULES - READ CAREFULLY**
> This is an Electron desktop app with an embedded Next.js server. The user's machine will likely NOT have a global Node.js or `npm`/`npx` installed.

## 🚨 ALWAYS REMEMBER WHEN MODIFYING Prisma Schema (`schema.prisma`) 🚨

If you ever add, remove, or modify columns in `web/prisma/schema.prisma`, you **MUST** also update the hot-migration script to prevent breaking older databases on the user's local machine.

**Why?**
The application does **NOT** run `npx prisma db push` or `prisma migrate` automatically on existing databases because it cannot rely on `npx` being available on the host machine. If you change the schema without updating the migration script, Prisma Client will crash with a `no such column` SQL error when it queries the user's existing SQLite database.

**How to migrate data correctly:**
1. Open `web/src/lib/db.ts`.
2. Locate the `runDatabaseMigrations` function.
3. If you added a new field (e.g. to the `Scene` table), you **MUST** add that field to the `requiredColumns` array (or write a new `db.exec("ALTER TABLE...")` statement).
4. Example:
   ```typescript
   const requiredColumns = [
     { name: 'yourNewFieldName', type: 'TEXT' } // Add your new column here!
   ];
   ```
5. NEVER rely on Prisma CLI commands for schema migration on the client's end in this project. All schema evolutions on the user side MUST be done natively using `better-sqlite3` `ALTER TABLE` commands inside `db.ts`.

Failure to follow this rule will cause the user's projects to instantly disappear (render as blank) upon application update due to 500 errors from `/api/state` crashing. 
DO NOT FORGET THIS!
