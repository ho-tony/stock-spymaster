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
