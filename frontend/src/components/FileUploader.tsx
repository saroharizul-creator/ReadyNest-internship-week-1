import React, { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { uploadDatasetFile, clearDatasetError } from '../store/datasetSlice';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';

const FileUploader: React.FC = () => {
  const dispatch = useAppDispatch();
  const { uploading, error } = useAppSelector((state) => state.datasets);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setLocalError(null);
    dispatch(clearDatasetError());

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.xls', '.xlsx'].includes(ext)) {
      setLocalError("Invalid format. Please upload CSV or Excel files.");
      return;
    }
    
    const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_UPLOAD_SIZE) {
      setLocalError("File size exceeds the 100MB upload limit. Please upload a smaller file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
      return;
    }
    
    await dispatch(uploadDatasetFile(file));
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset input
    }
  };

  const activeError = localError || error;

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'border-blue-500 bg-blue-50/25'
            : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-slate-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-800">Uploading & Preprocessing Dataset...</p>
            <p className="text-xs text-slate-400">Automated cleaning, formatting and analysis is running</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-blue-50/80 p-4.5 text-blue-600 animate-pulse-glow shadow-sm flex items-center justify-center">
              <UploadCloud className="h-10 w-10" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Drag and drop your file here, or <span className="text-blue-600 font-bold hover:underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">Supports CSV, XLS, XLSX formats (Max 100MB)</p>
            </div>
          </div>
        )}
      </div>

      {activeError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50/60 border border-rose-100 p-3.5 text-xs text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
