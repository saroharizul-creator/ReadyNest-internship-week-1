import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchDatasets, 
  fetchDatasetSchema, 
  fetchColumnData, 
  setCurrentDataset, 
  fetchDatasetAnalytics,
  fetchFilteredAnalytics,
  setFilters,
  clearFilters
} from '../store/datasetSlice';
import { useLocation, useNavigate } from 'react-router-dom';
import FileUploader from '../components/FileUploader';
import DataTable from '../components/DataTable';
import ChartRenderer from '../components/ChartRenderer';
import { FileSpreadsheet, RefreshCw, Layers, BarChart3, Loader2, Database } from 'lucide-react';

import DatabaseImporter from '../components/DatabaseImporter';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentDataset, datasets, loading, schema, activeColumnName, activeColumnValues, columnLoading, filterColumn, filterValue, analytics } = useAppSelector((state) => state.datasets);
  const { user } = useAppSelector((state) => state.auth);

  const location = useLocation();
  const navigate = useNavigate();

  const fromPage = location.state?.fromPage;
  const fromPageLabel = location.state?.fromPageLabel;

  const [chartPresentation, setChartPresentation] = useState<'line' | 'area' | 'bar' | 'pie' | 'histogram'>('line');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'database'>('file');

  // Interactive filter slicer states
  const [selectedFilterCol, setSelectedFilterCol] = useState<string>('');
  const [selectedFilterVal, setSelectedFilterVal] = useState<string>('');

  const handleApplyFilter = (col: string, val: string) => {
    setSelectedFilterVal(val);
    if (val && currentDataset) {
      dispatch(setFilters({ column: col, value: val }));
      dispatch(fetchFilteredAnalytics({ datasetId: currentDataset.id, filterColumn: col, filterValue: val }));
    }
  };

  const handleClearFilter = () => {
    setSelectedFilterCol('');
    setSelectedFilterVal('');
    dispatch(clearFilters());
    if (currentDataset) {
      dispatch(fetchDatasetAnalytics(currentDataset.id));
    }
  };



  // Load datasets when component mounts
  useEffect(() => {
    dispatch(fetchDatasets());
  }, [dispatch]);

  // Load schema and analytics when active dataset changes
  useEffect(() => {
    if (currentDataset && currentDataset.status === 'cleaned') {
      dispatch(fetchDatasetSchema(currentDataset.id));
      dispatch(fetchDatasetAnalytics(currentDataset.id));
    }
  }, [currentDataset, dispatch]);

  // Automatically select the first numerical column when schema loads
  useEffect(() => {
    if (currentDataset && schema && schema.length > 0 && !activeColumnName) {
      const firstNumeric = schema.find(f => f.type === 'numeric');
      if (firstNumeric) {
        dispatch(fetchColumnData({ datasetId: currentDataset.id, columnName: firstNumeric.name }));
      } else {
        dispatch(fetchColumnData({ datasetId: currentDataset.id, columnName: schema[0].name }));
      }
    }
  }, [schema, currentDataset, activeColumnName, dispatch]);

  // Automatically select chart presentation based on column type
  useEffect(() => {
    if (activeColumnName && schema) {
      const field = schema.find(f => f.name === activeColumnName);
      if (field) {
        if (field.type === 'categorical') {
          setChartPresentation('bar');
        } else {
          setChartPresentation('line');
        }
      }
    }
  }, [activeColumnName, schema]);

  const handleRefresh = () => {
    dispatch(fetchDatasets());
    if (currentDataset) {
      dispatch(fetchDatasetSchema(currentDataset.id));
      dispatch(fetchDatasetAnalytics(currentDataset.id));
      if (activeColumnName) {
        dispatch(fetchColumnData({ datasetId: currentDataset.id, columnName: activeColumnName }));
      }
    }
  };

  const getUniqueFilename = (filePath: string | null) => {
    if (!filePath) return '';
    const parts = filePath.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return filename.replace('cleaned_', '');
  };

  const handleSelectColumn = (colName: string) => {
    if (currentDataset) {
      dispatch(fetchColumnData({ datasetId: currentDataset.id, columnName: colName }));
    }
  };

  const handleAnalyzeNewFile = () => {
    dispatch(setCurrentDataset(null));
  };

  // Helper to count numerical vs categorical columns
  const numericCount = schema ? schema.filter(f => f.type === 'numeric').length : 0;
  const categoricalCount = schema ? schema.filter(f => f.type === 'categorical').length : 0;

  // Render main dashboard when an active dataset exists
  if (currentDataset) {
    const uniqueFilename = getUniqueFilename(currentDataset.file_path);

    const activeField = schema?.find(f => f.name === activeColumnName);
    const isCategorical = activeField?.type === 'categorical';

    let chartLabels: string[] = [];
    let chartValues: number[] = [];
    let chartType: 'line' | 'bar' | 'pie' = 'line';

    if (isCategorical) {
      // Aggregate counts for categorical column on the fly
      const countsMap: Record<string, number> = {};
      activeColumnValues?.forEach(v => {
        const strVal = v === null || v === undefined ? 'Null/Missing' : String(v).trim();
        countsMap[strVal] = (countsMap[strVal] || 0) + 1;
      });
      // Sort categories by frequency descending and limit to top 15
      const sortedCategories = Object.entries(countsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
      chartLabels = sortedCategories.map(item => item[0]);
      chartValues = sortedCategories.map(item => item[1]);

      // Map presentation selection to ChartRenderer types
      if (chartPresentation === 'pie') {
        chartType = 'pie';
      } else if (chartPresentation === 'line') {
        chartType = 'line';
      } else {
        chartType = 'bar'; // Default to bar
      }
    } else {
      // Numerical Column
      if (chartPresentation === 'histogram') {
        // Use pre-computed histogram from backend analytics
        const activeStats = activeColumnName && analytics?.summary_statistics ? analytics.summary_statistics[activeColumnName] : null;
        if (activeStats?.histogram) {
          chartLabels = activeStats.histogram.bins;
          chartValues = activeStats.histogram.counts;
        }
        chartType = 'bar'; // Histogram is rendered using Bar element
      } else {
        // Line, Area, Bar sequence plot
        chartLabels = activeColumnValues ? activeColumnValues.map((_, i) => (i + 1).toString()) : [];
        chartValues = activeColumnValues ? activeColumnValues.map(v => Number(v) || 0) : [];
        
        if (chartPresentation === 'bar') {
          chartType = 'bar';
        } else {
          chartType = 'line';
        }
      }
    }

    return (
      <div className="space-y-6">
        {/* Intended Destination Alert/Continue banner */}
        {fromPage && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between premium-shadow animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-blue-900 font-sans">Dataset Loaded Successfully</p>
                <p className="text-[11px] text-blue-700 mt-0.5 font-medium">
                  Would you like to proceed back to **{fromPageLabel}** with this dataset selection?
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(fromPage, { state: { ...location.state, fromPage: undefined, fromPageLabel: undefined } })}
              className="rounded-xl bg-blue-600 hover:bg-blue-750 active:bg-blue-800 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md cursor-pointer text-center"
            >
              Apply & Continue
            </button>
          </div>
        )}

        {/* Active Dataset File Details Header */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between premium-shadow">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 border border-blue-100/50 shadow-sm flex items-center justify-center">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">{currentDataset.filename}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5 tracking-wide">{uniqueFilename}</p>
            </div>
          </div>
          <button
            onClick={handleAnalyzeNewFile}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            Analyze New File
          </button>
        </div>


        {/* Dynamic Slicer / Filter Panel */}
        {schema && schema.some(f => f.type === 'categorical') && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between premium-shadow animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-650 border border-indigo-100/50 shadow-sm flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Interactive Data Slicer</h3>
                <p className="text-[11px] text-slate-400 font-medium">Re-slice and filter the entire dashboard by categorical variables.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Category Column:</span>
                <select
                  value={selectedFilterCol}
                  onChange={(e) => {
                    setSelectedFilterCol(e.target.value);
                    setSelectedFilterVal('');
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose Column --</option>
                  {schema.filter(f => f.type === 'categorical').map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>

              {selectedFilterCol && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs text-slate-500 font-bold">Value:</span>
                  <select
                    value={selectedFilterVal}
                    onChange={(e) => handleApplyFilter(selectedFilterCol, e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Value --</option>
                    {analytics?.category_analysis?.[selectedFilterCol]?.map((item: any) => (
                      <option key={item.category} value={item.category}>{item.category}</option>
                    ))}
                  </select>
                </div>
              )}

              {(filterColumn || filterValue) && (
                <button
                  onClick={handleClearFilter}
                  className="rounded-lg bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Clear Slicer
                </button>
              )}
            </div>
          </div>
        )}


        {/* 4-KPI Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col justify-between premium-shadow">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Rows Detected</span>
            <p className="text-2xl font-bold text-slate-800 mt-2 font-mono">
              {currentDataset.row_count?.toLocaleString() ?? '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col justify-between premium-shadow">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Columns Detected</span>
            <p className="text-2xl font-bold text-slate-800 mt-2 font-mono">
              {currentDataset.col_count ?? '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col justify-between premium-shadow">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Numerical Columns</span>
            <p className="text-2xl font-bold text-blue-600 mt-2 font-mono">
              {schema ? numericCount : '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col justify-between premium-shadow">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Categorical Columns</span>
            <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">
              {schema ? categoricalCount : '-'}
            </p>
          </div>
        </div>

        {/* Bottom Workspace Split (Schema Navigator & Visual Analyzer) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Schema Navigator Column */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 h-full flex flex-col premium-shadow">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Layers className="h-4.5 w-4.5 text-blue-500" />
                Schema Navigator
              </h3>
              
              <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1.5 custom-scrollbar">
                {loading && !schema ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                    <p className="text-xs text-slate-500 mt-2">Loading schema...</p>
                  </div>
                ) : schema && schema.length > 0 ? (
                  schema.map((field) => {
                    const isSelected = activeColumnName === field.name;
                    return (
                      <div
                        key={field.name}
                        onClick={() => handleSelectColumn(field.name)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-155 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 text-blue-750 font-semibold shadow-sm'
                            : 'border-slate-100 bg-slate-50/30 text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            field.type === 'numeric' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`} />
                          <span className="text-xs tracking-tight truncate max-w-[130px]">
                            {field.name}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${
                          field.type === 'numeric'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {field.type}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-450 text-center py-8">No schema columns found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Visual Analyzer Column */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 h-full flex flex-col justify-between premium-shadow">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="h-4.5 w-4.5 text-blue-500" />
                    Visual Analyzer
                  </h3>
                  
                  {/* Presentation Type Toggle Button Group */}
                  <div className="flex rounded-lg border border-slate-100 overflow-hidden p-0.5 bg-slate-55">
                    {isCategorical ? (
                      <>
                        <button
                          onClick={() => setChartPresentation('bar')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            chartPresentation === 'bar'
                              ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm font-bold'
                              : 'text-slate-455 hover:text-slate-700'
                          }`}
                        >
                          Bar
                        </button>
                        <button
                          onClick={() => setChartPresentation('pie')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            chartPresentation === 'pie'
                              ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm font-bold'
                              : 'text-slate-455 hover:text-slate-700'
                          }`}
                        >
                          Pie
                        </button>
                        <button
                          onClick={() => setChartPresentation('line')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            chartPresentation === 'line'
                              ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm font-bold'
                              : 'text-slate-455 hover:text-slate-700'
                          }`}
                        >
                          Line
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setChartPresentation('line')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            chartPresentation === 'line'
                              ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm font-bold'
                              : 'text-slate-455 hover:text-slate-700'
                          }`}
                        >
                          Line
                        </button>
                        <button
                          onClick={() => setChartPresentation('area')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            chartPresentation === 'area'
                              ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm font-bold'
                              : 'text-slate-455 hover:text-slate-700'
                          }`}
                        >
                          Area
                        </button>
                        <button
                          onClick={() => setChartPresentation('bar')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            chartPresentation === 'bar'
                              ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm font-bold'
                              : 'text-slate-455 hover:text-slate-700'
                          }`}
                        >
                          Bar
                        </button>
                        <button
                          onClick={() => setChartPresentation('histogram')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            chartPresentation === 'histogram'
                              ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm font-bold'
                              : 'text-slate-455 hover:text-slate-700'
                          }`}
                        >
                          Histogram
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-slate-400 mb-6">
                  Rendering {isCategorical ? 'categorical' : 'numeric'} column:{' '}
                  <span className="font-semibold text-slate-600">{activeColumnName || '-'}</span>
                </p>
              </div>

              {/* Chart Plot Area */}
              <div className="flex-1 flex items-center justify-center min-h-[260px] bg-slate-55/50 rounded-2xl border border-slate-100 p-4">
                {columnLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-xs text-slate-500 font-semibold">Reading column metrics...</p>
                  </div>
                ) : activeColumnValues && activeColumnValues.length > 0 ? (
                  chartPresentation === 'histogram' && chartValues.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-slate-400 font-medium">No histogram analytics computed for this column.</p>
                    </div>
                  ) : (
                    <ChartRenderer
                      type={chartType}
                      labels={chartLabels}
                      values={chartValues}
                      labelName={
                        chartPresentation === 'histogram'
                          ? 'Frequency'
                          : (isCategorical ? 'Count' : (activeColumnName || 'Values'))
                      }
                      fill={chartPresentation === 'area'}
                    />
                  )
                ) : (
                  <p className="text-xs text-slate-400">Select a column from the navigator to explore visualizations.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback layout (Default Upload/File List view)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-805 tracking-tight">Hello, {user?.email ? user.email.split('@')[0] : 'Analyst'}</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Welcome to your data analytics workspace. Upload and inspect datasets.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/10 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Grid of File Uploader and Dataset List */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 premium-shadow">
            <div className="flex border-b border-slate-100 pb-3 mb-5 gap-4">
              <button
                onClick={() => setUploadMethod('file')}
                className={`pb-1.5 text-sm font-bold border-b-2 cursor-pointer transition-all ${
                  uploadMethod === 'file'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Local File
              </button>
              <button
                onClick={() => setUploadMethod('database')}
                className={`pb-1.5 text-sm font-bold border-b-2 cursor-pointer transition-all ${
                  uploadMethod === 'database'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                SQL Database
              </button>
            </div>

            {uploadMethod === 'file' ? <FileUploader /> : <DatabaseImporter />}
          </div>
        </div>


        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 h-full flex flex-col justify-between premium-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-805 tracking-tight">My Datasets</h2>
                <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-600 shadow-sm">
                  {datasets.length} Total
                </span>
              </div>
              <DataTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
