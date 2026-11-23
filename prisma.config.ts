import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. Neon on Vercel exposes
    // it as DATABASE_URL_UNPOOLED; locally both point to the same database.
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});
