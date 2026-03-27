import { accountRouter } from "./routers/account";
import { appSettingsRouter } from "./routers/app-settings";
import { budgetRouter } from "./routers/budget";
import { categoryRouter } from "./routers/category";
import { exchangeRateRouter } from "./routers/exchange-rate";
import { recurrenceRouter } from "./routers/recurrence";
import { transactionRouter } from "./routers/transaction";
import { createCallerFactory, createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	transaction: transactionRouter,
	category: categoryRouter,
	account: accountRouter,
	appSetting: appSettingsRouter,
	budget: budgetRouter,
	recurrence: recurrenceRouter,
	exchangeRate: exchangeRateRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
