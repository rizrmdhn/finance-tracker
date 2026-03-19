import { categoryRouter } from "./routers/category";
import { transactionRouter } from "./routers/transaction";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
	transaction: transactionRouter,
	category: categoryRouter,
});

export type AppRouter = typeof appRouter;
export { createCallerFactory };
