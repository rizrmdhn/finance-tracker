import { appRouter, createCallerFactory } from "@finance-tracker/api";
import { db } from "./db";

const createCaller = createCallerFactory(appRouter);

export const caller = createCaller({ db });
