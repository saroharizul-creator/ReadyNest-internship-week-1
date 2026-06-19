import React from 'react';

interface BoxPlotProps {
  min: number;
  q1: number;
  median: number;
  mean: number;
  q3: number;
  max: number;
  columnName: string;
}

const BoxPlotRenderer: React.FC<BoxPlotProps> = ({
  min,
  q1,
  median,
  mean,
  q3,
  max,
  columnName,
}) => {
  // Normalize values to 5% - 95% range for SVG plotting
  const range = max - min;
  const normalize = (val: number) => {
    if (range === 0) return 50;
    return 5 + ((val - min) / range) * 90;
  };

  const xMin = normalize(min);
  const xQ1 = normalize(q1);
  const xMedian = normalize(median);
  const xMean = normalize(mean);
  const xQ3 = normalize(q3);
  const xMax = normalize(max);

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-800 capitalize tracking-tight">Box Plot Distribution: {columnName}</h4>
        <span className="text-[10px] font-bold text-slate-450 font-mono">Range: {min.toFixed(1)} to {max.toFixed(1)}</span>
      </div>

      <div className="relative h-20 w-full flex items-center">
        <svg className="w-full h-full" overflow="visible">
          {/* Whiskers line */}
          <line
            x1={`${xMin}%`}
            y1="50%"
            x2={`${xMax}%`}
            y2="50%"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Min Tick */}
          <line
            x1={`${xMin}%`}
            y1="30%"
            x2={`${xMin}%`}
            y2="70%"
            stroke="#475569"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Max Tick */}
          <line
            x1={`${xMax}%`}
            y1="30%"
            x2={`${xMax}%`}
            y2="70%"
            stroke="#475569"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* IQR Box */}
          <rect
            x={`${xQ1}%`}
            y="25%"
            width={`${xQ3 - xQ1}%`}
            height="50%"
            fill="rgba(99, 102, 241, 0.15)"
            stroke="rgb(99, 102, 241)"
            strokeWidth="2.5"
            rx="4"
          />

          {/* Median line */}
          <line
            x1={`${xMedian}%`}
            y1="25%"
            x2={`${xMedian}%`}
            y2="75%"
            stroke="rgb(79, 70, 229)"
            strokeWidth="3.5"
          />

          {/* Mean indicator (Diamond) */}
          <polygon
            points={`
              ${xMean} 0,
              ${xMean + 0.8} 10,
              ${xMean} 20,
              ${xMean - 0.8} 10
            `}
            transform={`translate(0, 30)`}
            fill="#EF4444"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            className="hidden" // Just draw a simple circle for clean look
          />
          <circle
            cx={`${xMean}%`}
            cy="50%"
            r="5"
            fill="#EF4444"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Grid statistics legend */}
      <div className="grid grid-cols-5 gap-2.5 text-center mt-2">
        <div className="bg-white rounded-lg p-2 border border-slate-100/80 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Min</p>
          <p className="text-xs font-bold text-slate-700 font-mono mt-1">{min.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-100/80 shadow-sm">
          <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Q1 (25%)</p>
          <p className="text-xs font-bold text-slate-700 font-mono mt-1">{q1.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-100/80 shadow-sm border-l-2 border-l-indigo-550">
          <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Median</p>
          <p className="text-xs font-bold text-indigo-700 font-mono mt-1">{median.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-100/80 shadow-sm">
          <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Q3 (75%)</p>
          <p className="text-xs font-bold text-slate-700 font-mono mt-1">{q3.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-100/80 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Max</p>
          <p className="text-xs font-bold text-slate-700 font-mono mt-1">{max.toFixed(2)}</p>
        </div>
      </div>
      
      {/* Mean indicator text */}
      <div className="flex items-center gap-1.5 justify-center text-[10px] font-semibold text-slate-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span>Mean (Average) is <span className="font-bold font-mono text-slate-705">{mean.toFixed(2)}</span></span>
      </div>
    </div>
  );
};

export default BoxPlotRenderer;
