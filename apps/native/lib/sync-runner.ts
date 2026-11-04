let tail: Promise<unknown> = Promise.resolve();

/**
 * Runs outgoing syncs one at a time: `task` starts once every sync queued
 * before it has settled. Shared by auto sync and the sync screen.
 */
export function withSyncLock<T>(task: () => Promise<T>): Promise<T> {
	const run = tail.then(task);
	tail = run.catch(() => {});
	return run;
}
