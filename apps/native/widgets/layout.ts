// Approximate heights in dp of the parts both list widgets are built from
const PADDING = 32; // 16 top + 16 bottom
const HEADER = 30; // 15sp title + 10 margin
const ROW = 50; // name + bar + amounts + 10 margin

/** How many list rows fit in a widget `height` dp tall — at least one, at most `max`. */
export function fitRows(height: number, max: number) {
	return Math.min(
		max,
		Math.max(1, Math.floor((height - PADDING - HEADER) / ROW)),
	);
}
