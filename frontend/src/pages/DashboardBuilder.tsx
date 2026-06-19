import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { Link } from 'react-router-dom';
import { fetchDashboards, createDashboard, deleteDashboard, setActiveDashboard } from '../store/dashboardSlice';
import ChartRenderer from '../components/ChartRenderer';
import api from '../utils/api';
import { LayoutGrid, Plus, Save, Trash2, Database, AlertCircle, BarChart3 } from 'lucide-react';

interface Widget {
  id: string;
  type: 'kpi' | 'chart';
  title: string;
  column: string;
  metric?: 'mean' | 'median' | 'std' | 'min' | 'max' | 'count'; // for kpi
  chartType?: 'bar' | 'line' | 'pie'; // for chart
  isCategorical?: boolean; // for chart category breakdowns
}

const DashboardBuilder: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentDataset, analytics } = useAppSelector((state) => state.datasets);
  const { dashboards, activeDashboard } = useAppSelector((state) => state.dashboards);

  const [newDashName, setNewDashName] = useState('');
  const [showNewDashModal, setShowNewDashModal] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Widget Form States
  const [widgetType, setWidgetType] = useState<'kpi' | 'chart'>('kpi');
  const [widgetTitle, setWidgetTitle] = useState('');
  const [selectedCol, setSelectedCol] = useState('');
  const [kpiMetric, setKpiMetric] = useState<'mean' | 'median' | 'std' | 'min' | 'max' | 'count'>('mean');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  useEffect(() => {
    dispatch(fetchDashboards());
  }, [dispatch]);

  // Load widgets when active dashboard changes
  useEffect(() => {
    if (activeDashboard && activeDashboard.layout_data?.widgets) {
      setWidgets(activeDashboard.layout_data.widgets as Widget[]);
    } else {
      setWidgets([]);
    }
  }, [activeDashboard]);

  if (!currentDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl min-h-[400px]">
        <LayoutGrid className="h-16 w-16 text-slate-350" />
        <h2 className="text-lg font-bold text-slate-700 mt-4 font-sans">No Dataset Selected</h2>
        <p className="text-sm text-slate-500 mt-2 text-center max-w-sm">
          Select or upload a dataset on the Dashboard tab to unlock custom dashboard layouts.
        </p>
        <Link
          to="/"
          state={{ fromPage: '/builder', fromPageLabel: 'Dashboard Builder' }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/10 transition-colors cursor-pointer"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (!analytics || !analytics.summary_statistics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-cream-100/40 border border-sage-300/30 rounded-xl min-h-[400px] dark:border-slate-850 dark:bg-slate-900/40">
        <AlertCircle className="h-16 w-16 text-primary-350 dark:text-slate-550" />
        <h2 className="text-lg font-bold text-primary-700 dark:text-white mt-4">Analytics Data Missing</h2>
        <p className="text-sm text-primary-500 dark:text-slate-400 mt-2 text-center">
          The selected dataset must be successfully preprocessed. Check the status of "{currentDataset.filename}" on the Dashboard.
        </p>
      </div>
    );
  }

  const numericCols = Object.keys(analytics.summary_statistics);
  const categoricalCols = analytics.category_analysis ? Object.keys(analytics.category_analysis) : [];
  const allColumns = [...numericCols, ...categoricalCols];

  // Set default column in form if empty
  if (!selectedCol && allColumns.length > 0) {
    setSelectedCol(allColumns[0]);
  }

  const handleCreateDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashName.trim()) return;
    try {
      await dispatch(createDashboard({
        name: newDashName,
        layout_data: { widgets: [] }
      })).unwrap();
      setNewDashName('');
      setShowNewDashModal(false);
    } catch (err: any) {
      alert("Failed to create dashboard: " + err);
    }
  };

  const handleDeleteDashboard = async () => {
    if (!activeDashboard) return;
    if (window.confirm(`Are you sure you want to delete "${activeDashboard.name}"?`)) {
      try {
        await dispatch(deleteDashboard(activeDashboard.id)).unwrap();
      } catch (err) {
        alert("Failed to delete dashboard");
      }
    }
  };

  const handleAddWidget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCol) return;

    const isCategorical = categoricalCols.includes(selectedCol);
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: widgetTitle.trim() || `${selectedCol} ${widgetType === 'kpi' ? kpiMetric.toUpperCase() : 'Chart'}`,
      column: selectedCol,
      isCategorical
    };

    if (widgetType === 'kpi') {
      if (isCategorical) {
        alert("KPI widget can only be created for numeric columns.");
        return;
      }
      newWidget.metric = kpiMetric;
    } else {
      newWidget.chartType = chartType;
    }

    setWidgets([...widgets, newWidget]);
    // Reset form
    setWidgetTitle('');
  };

  const handleDeleteWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const handleSaveLayout = async () => {
    if (!activeDashboard) return;
    setIsSaving(true);
    try {
      await api.post('/dashboards', {
        name: activeDashboard.name,
        layout_data: { widgets }
      });
      // Refresh list to sync with DB
      dispatch(fetchDashboards());
      alert("Dashboard layout saved successfully!");
    } catch (err: any) {
      alert("Failed to save layout: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const renderWidgetContent = (widget: Widget) => {
    if (widget.type === 'kpi') {
      const stats = analytics.summary_statistics?.[widget.column];
      if (!stats) return <p className="text-primary-500/70 text-xs">No data available</p>;
      const value = stats[widget.metric || 'mean'];
      const formattedValue = typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';
      
      return (
        <div className="mt-2">
          <p className="text-3xl font-bold text-primary-700 dark:text-white">{formattedValue}</p>
          <p className="text-xs text-primary-500 font-semibold uppercase tracking-wide mt-1.5">{widget.metric} value of {widget.column}</p>
        </div>
      );
    }

    // Chart widget rendering
    if (widget.isCategorical) {
      const catData = analytics.category_analysis?.[widget.column];
      if (!catData || !Array.isArray(catData)) return <p className="text-primary-500/70 text-xs">No category breakdown found</p>;
      const labels = catData.map(item => item.category);
      const values = catData.map(item => item.count);

      return (
        <div className="mt-3">
          <ChartRenderer
            type={widget.chartType || 'bar'}
            labels={labels}
            values={values}
            labelName="Record Count"
          />
        </div>
      );
    } else {
      // Numerical column chart (plot distribution stats)
      const stats = analytics.summary_statistics?.[widget.column];
      if (!stats) return <p className="text-primary-500/70 text-xs">No statistic data available</p>;
      const labels = ['Min', 'Q1', 'Median', 'Mean', 'Q3', 'Max'];
      const values = [stats.min, stats.q1, stats.median, stats.mean, stats.q3, stats.max].map(v => v || 0);

      return (
        <div className="mt-3">
          <ChartRenderer
            type={widget.chartType || 'bar'}
            labels={labels}
            values={values}
            labelName={widget.column}
          />
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-700 dark:text-white">Custom Dashboard Builder</h1>
          <p className="text-sm text-primary-500 dark:text-slate-400">
            Build and arrange personalized metrics and visual layouts for <span className="font-semibold text-primary-700 dark:text-primary-300">{currentDataset.filename}</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowNewDashModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Dashboard
          </button>
        </div>
      </div>

      {/* Dashboard Selection toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sage-300/30 bg-cream-100/40 p-4 dark:border-slate-850 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-primary-500/70" />
          <span className="text-sm font-semibold text-primary-700 dark:text-slate-300">Select Custom View:</span>
          <select
            value={activeDashboard?.id || ''}
            onChange={(e) => {
              const dash = dashboards.find(d => d.id === parseInt(e.target.value));
              dispatch(setActiveDashboard(dash || null));
            }}
            className="rounded-lg border border-sage-300/60 bg-cream-500/50 px-3 py-1.5 text-sm font-medium outline-none focus:border-primary-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-350"
          >
            <option value="">-- Choose saved dashboard --</option>
            {dashboards.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {activeDashboard && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveLayout}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-sage-300/40 bg-cream-100/60 px-3.5 py-1.5 text-sm font-semibold text-primary-700 hover:bg-cream-500/70 active:bg-cream-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4 text-emerald-600 dark:text-emerald-450" />
              Save Changes
            </button>
            <button
              onClick={handleDeleteDashboard}
              className="flex items-center gap-1.5 rounded-lg border border-sage-300/40 bg-cream-100/60 px-3.5 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-slate-800 dark:bg-slate-850 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Delete View
            </button>
          </div>
        )}
      </div>

      {/* Active builder environment */}
      {activeDashboard ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          
          {/* Controls sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-xl border border-sage-300/30 bg-cream-100/40 p-5 dark:border-slate-850 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-primary-700 dark:text-white mb-4 flex items-center gap-2 border-b border-sage-300/20 pb-2">
                <Plus className="h-4.5 w-4.5 text-primary-500" /> Add New Widget
              </h3>
              
              <form onSubmit={handleAddWidget} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary-500/70 dark:text-slate-500 mb-1.5">
                    Widget Type
                  </label>
                  <div className="flex border border-sage-300/30 dark:border-slate-800 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setWidgetType('kpi')}
                      className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        widgetType === 'kpi' ? 'bg-primary-700 text-white' : 'bg-cream-500/40 text-primary-700 dark:bg-slate-850 dark:text-slate-400'
                      }`}
                    >
                      KPI Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setWidgetType('chart')}
                      className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        widgetType === 'chart' ? 'bg-primary-700 text-white' : 'bg-cream-500/40 text-primary-700 dark:bg-slate-850 dark:text-slate-400'
                      }`}
                    >
                      Chart
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary-500/70 dark:text-slate-500 mb-1.5">
                    Custom Title
                  </label>
                  <input
                    type="text"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    placeholder="e.g. Total Revenue"
                    className="w-full rounded-lg border border-sage-300/60 bg-cream-500/40 px-3 py-1.5 text-sm outline-none focus:border-primary-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary-500/70 dark:text-slate-500 mb-1.5">
                    Source Column
                  </label>
                  <select
                    value={selectedCol}
                    onChange={(e) => setSelectedCol(e.target.value)}
                    className="w-full rounded-lg border border-sage-300/60 bg-cream-500/40 px-3 py-1.5 text-sm outline-none focus:border-primary-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-355"
                  >
                    {widgetType === 'kpi' ? (
                      numericCols.map(col => <option key={col} value={col}>{col} (numeric)</option>)
                    ) : (
                      allColumns.map(col => (
                        <option key={col} value={col}>
                          {col} {categoricalCols.includes(col) ? '(categorical)' : '(numeric)'}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {widgetType === 'kpi' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-500/70 dark:text-slate-500 mb-1.5">
                      Statistic Metric
                    </label>
                    <select
                      value={kpiMetric}
                      onChange={(e) => setKpiMetric(e.target.value as any)}
                      className="w-full rounded-lg border border-sage-300/60 bg-cream-500/40 px-3 py-1.5 text-sm outline-none focus:border-primary-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-355"
                    >
                      <option value="mean">Mean (Average)</option>
                      <option value="median">Median</option>
                      <option value="std">Standard Deviation</option>
                      <option value="min">Minimum Value</option>
                      <option value="max">Maximum Value</option>
                      <option value="count">Count (Non-null)</option>
                    </select>
                  </div>
                )}

                {widgetType === 'chart' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-500/70 dark:text-slate-500 mb-1.5">
                      Chart Presentation
                    </label>
                    <div className="flex border border-sage-300/30 dark:border-slate-800 rounded-lg overflow-hidden">
                      {(['bar', 'line', 'pie'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setChartType(type)}
                          className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            chartType === type ? 'bg-primary-100 text-primary-800 dark:bg-primary-950/40 dark:text-primary-300 font-bold' : 'bg-cream-500/40 text-primary-700 dark:bg-slate-850 dark:text-slate-400'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary-700 text-white hover:bg-primary-600 transition-colors py-2 text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add to Layout
                </button>
              </form>
            </div>
          </div>

          {/* Grid area for active widgets */}
          <div className="lg:col-span-3">
            {widgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-cream-100/40 border border-sage-300/30 rounded-xl min-h-[300px] dark:border-slate-850 dark:bg-slate-900/40">
                <LayoutGrid className="h-10 w-10 text-primary-350 dark:text-slate-550" />
                <h3 className="font-bold text-primary-750 dark:text-slate-300 mt-3">Empty Dashboard Layout</h3>
                <p className="text-xs text-primary-500 dark:text-slate-400 mt-1 max-w-xs text-center">
                  Configure widgets using the sidebar forms on the left to layout your data insights panel.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className={`rounded-xl border border-sage-300/30 bg-cream-100/40 p-5 flex flex-col justify-between shadow-sm dark:border-slate-850 dark:bg-slate-900 ${
                      widget.type === 'chart' ? 'md:col-span-2' : 'col-span-1'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-sage-300/20 pb-2.5 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-primary-700 dark:text-white flex items-center gap-1.5">
                        {widget.type === 'kpi' ? (
                          <Database className="h-4.5 w-4.5 text-primary-500/70" />
                        ) : (
                          <BarChart3 className="h-4.5 w-4.5 text-primary-500/70" />
                        )}
                        {widget.title}
                      </h4>
                      <button
                        onClick={() => handleDeleteWidget(widget.id)}
                        className="rounded p-1 text-primary-500/70 hover:bg-red-50 hover:text-red-650 dark:text-slate-400 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove Widget"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex-1 mt-3">
                      {renderWidgetContent(widget)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-cream-100/40 border border-sage-300/30 rounded-xl min-h-[300px] dark:border-slate-850 dark:bg-slate-900/40">
          <LayoutGrid className="h-12 w-12 text-primary-350 dark:text-slate-550" />
          <h3 className="text-lg font-bold text-primary-700 dark:text-white mt-3 font-sans">No Custom Dashboard Open</h3>
          <p className="text-sm text-primary-500 dark:text-slate-400 mt-2 text-center">
            Select an existing custom dashboard view from the dropdown list or build a new configuration.
          </p>
        </div>
      )}

      {/* New Dashboard Modal */}
      {showNewDashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-cream-100 p-6 shadow-xl border border-sage-300/30 dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-base font-bold text-primary-700 dark:text-white mb-4 flex items-center gap-1.5">
              <LayoutGrid className="h-5 w-5 text-primary-500" /> Create Custom Dashboard
            </h3>
            
            <form onSubmit={handleCreateDashboard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary-500/70 dark:text-slate-500 mb-1.5">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  required
                  value={newDashName}
                  onChange={(e) => setNewDashName(e.target.value)}
                  placeholder="e.g. Sales Metrics View"
                  className="w-full rounded-lg border border-sage-300/60 bg-cream-500/40 px-3.5 py-2 text-sm outline-none focus:border-primary-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDashModal(false)}
                  className="rounded-lg border border-sage-300/40 bg-cream-100/60 px-4 py-2 text-xs font-bold text-primary-700 hover:bg-cream-500/50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-350 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-700 px-4 py-2 text-xs font-bold text-white hover:bg-primary-600 cursor-pointer"
                >
                  Create Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBuilder;
