import React from 'react';
import { TokenTrendChart } from './TokenTrendChart';

export interface AnalyticsDashboardProps {
  data?: Array<{ turn: number; tokens: number }>;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] w-full mt-4 flex items-center justify-center">
        <span className="text-xs text-zinc-600">No token data available</span>
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full mt-4">
      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        Real-time Token Trend
      </h4>
      <TokenTrendChart data={data} />
    </div>
  );
};