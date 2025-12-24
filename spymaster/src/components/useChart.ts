import { useEffect, useRef } from 'react';
import {
	ColorType,
	CrosshairMode,
	LineStyle,
	createChart,
	type IChartApi,
	type ISeriesApi,
	AreaSeries,
	type Time,
	type MouseEventParams,
	createSeriesMarkers,
	type ISeriesMarkersPluginApi,
} from 'lightweight-charts';
import type { NewsItem } from './types';

interface UseChartProps {
	containerRef: React.RefObject<HTMLDivElement | null>;
	tooltipRef: React.RefObject<HTMLDivElement | null>;
	seriesData: any[];
	markers: any[];
	newsMap: Map<number, NewsItem>;
	height: number;
	color: string;
	showPriceLine: boolean;
	symbol?: string;
}

export function useChart({
	containerRef,
	tooltipRef,
	seriesData,
	markers,
	newsMap,
	height,
	color,
	showPriceLine,
	symbol,
}: UseChartProps) {
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
	const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
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
}
