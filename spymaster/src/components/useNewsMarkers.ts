import { useMemo } from 'react';
import type { SeriesMarker, Time } from 'lightweight-charts';
import type { NewsItem } from './types';

export function useNewsMarkers(news: NewsItem[] = [], seriesData: any[]) {
    return useMemo(() => {
        if (!news || news.length === 0 || seriesData.length === 0) {
            return { markers: [], newsMap: new Map<number, NewsItem>() };
        }

        const map = new Map<number, NewsItem>();
        const seriesTimes = seriesData.map((d) => d.time as number);
        const generatedMarkers: SeriesMarker<Time>[] = [];

        news.forEach((n) => {
            // Find closest time in seriesData
            let closestTime = seriesTimes[0];
            let minDiff = Math.abs(n.datetime - (closestTime as number));

            for (const t of seriesTimes) {
                const diff = Math.abs(n.datetime - (t as number));
                if (diff < minDiff) {
                    minDiff = diff;
                    closestTime = t;
                }
            }

            // Only add if the difference is reasonable (e.g. within 1 day)
            if (minDiff < 24 * 60 * 60) {
                console.log('Matched news', n.headline, 'to time', closestTime);
                map.set(closestTime as number, n);

                if (!generatedMarkers.find((m) => m.time === closestTime)) {
                    generatedMarkers.push({
                        time: closestTime as Time,
                        position: 'inBar',
                        color: '#f59e0b',
                        shape: 'circle',
                        size: 1,
                        text: 'News',
                    });
                }
            } else {
                console.log('Could not match news', n.headline, 'closest diff:', minDiff);
            }
        });

        console.log('Generated markers:', generatedMarkers);

        return {
            markers: generatedMarkers.sort((a, b) => (a.time as number) - (b.time as number)),
            newsMap: map,
        };
    }, [news, seriesData]);
}
