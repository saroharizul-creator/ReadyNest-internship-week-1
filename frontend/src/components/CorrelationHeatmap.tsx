import React, { useState } from 'react';

interface CorrelationHeatmapProps {
  matrix: Record<string, Record<string, number>>;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ matrix }) => {
  const columns = Object.keys(matrix);
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string; val: number } | null>(null);

  // Helper to determine cell color based on correlation strength
  const getCellColorStyle = (val: number) => {
    // val goes from -1 to 1
    if (val === undefined || val === null) return { backgroundColor: 'transparent', color: '#94A3B8' };
    
    const absVal = Math.abs(val);
    if (val >= 0) {
      // Positive correlation -> Indigo
      // From transparent to full indigo
      return {
        backgroundColor: `rgba(99, 102, 241, ${absVal * 0.95})`,
        color: absVal > 0.5 ? '#FFFFFF' : '#1E293B',
      };
    } else {
      // Negative correlation -> Rose/Red
      return {
        backgroundColor: `rgba(244, 63, 94, ${absVal * 0.95})`,
        color: absVal > 0.5 ? '#FFFFFF' : '#1E293B',
      };
    }
  };

  if (columns.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-6">No correlation matrix data available.</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 premium-shadow">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-800 tracking-tight">Correlation Matrix Heatmap</h4>
        
        {/* Simple Legend */}
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-500" />
            <span className="text-slate-500">Negative (-1)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-slate-100 border border-slate-200" />
            <span className="text-slate-500">None (0)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-indigo-500" />
            <span className="text-slate-500">Positive (+1)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar pt-2">
        <div className="min-w-[480px]">
          {/* Top Column Labels */}
          <div className="grid" style={{ gridTemplateColumns: `100px repeat(${columns.length}, 1fr)` }}>
            <div className="h-10" /> {/* Empty corner cell */}
            {columns.map(col => (
              <div 
                key={col} 
                className="h-10 flex items-end justify-center pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center truncate px-1"
                title={col}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {columns.map(rowName => (
            <div 
              key={rowName}
              className="grid" 
              style={{ gridTemplateColumns: `100px repeat(${columns.length}, 1fr)` }}
            >
              {/* Row Left Label */}
              <div 
                className="h-10 flex items-center justify-end pr-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate"
                title={rowName}
              >
                {rowName}
              </div>

              {/* Grid Cells */}
              {columns.map(colName => {
                const val = matrix[rowName]?.[colName] ?? 0;
                const cellStyle = getCellColorStyle(val);
                const isHovered = hoveredCell?.row === rowName && hoveredCell?.col === colName;

                return (
                  <div
                    key={colName}
                    onMouseEnter={() => setHoveredCell({ row: rowName, col: colName, val })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={cellStyle}
                    className={`h-10 flex items-center justify-center text-xs font-mono font-bold border border-white cursor-crosshair transition-all duration-100 ${
                      isHovered ? 'scale-110 shadow-md z-10 rounded border-slate-300' : ''
                    }`}
                  >
                    {val !== undefined ? val.toFixed(2) : '-'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Floating cell detail footer */}
      <div className="h-6 flex items-center justify-center">
        {hoveredCell ? (
          <p className="text-[10px] font-bold text-slate-700 bg-slate-100 px-3.5 py-1 rounded-full border border-slate-200 transition-all flex items-center gap-1.5 animate-fade-in">
            <span className={`h-1.5 w-1.5 rounded-full ${hoveredCell.val > 0.5 ? 'bg-indigo-500' : hoveredCell.val < -0.5 ? 'bg-rose-500' : 'bg-slate-400'}`} />
            Correlation between <span className="text-indigo-650">{hoveredCell.row}</span> and <span className="text-indigo-650">{hoveredCell.col}</span>: <span className="font-mono text-slate-900">{hoveredCell.val.toFixed(3)}</span>
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 italic">Hover over cells to inspect correlation values.</p>
        )}
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
