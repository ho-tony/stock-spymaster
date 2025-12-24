import type { StockPoint } from './types';

export function clampToLast30Days(points: Array<{ timeSec: number; value: number }>): Array<{ timeSec: number; value: number }> {
	if (points.length === 0) return points;
	const maxTime = points[points.length - 1].timeSec;
	const minTime = maxTime - 30 * 24 * 60 * 60;
	return points.filter((p) => p.timeSec >= minTime);
}

export function processStockData(data: StockPoint[]) {
    const normalized = data
        .map((p) => ({ timeSec: p.time, value: p.value }))
        .filter((p) => Number.isFinite(p.timeSec) && Number.isFinite(p.value))
        .sort((a, b) => a.timeSec - b.timeSec);

    const dedup: Array<{ timeSec: number; value: number }> = [];
    for (const p of normalized) {
        const last = dedup[dedup.length - 1];
        if (last && last.timeSec === p.timeSec) {
            last.value = p.value;
        } else {
            dedup.push({ ...p });
        }
    }

    const last30 = clampToLast30Days(dedup);
    return last30.map((p) => ({ time: p.timeSec as any, value: p.value }));
}
