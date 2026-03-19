import { appRouter, createCallerFactory } from "@finance-tracker/api";
import type { AnyDatabase } from "@finance-tracker/db";
import { db } from "./db";

const createCaller = createCallerFactory(appRouter);

// ExpoSQLiteDatabase redeclares a private field in drizzle internals, requiring
// an explicit cast to satisfy the shared AnyDatabase type.
export const trpc = createCaller({ db: db as unknown as AnyDatabase });
