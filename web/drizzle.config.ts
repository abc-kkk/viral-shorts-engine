import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/lib/schema.ts', './src/lib/studio/schema.ts'],
  out: './drizzle',
  dialect: 'sqlite',
});
