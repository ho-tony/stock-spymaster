import React, { useEffect, useMemo, useRef } from 'react';
import {
	ColorType,
	CrosshairMode,
	LineStyle,
	createChart,
	type IChartApi,
	type ISeriesApi,
	type LineData,
	AreaSeries,
	type SeriesMarker,
	type Time,
	type MouseEventParams,
	createSeriesMarkers,
	type ISeriesMarkersPluginApi,
} from 'lightweight-charts';

export type UnixTimeInput = number; // unix seconds

export type StockPoint = {
	time: UnixTimeInput;
	value: number;
};

export type NewsItem = {
	category: string;
	datetime: number;
	headline: string;
	id: number;
	image: string;
	related: string;
	source: string;
	summary: string;
	url: string;
};

export type StockGraphProps = {
	data: StockPoint[];
	news?: NewsItem[];
	symbol?: string;
	height?: number;
	color?: string;
	showPriceLine?: boolean;
	className?: string;
	style?: React.CSSProperties;
};

function clampToLast30Days(points: Array<{ timeSec: number; value: number }>): Array<{ timeSec: number; value: number }> {
	if (points.length === 0) return points;
	const maxTime = points[points.length - 1].timeSec;
	const minTime = maxTime - 30 * 24 * 60 * 60;
	return points.filter((p) => p.timeSec >= minTime);
}

export default function StockGraph({
	data,
	news = [],
	symbol,
	height = 640,
	color = '#2563eb',
	showPriceLine = true,
	className,
	style,
}: StockGraphProps) {
	console.log('StockGraph rendered. News prop:', news);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
	const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
	const tooltipRef = useRef<HTMLDivElement | null>(null);

	const seriesData: LineData[] = useMemo(() => {
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
	}, [data]);

	// Calculate markers and news map
	const { markers, newsMap } = useMemo(() => {
		console.log('Calculating markers. News count:', news?.length, 'Series data count:', seriesData.length);
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
						time: closestTime,
						position: 'aboveBar',
						color: '#f59e0b',
						shape: 'arrowDown',
						size: 2,
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

	const newsMapRef = useRef(newsMap);
	useEffect(() => {
		newsMapRef.current = newsMap;
	}, [newsMap]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		// Create chart once
		const chart = createChart(el, {
			height,
			width: el.clientWidth,
			layout: {
				background: { type: ColorType.Solid, color: 'transparent' },
				textColor: '#0f172a',
			},
			grid: {
				vertLines: { color: 'rgba(148, 163, 184, 0.2)' },
				horzLines: { color: 'rgba(148, 163, 184, 0.2)' },
			},
			crosshair: {
				mode: CrosshairMode.Normal,
				vertLine: { color: 'rgba(100, 116, 139, 0.6)', style: LineStyle.Solid },
				horzLine: { color: 'rgba(100, 116, 139, 0.6)', style: LineStyle.Solid },
			},
			rightPriceScale: {
				borderColor: 'rgba(148, 163, 184, 0.6)',
			},
			timeScale: {
				borderColor: 'rgba(148, 163, 184, 0.6)',
				timeVisible: true,
				secondsVisible: false,
			},
		});

		const series = chart.addSeries(AreaSeries, {
			lineColor: color,
			lineWidth: 2,
			priceLineVisible: showPriceLine,
			title: symbol,
			topColor: 'rgba(37, 99, 235, 0.35)',
			bottomColor: 'rgba(37, 99, 235, 0.02)',
		});

		chartRef.current = chart;
		seriesRef.current = series;

		// Initial set
		series.setData(seriesData);
		
		// Create markers plugin
		const markersPlugin = createSeriesMarkers(series, markers);
		markersPluginRef.current = markersPlugin;

		chart.timeScale().fitContent();

		// Tooltip logic
		chart.subscribeCrosshairMove((param: MouseEventParams) => {
			if (
				param.point === undefined ||
				!param.time ||
				param.point.x < 0 ||
				param.point.x > el.clientWidth ||
				param.point.y < 0 ||
				param.point.y > el.clientHeight
			) {
				if (tooltipRef.current) {
					tooltipRef.current.style.display = 'none';
				}
				return;
			}

			const time = param.time as number;
			const newsItem = newsMapRef.current.get(time);

			if (newsItem && tooltipRef.current) {
				tooltipRef.current.style.display = 'block';
				
                // Adjust tooltip position to not go off screen
                const tooltipWidth = 300;
                let left = param.point.x + 10;
                if (left + tooltipWidth > el.clientWidth) {
                    left = param.point.x - tooltipWidth - 10;
                }
                
                tooltipRef.current.style.left = left + 'px';
				tooltipRef.current.style.top = param.point.y + 'px';
				tooltipRef.current.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #2563eb;">${newsItem.source}</div>
                    <div style="margin-bottom: 4px;">${newsItem.headline}</div>
                    <div style="font-size: 10px; color: #64748b;">${new Date(newsItem.datetime * 1000).toLocaleDateString()}</div>
                `;
			} else if (tooltipRef.current) {
				tooltipRef.current.style.display = 'none';
			}
		});

		const ro = new ResizeObserver(() => {
			if (!containerRef.current || !chartRef.current) return;
			chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height });
		});
		ro.observe(el);

		return () => {
			ro.disconnect();
			chart.remove();
			chartRef.current = null;
			seriesRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!seriesRef.current || !chartRef.current) return;
		seriesRef.current.setData(seriesData);
		if (markersPluginRef.current) {
			markersPluginRef.current.setMarkers(markers);
		}
		chartRef.current.timeScale().fitContent();
	}, [seriesData, markers]);

	useEffect(() => {
		if (!chartRef.current) return;
		chartRef.current.applyOptions({ height });
	}, [height]);

	useEffect(() => {
		if (!seriesRef.current) return;
		seriesRef.current.applyOptions({
			lineColor: color,
			priceLineVisible: showPriceLine,
			title: symbol,
			// keep area fill in sync with the line color (with alpha)
			topColor: 'rgba(37, 99, 235, 0.35)',
			bottomColor: 'rgba(37, 99, 235, 0.02)',
		});
	}, [color, showPriceLine, symbol]);

	return (
		<div style={{ position: 'relative', width: '100%', height }}>
			<div
				ref={containerRef}
				className={className}
				style={{ width: '100%', height, ...style }}
			/>
			<div
				ref={tooltipRef}
				style={{
					position: 'absolute',
					display: 'none',
					padding: '8px',
					boxSizing: 'border-box',
					fontSize: '12px',
					textAlign: 'left',
					zIndex: 1000,
					top: '12px',
					left: '12px',
					pointerEvents: 'none',
					border: '1px solid rgba(148, 163, 184, 0.4)',
					borderRadius: '4px',
					background: 'rgba(255, 255, 255, 0.95)',
					color: '#0f172a',
					boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
					maxWidth: '300px',
				}}
			/>
		</div>
	);
}
