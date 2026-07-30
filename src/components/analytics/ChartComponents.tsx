/**
 * Lazily-loaded chart components for AnalyticsDrawer.
 * Code-split from the main bundle to save ~150 KB on initial load.
 */
import React from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { TurnData } from "./TokenTrendChart";

export interface ChartDataPoint {
	name: string;
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	total: number;
	cost: number;
}

export const TokenAreaChart = React.memo(function TokenAreaChart({ data }: { data: ChartDataPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height={200}>
			<AreaChart data={data}>
				<defs>
					<linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
						<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
				<XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
				<YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} />
				<Tooltip
					contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
					itemStyle={{ color: "#e4e4e7" }}
				/>
				<Legend wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }} />
				<Area type="monotone" dataKey="input" stroke="#6366f1" fill="url(#inputGrad)" stackId="1" isAnimationActive={false} />
				<Area type="monotone" dataKey="output" stroke="#22da6e" fill="none" stackId="1" isAnimationActive={false} />
				<Area type="monotone" dataKey="cacheRead" stroke="#ecc48d" fill="none" stackId="1" isAnimationActive={false} />
				<Area type="monotone" dataKey="cacheWrite" stroke="#7fdbca" fill="none" stackId="1" isAnimationActive={false} />
			</AreaChart>
		</ResponsiveContainer>
	);
});

export const CostBarChart = React.memo(function CostBarChart({ data }: { data: ChartDataPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height={200}>
			<BarChart data={data}>
				<CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
				<XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
				<YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} />
				<Tooltip
					contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
					itemStyle={{ color: "#e4e4e7" }}
				/>
				<Bar dataKey="cost" fill="#818cf8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
			</BarChart>
		</ResponsiveContainer>
	);
});

export const TokenTrendChartLazy = React.memo(function TokenTrendChartLazy({ data }: { data: TurnData[] }) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={data}>
				<defs>
					<linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
						<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
					</linearGradient>
				</defs>
				<Tooltip
					contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }}
					itemStyle={{ color: "#e4e4e7", fontSize: "12px" }}
				/>
				<XAxis dataKey="turn" hide />
				<YAxis hide domain={["auto", "auto"]} />
				<Area
					type="monotone"
					dataKey="tokens"
					stroke="#818cf8"
					strokeWidth={2}
					fill="url(#tokenGradient)"
					isAnimationActive={false}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
});