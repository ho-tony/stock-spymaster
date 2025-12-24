import { useMemo, useRef } from 'react';
import type { StockGraphProps } from './types';
import { processStockData } from './utils';
import { useNewsMarkers } from './useNewsMarkers';
import { useChart } from './useChart';

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
	const tooltipRef = useRef<HTMLDivElement | null>(null);

	const seriesData = useMemo(() => processStockData(data), [data]);

	// Calculate markers and news map
	const { markers, newsMap } = useNewsMarkers(news, seriesData);

	useChart({
		containerRef,
		tooltipRef,
		seriesData,
		markers,
		newsMap,
		height,
		color,
		showPriceLine,
		symbol,
	});

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
