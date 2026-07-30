import React, { useState, useCallback } from 'react';
import { CanvasErrorBoundary } from '../layout/CanvasErrorBoundary';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export interface AnalyticsContainerProps {
  data?: Array<{ turn: number; tokens: number }>;
}

export const AnalyticsContainer: React.FC<AnalyticsContainerProps> = ({ data }) => {
  const [renderKey, setRenderKey] = useState(0);

  const performHardReset = useCallback(() => {
    setRenderKey((prev) => prev + 1);
  }, []);

  return (
    <CanvasErrorBoundary onReset={performHardReset}>
      <div key={`analytics-session-${renderKey}`} className="w-full h-full">
        <AnalyticsDashboard data={data} />
      </div>
    </CanvasErrorBoundary>
  );
};