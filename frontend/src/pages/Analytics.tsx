import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store';
import ChartRenderer from '../components/ChartRenderer';
import BoxPlotRenderer from '../components/BoxPlotRenderer';
import CorrelationHeatmap from '../components/CorrelationHeatmap';
import api from '../utils/api';
import { BarChart3, AlertCircle, PieChart, FileSpreadsheet, Layers, GitCompare, Loader2 } from 'lucide-react';


const Analytics: React.FC = () => {
  const { currentDataset, analytics, loading } = useAppSelector((state) => state.datasets);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Local states for scatter analysis
  const [scatterX, setScatterX] = useState<string>('');
  const [scatterY, setScatterY] = useState<string>('');
  const [scatterPoints, setScatterPoints] = useState<{x: number; y: number}[]>([]);
  const [scatterLoading, setScatterLoading] = useState<boolean>(false);
  const [scatterError, setScatterError] = useState<string | null>(null);

  // Tab state for Univariate Visualization: 'histogram' | 'boxplot' | 'summary'
  const [univariateTab, setUnivariateTab] = useState<'histogram' | 'boxplot' | 'summary'>('histogram');

  // Default scatter selection
  const numericColumns = analytics && analytics.summary_statistics ? Object.keys(analytics.summary_statistics) : [];

  useEffect(() => {
    if (numericColumns.length > 1) {
      setScatterX(numericColumns[0]);
      setScatterY(numericColumns[1]);
    } else if (numericColumns.length === 1) {
      setScatterX(numericColumns[0]);
      setScatterY(numericColumns[0]);
    }
  }, [currentDataset, analytics]);

  const fetchScatter = async () => {
    if (!currentDataset || !scatterX || !scatterY) return;
    setScatterLoading(true);
    setScatterError(null);
    try {
      const response = await api.get(`/datasets/${currentDataset.id}/scatter/${scatterX}/${scatterY}`);
      setScatterPoints(response.data.points || []);
    } catch (err: any) {
      setScatterError(err.response?.data?.detail || 'Failed to fetch scatter data.');
    } finally {
      setScatterLoading(false);
    }
  };

  // Trigger scatter data load on X or Y choice changes
  useEffect(() => {
    if (currentDataset && scatterX && scatterY) {
      fetchScatter();
    }
  }, [scatterX, scatterY]);


  if (!currentDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl min-h-[400px]">
        <BarChart3 className="h-16 w-16 text-slate-350" />
        <h2 className="text-lg font-bold text-slate-700 mt-4 font-sans">No Dataset Selected</h2>
        <p className="text-sm text-slate-500 mt-2 text-center max-w-sm">
          Select or upload a dataset on the Dashboard tab to unlock advanced graphs and correlation matrices.
        </p>
        <Link
          to="/"
          state={{ fromPage: '/analytics', fromPageLabel: 'Advanced Analytics' }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/10 transition-colors cursor-pointer"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
        <p className="text-sm text-slate-650 mt-4">Generating statistical insights...</p>
      </div>
    );
  }

  if (!analytics || !analytics.summary_statistics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl min-h-[400px]">
        <AlertCircle className="h-16 w-16 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-700 mt-4">No Analytics Available</h2>
        <p className="text-sm text-slate-500 mt-2 text-center">
          The selected dataset status is "{currentDataset.status}". Ensure the dataset was successfully preprocessed without error.
        </p>
      </div>
    );
  }

  // Set default column if none selected
  const activeCol = selectedColumn || numericColumns[0] || '';

  // Get data for selected column chart
  const activeStats = activeCol ? analytics.summary_statistics[activeCol] : null;
  const chartLabels = activeStats ? ['Min', 'Q1', 'Median', 'Mean', 'Q3', 'Max'] : [];
  const chartValues = activeStats ? [
    activeStats.min,
    activeStats.q1,
    activeStats.median,
    activeStats.mean,
    activeStats.q3,
    activeStats.max
  ].map(v => v || 0) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Advanced Analytics</h1>
        <p className="text-sm text-slate-500">
          Automated summary statistics and charting for <span className="font-semibold text-slate-700">{currentDataset.filename}</span>
        </p>
      </div>

      {/* Grid: Statistics Table & Chart Selection */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Descriptive Stats Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-500" /> Descriptive Statistics
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-3">Feature (Column)</th>
                  <th className="p-3">Mean</th>
                  <th className="p-3">Median</th>
                  <th className="p-3">Std Dev</th>
                  <th className="p-3">Min</th>
                  <th className="p-3">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {numericColumns.map((col) => {
                  const stat = analytics.summary_statistics?.[col];
                  return (
                    <tr
                      key={col}
                      onClick={() => setSelectedColumn(col)}
                      className={`cursor-pointer hover:bg-slate-50 ${activeCol === col ? 'bg-primary-50/30' : ''}`}
                    >
                      <td className="p-3 font-semibold text-slate-755">{col}</td>
                      <td className="p-3 text-slate-600">{stat?.mean?.toFixed(2) ?? '-'}</td>
                      <td className="p-3 text-slate-600">{stat?.median?.toFixed(2) ?? '-'}</td>
                      <td className="p-3 text-slate-600">{stat?.std?.toFixed(2) ?? '-'}</td>
                      <td className="p-3 text-slate-600">{stat?.min?.toFixed(2) ?? '-'}</td>
                      <td className="p-3 text-slate-600">{stat?.max?.toFixed(2) ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visualisation Card */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary-500" /> Univariate Analysis
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Select Column
                </label>
                <select
                  value={activeCol}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500"
                >
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Tab Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  View Mode
                </label>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setUnivariateTab('histogram')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      univariateTab === 'histogram'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    Histogram
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnivariateTab('boxplot')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      univariateTab === 'boxplot'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    Box Plot
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnivariateTab('summary')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      univariateTab === 'summary'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    Stats
                  </button>
                </div>
              </div>

              {univariateTab === 'summary' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Chart Type
                  </label>
                  <div className="flex gap-2">
                    {(['bar', 'line', 'pie'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setChartType(type)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                          chartType === type
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            {activeCol ? (
              univariateTab === 'histogram' ? (
                activeStats?.histogram ? (
                  <ChartRenderer
                    type="bar"
                    title={`${activeCol} Distribution Histogram`}
                    labels={activeStats.histogram.bins}
                    values={activeStats.histogram.counts}
                    labelName="Frequency"
                  />
                ) : (
                  <p className="text-xs text-slate-400 text-center py-10">No histogram data available. Make sure the dataset processed correctly.</p>
                )
              ) : univariateTab === 'boxplot' ? (
                <BoxPlotRenderer
                  min={activeStats.min}
                  q1={activeStats.q1}
                  median={activeStats.median}
                  mean={activeStats.mean}
                  q3={activeStats.q3}
                  max={activeStats.max}
                  columnName={activeCol}
                />
              ) : (
                <ChartRenderer
                  type={chartType}
                  title={`${activeCol} Summary Metrics`}
                  labels={chartLabels}
                  values={chartValues}
                  labelName={activeCol}
                />
              )
            ) : (
              <p className="text-sm text-slate-400 text-center">No numerical column selected</p>
            )}
          </div>
        </div>

      </div>

      {/* Categorical Breakdown & Outlier Info Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Outliers summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" /> Outlier Analysis (IQR method)
          </h2>
          {analytics.outliers_detected && Object.keys(analytics.outliers_detected).length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Columns showing values beyond 1.5x IQR boundaries:</p>
              <div className="divide-y divide-slate-150">
                {Object.entries(analytics.outliers_detected).map(([col, details]: [string, any]) => (
                  <div key={col} className="flex justify-between py-2.5 text-sm">
                    <span className="font-semibold text-slate-700">{col}</span>
                    <span className="text-slate-600">
                      {details.count} outlier records ({details.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 font-semibold">No significant outliers detected.</p>
              <p className="text-xs text-slate-400 mt-1">Data is well clustered within standard distributions.</p>
            </div>
          )}
        </div>

        {/* Category Breakdown (from service category_analysis) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" /> Categorical Breakdowns
          </h2>
          {analytics.category_analysis && Object.keys(analytics.category_analysis).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(analytics.category_analysis).map(([catCol, categories]: [string, any]) => (
                <div key={catCol}>
                  <p className="text-sm font-bold text-slate-700 capitalize border-b border-slate-100 pb-1.5 mb-2.5">
                    Column: {catCol}
                  </p>
                  <div className="space-y-2.5">
                    {categories.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-750 font-medium truncate max-w-xs">{item.category}</span>
                        <div className="flex gap-4 text-xs">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            Count: {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 font-semibold">No categorical columns found.</p>
              <p className="text-xs text-slate-400 mt-1">Analysis requires text or categorical feature types.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bivariate Analysis Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Scatter Plot Analyzer */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-indigo-500" /> Bivariate Scatter Plot
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  X-Axis Column (Numeric)
                </label>
                <select
                  value={scatterX}
                  onChange={(e) => setScatterX(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500"
                >
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Y-Axis Column (Numeric)
                </label>
                <select
                  value={scatterY}
                  onChange={(e) => setScatterY(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500"
                >
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            {scatterLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-500 mt-2 font-semibold">Fetching coordinate points...</p>
              </div>
            ) : scatterError ? (
              <div className="text-xs text-rose-600 bg-rose-50/60 p-3 rounded-lg border border-rose-100 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{scatterError}</span>
              </div>
            ) : scatterPoints && scatterPoints.length > 0 ? (
              <ChartRenderer
                type="scatter"
                title={`${scatterX} vs ${scatterY}`}
                scatterPoints={scatterPoints}
                labelName="Data Points"
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">Select columns to plot distributions.</p>
            )}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="lg:col-span-2">
          {analytics.correlation_matrix ? (
            <CorrelationHeatmap matrix={analytics.correlation_matrix} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-center items-center min-h-[300px]">
              <AlertCircle className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">No correlation matrix calculations found.</p>
            </div>
          )}
        </div>
      </div>
    </div>

  );
};

export default Analytics;
