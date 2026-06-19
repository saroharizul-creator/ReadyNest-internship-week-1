import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setCurrentDataset, deleteDatasetFile, fetchDatasetAnalytics, type Dataset } from '../store/datasetSlice';
import { Trash2, BarChart2, CheckCircle, Clock, AlertTriangle, FileSpreadsheet } from 'lucide-react';

const DataTable: React.FC = () => {
  const dispatch = useAppDispatch();
  const { datasets, currentDataset } = useAppSelector((state) => state.datasets);

  const handleSelect = (dataset: Dataset) => {
    dispatch(setCurrentDataset(dataset));
    if (dataset.status === 'cleaned') {
      dispatch(fetchDatasetAnalytics(dataset.id));
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this dataset?")) {
      dispatch(deleteDatasetFile(id));
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'cleaned':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-sm">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Cleaned
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-blue-600" /> Processing
          </span>
        );
    }
  };

  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-slate-50/40 border border-slate-100 rounded-2xl">
        <FileSpreadsheet className="h-12 w-12 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700 mt-3">No datasets uploaded yet.</p>
        <p className="text-xs text-slate-400 mt-1">Upload a CSV or Excel file to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4.5">Filename</th>
              <th className="p-4.5">Records</th>
              <th className="p-4.5">Uploaded Date</th>
              <th className="p-4.5">Status</th>
              <th className="p-4.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {datasets.map((dataset, index) => {
              const isSelected = currentDataset?.id === dataset.id;
              // Visual cue: index === 0 is styled with a default highlighted hover indicator
              const isHighlightedCue = index === 0;
              return (
                <tr
                  key={dataset.id}
                  onClick={() => handleSelect(dataset)}
                  className={`cursor-pointer transition-all duration-200 border-l-2 ${
                    isHighlightedCue
                      ? 'bg-blue-50/35 hover:bg-blue-50/55 border-l-blue-600 text-blue-900 font-medium'
                      : isSelected
                        ? 'bg-slate-50/80 hover:bg-slate-100/50 border-l-blue-400'
                        : 'bg-white hover:bg-slate-50/60 border-l-transparent'
                  }`}
                >
                  <td className="p-4.5 text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-blue-500/70" />
                    <span className="truncate max-w-[250px]">{dataset.filename}</span>
                  </td>
                  <td className="p-4.5 text-slate-650 font-mono text-xs">{dataset.row_count?.toLocaleString() ?? '-'}</td>
                  <td className="p-4.5 text-slate-450 text-xs">
                    {new Date(dataset.uploaded_at).toLocaleDateString()} {new Date(dataset.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4.5">{renderStatus(dataset.status)}</td>
                  <td className="p-4.5 text-right">
                    <div className="flex justify-end gap-3 min-w-[90px]" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleSelect(dataset)}
                        disabled={dataset.status !== 'cleaned'}
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Analyze Data"
                      >
                        <BarChart2 className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, dataset.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-650 transition-colors cursor-pointer"
                        title="Delete Dataset"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
