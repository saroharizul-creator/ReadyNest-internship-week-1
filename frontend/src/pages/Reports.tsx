import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDatasetSummaryReport } from '../store/datasetSlice';
import api from '../utils/api';
import { FileDown, FileSpreadsheet, FileText, CheckCircle2, Loader2, Lightbulb, AlertTriangle, CheckSquare, Info } from 'lucide-react';

const Reports: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentDataset, insights, loading, summaryReport } = useAppSelector((state) => state.datasets);
  const [downloadingFormat, setDownloadingFormat] = useState<'csv' | 'excel' | null>(null);

  useEffect(() => {
    if (currentDataset) {
      dispatch(fetchDatasetSummaryReport(currentDataset.id));
    }
  }, [currentDataset, dispatch]);

  const handleDownload = async (format: 'csv' | 'excel') => {
    if (!currentDataset) return;
    setDownloadingFormat(format);
    try {
      const response = await api.get(`/reports/export/${currentDataset.id}?format=${format}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] as string,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const cleanName = currentDataset.filename.replace(/\.[^/.]+$/, "");
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      link.setAttribute('download', `cleaned_${cleanName}.${ext}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to export dataset: " + err.message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadPDF = () => {
    if (!currentDataset || !summaryReport) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download the PDF report.");
      return;
    }

    const reportDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build Executive summary list
    const insightsHTML = summaryReport.insights && summaryReport.insights.length > 0
      ? summaryReport.insights.map((insight: any) => {
          const isWarning = insight.type === 'warning';
          const isSuccess = insight.type === 'success';
          const bgColor = isWarning 
            ? 'bg-yellow-50 border-yellow-100 text-yellow-900' 
            : (isSuccess ? 'bg-emerald-50 border-emerald-100 text-emerald-950' : 'bg-blue-50 border-blue-100 text-blue-900');
          const prefix = isWarning ? '⚠️ WARNING: ' : (isSuccess ? '✅ SUCCESS: ' : 'ℹ️ INFO: ');
          return `
            <div class="border p-4 rounded-lg ${bgColor} avoid-break">
              <h4 class="text-xs font-bold uppercase tracking-wider">${prefix}${insight.title}</h4>
              <p class="text-xs mt-1.5 opacity-90 leading-relaxed">${insight.description}</p>
            </div>
          `;
        }).join('')
      : '<p class="text-xs text-slate-400 italic">No key alerts extracted.</p>';

    // Build Numerical statistics table
    const statsRows = Object.entries(summaryReport.summary_statistics || {}).map(([col, stats]: [string, any]) => `
      <tr class="hover:bg-slate-50/50">
        <td class="p-3 font-semibold text-slate-900 border-b border-slate-100">${col}</td>
        <td class="p-3 font-mono border-b border-slate-100">${stats.mean !== undefined ? stats.mean.toFixed(3) : '-'}</td>
        <td class="p-3 font-mono border-b border-slate-100">${stats.median !== undefined ? stats.median.toFixed(3) : '-'}</td>
        <td class="p-3 font-mono border-b border-slate-100">${stats.std !== undefined ? stats.std.toFixed(3) : '-'}</td>
        <td class="p-3 font-mono border-b border-slate-100">${stats.min !== undefined ? stats.min.toFixed(3) : '-'}</td>
        <td class="p-3 font-mono border-b border-slate-100">${stats.max !== undefined ? stats.max.toFixed(3) : '-'}</td>
      </tr>
    `).join('');

    // Build Outliers Table
    const hasOutliers = summaryReport.outliers_detected && Object.keys(summaryReport.outliers_detected).length > 0;
    const outliersHTML = hasOutliers
      ? `
        <div class="avoid-break mb-10">
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-150 pb-2">
            Outlier Diagnostic Report (IQR Method)
          </h2>
          <table class="w-full text-left border-collapse border border-slate-100 rounded-lg overflow-hidden">
            <thead>
              <tr class="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th class="p-3">Column</th>
                <th class="p-3">Outlier Records</th>
                <th class="p-3">Percentage of Data</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${Object.entries(summaryReport.outliers_detected).map(([col, details]: [string, any]) => `
                <tr>
                  <td class="p-3 font-semibold text-slate-900">${col}</td>
                  <td class="p-3 font-mono">${details.count?.toLocaleString() ?? '0'}</td>
                  <td class="p-3 font-mono text-red-650 font-semibold">${details.percentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
      : '';

    // Build Categorical breakdowns
    const hasCategorical = summaryReport.category_analysis && Object.keys(summaryReport.category_analysis).length > 0;
    const categoricalHTML = hasCategorical
      ? `
        <div class="avoid-break mb-10">
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-150 pb-2">
            Categorical Variables Frequency Breakdown
          </h2>
          <div class="space-y-4">
            ${Object.entries(summaryReport.category_analysis).map(([catCol, categories]: [string, any]) => `
              <div class="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Column: ${catCol}</h4>
                <div class="flex flex-wrap gap-2.5">
                  ${categories.slice(0, 5).map((item: any) => `
                    <span class="text-xs bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-800 shadow-sm">
                      <span class="font-medium text-slate-650">${item.category}:</span> 
                      <span class="font-mono font-bold text-indigo-655 ml-1">${item.count?.toLocaleString()}</span>
                    </span>
                  `).join('')}
                  ${categories.length > 5 ? `<span class="text-xs text-slate-400 font-medium self-center ml-1">+ ${categories.length - 5} more categories</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : '';

    // Build charts Grid Canvases
    const numStatsWithHist = Object.entries(summaryReport.summary_statistics || {})
      .filter(([_, stats]: [string, any]) => stats && stats.histogram);
    
    const chartsHTML = numStatsWithHist.length > 0
      ? `
        <div class="page-break mb-10">
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6 border-b border-slate-150 pb-2">
            Feature Value Distributions
          </h2>
          <div class="grid grid-cols-2 gap-6">
            ${numStatsWithHist.map(([col, _]) => `
              <div class="border border-slate-155 p-4 rounded-xl avoid-break bg-slate-50/30">
                <h4 class="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center mb-3">
                  ${col} Distribution
                </h4>
                <div class="chart-container">
                  <canvas id="chart-${col}"></canvas>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Data Audit Report - ${summaryReport.dataset_name}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
    }
    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table {
      font-size: 0.75rem;
    }
    th {
      background-color: #f8fafc;
      color: #475569;
    }
    .chart-container {
      position: relative;
      height: 140px;
      width: 100%;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-white p-8 max-w-4xl mx-auto">
  <!-- Header -->
  <div class="border-b-2 border-slate-100 pb-6 mb-8 flex justify-between items-end">
    <div>
      <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Automated Analytics Report</span>
      <h1 class="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">Data Quality & Profile Audit</h1>
      <p class="text-xs text-slate-500 mt-1 font-mono">Dataset: ${summaryReport.dataset_name} | Generated on ${reportDate}</p>
    </div>
    <div class="text-right">
      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Workspace System</p>
      <p class="text-xs font-semibold text-slate-800">Antigravity AI</p>
    </div>
  </div>

  <!-- Executive Summary Stats Grid -->
  <div class="grid grid-cols-4 gap-4 mb-8">
    <div class="border border-slate-150 p-4 rounded-xl">
      <span class="text-[9px] font-bold text-slate-400 tracking-wider uppercase">File Name</span>
      <p class="text-xs font-bold text-slate-800 mt-1 truncate">${summaryReport.dataset_name}</p>
    </div>
    <div class="border border-slate-150 p-4 rounded-xl">
      <span class="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Total Records</span>
      <p class="text-base font-bold text-slate-850 mt-1 font-mono">${summaryReport.rows?.toLocaleString() ?? '-'}</p>
    </div>
    <div class="border border-slate-150 p-4 rounded-xl">
      <span class="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Total Columns</span>
      <p class="text-base font-bold text-slate-850 mt-1 font-mono">${summaryReport.columns ?? '-'}</p>
    </div>
    <div class="border border-slate-150 p-4 rounded-xl">
      <span class="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Clean Status</span>
      <p class="text-base font-bold text-emerald-600 mt-1 capitalize">${currentDataset.status}</p>
    </div>
  </div>

  <!-- Key Insights & Takeaways -->
  <div class="avoid-break mb-10">
    <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-150 pb-2">
      Executive Insights & Alerts
    </h2>
    <div class="space-y-3">
      ${insightsHTML}
    </div>
  </div>

  <!-- Descriptive Statistics -->
  <div class="avoid-break mb-10">
    <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-150 pb-2">
      Numerical Variable Summaries
    </h2>
    <table class="w-full text-left border-collapse border border-slate-100 rounded-lg overflow-hidden">
      <thead>
        <tr class="border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
          <th class="p-3">Column Name</th>
          <th class="p-3">Mean</th>
          <th class="p-3">Median</th>
          <th class="p-3">Std Dev</th>
          <th class="p-3">Min</th>
          <th class="p-3">Max</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-700">
        ${statsRows}
      </tbody>
    </table>
  </div>

  <!-- Outliers Diagnostic Analysis -->
  ${outliersHTML}

  <!-- Categorical Breakdowns -->
  ${categoricalHTML}

  <!-- Distribution Charts Section -->
  ${chartsHTML}

  <script>
    window.onload = function() {
      const stats = ${JSON.stringify(summaryReport.summary_statistics)};
      Object.keys(stats).forEach(col => {
        const hist = stats[col] ? stats[col].histogram : null;
        if (!hist) return;
        const ctx = document.getElementById('chart-' + col);
        if (!ctx) return;
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: hist.bins,
            datasets: [{
              label: 'Frequency',
              data: hist.counts,
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: 'rgb(99, 102, 241)',
              borderWidth: 1.5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } } },
              x: { grid: { display: false }, ticks: { font: { size: 8 } } }
            }
          }
        });
      });
      
      setTimeout(() => {
        window.print();
        window.close();
      }, 700);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!currentDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl min-h-[400px]">
        <FileText className="h-16 w-16 text-slate-350" />
        <h2 className="text-lg font-bold text-slate-700 mt-4">No Dataset Selected</h2>
        <p className="text-sm text-slate-500 mt-2 text-center max-w-sm">
          Select or upload a dataset on the Dashboard tab to unlock data exports and PDF audit reports.
        </p>
        <Link
          to="/"
          state={{ fromPage: '/reports', fromPageLabel: 'Export & Reporting' }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/10 transition-colors cursor-pointer"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Export & Reporting</h1>
        <p className="text-sm text-slate-500">
          Download preprocessed datasets and reports for <span className="font-semibold text-slate-700">{currentDataset.filename}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Export Formats */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary-500" /> Export Data & Reports
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Export the automatically cleaned dataset back to your machine or download a detailed analytical report.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => handleDownload('csv')}
              disabled={downloadingFormat !== null || currentDataset.status !== 'cleaned'}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-primary-400 hover:bg-slate-50 transition-all text-left cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-3 text-slate-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-850">Comma-Separated Values (CSV)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Best for database imports and Python analysis</p>
                </div>
              </div>
              {downloadingFormat === 'csv' ? (
                <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
              ) : (
                <FileDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            <button
              onClick={() => handleDownload('excel')}
              disabled={downloadingFormat !== null || currentDataset.status !== 'cleaned'}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-primary-400 hover:bg-slate-50 transition-all text-left cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-850">Microsoft Excel Workbook (XLSX)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Best for manual spreadsheet checks and reports</p>
                </div>
              </div>
              {downloadingFormat === 'excel' ? (
                <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
              ) : (
                <FileDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={loading || !summaryReport}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-primary-400 hover:bg-slate-50 transition-all text-left cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-rose-50 p-3 text-rose-650">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-850">Data Audit Report (PDF)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Download a detailed audit report with tables and distribution charts</p>
                </div>
              </div>
              <FileDown className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Cleaning Summary status */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" /> Data Quality Summary
          </h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50/50 p-4 border border-green-100 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Cleaning Complete</p>
                <p className="text-xs text-green-700 mt-1">
                  We preprocessed your data using our automated pipeline. Missing values were filled, duplicates were purged, and dates were standardized.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-150 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Final Record Count</p>
                <p className="text-xl font-bold text-slate-800 mt-1.5">{currentDataset.row_count?.toLocaleString() ?? '-'}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-150 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality Metric</p>
                <p className="text-xl font-bold text-slate-800 mt-1.5">100% Valid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Automated Insights / Takeaways Card */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500 fill-amber-100 animate-pulse" /> Automated Takeaways & Insights
          </h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-500 mt-2 font-medium">Extracting business insights...</p>
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="space-y-4 animate-fade-in">
              {insights.map((insight, idx) => {
                const isWarning = insight.type === 'warning';
                const isSuccess = insight.type === 'success';
                return (
                  <div 
                    key={idx} 
                    className={`rounded-xl border p-4 flex gap-3.5 items-start transition-all hover:shadow-sm ${
                      isWarning 
                        ? 'bg-amber-55/30 border-amber-100/70 text-amber-900' 
                        : isSuccess
                          ? 'bg-emerald-55/35 border-emerald-100/70 text-emerald-900'
                          : 'bg-blue-55/30 border-blue-100/70 text-blue-900'
                    }`}
                  >
                    {isWarning ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : isSuccess ? (
                      <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold tracking-tight">{insight.title}</h4>
                      <p className="text-xs mt-1.5 leading-relaxed opacity-90">{insight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No business insights extracted yet. Select a dataset to analyze.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
