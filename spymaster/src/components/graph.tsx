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
} from 'lightweight-charts';

export type UnixTimeInput = number; // unix seconds

export type StockPoint = {
	time: UnixTimeInput;
	value: number;
};

export type StockGraphProps = {
	data: StockPoint[];
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
	symbol,
	height = 640,
	color = '#2563eb',
	showPriceLine = true,
	className,
	style,
}: StockGraphProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

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
		chart.timeScale().fitContent();

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
		chartRef.current.timeScale().fitContent();
	}, [seriesData]);

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
		<div
			ref={containerRef}
			className={className}
			style={{ width: '100%', height, ...style }}
		/>
	);
}
