import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { importDatabaseDataset } from '../store/datasetSlice';
import { Loader2, AlertCircle, Play, Info } from 'lucide-react';

const DatabaseImporter: React.FC = () => {
  const dispatch = useAppDispatch();
  const { uploading, error } = useAppSelector((state) => state.datasets);

  // Form states
  const [dbType, setDbType] = useState<'sqlite' | 'mysql' | 'postgresql'>('sqlite');
  const [useUri, setUseUri] = useState<boolean>(false);
  const [connectionString, setConnectionString] = useState<string>('');
  
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [database, setDatabase] = useState<string>('');
  
  const [query, setQuery] = useState<string>('');
  const [datasetName, setDatasetName] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      alert('SQL Query is required.');
      return;
    }
    if (!datasetName.trim()) {
      alert('Dataset Name is required.');
      return;
    }

    const payload: any = {
      db_type: dbType,
      query: query.trim(),
      dataset_name: datasetName.trim(),
    };

    if (useUri || dbType === 'sqlite') {
      if (!connectionString.trim()) {
        alert(dbType === 'sqlite' ? 'File path / database path is required.' : 'Connection URI is required.');
        return;
      }
      payload.connection_string = connectionString.trim();
    } else {
      if (!host.trim() || !username.trim() || !database.trim()) {
        alert('Host, Username, and Database name are required for connection details.');
        return;
      }
      payload.host = host.trim();
      payload.port = port ? parseInt(port) : undefined;
      payload.username = username.trim();
      payload.password = password.trim();
      payload.database = database.trim();
    }

    await dispatch(importDatabaseDataset(payload));
    
    // Reset query and datasetName on successful upload if needed, or keep
    if (!error) {
      setQuery('');
      setDatasetName('');
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* DB Type & Connection Method Toggles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Database Provider
            </label>
            <select
              value={dbType}
              onChange={(e) => {
                const val = e.target.value as any;
                setDbType(val);
                if (val === 'sqlite') {
                  setUseUri(true);
                } else {
                  setUseUri(false);
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 font-semibold"
            >
              <option value="sqlite">SQLite</option>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>

          {dbType !== 'sqlite' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Connection Method
              </label>
              <div className="flex border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setUseUri(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !useUri
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                      : 'text-slate-450 hover:text-slate-700'
                  }`}
                >
                  Credentials
                </button>
                <button
                  type="button"
                  onClick={() => setUseUri(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    useUri
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                      : 'text-slate-450 hover:text-slate-700'
                  }`}
                >
                  Connection URI
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Connection inputs */}
        {useUri || dbType === 'sqlite' ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {dbType === 'sqlite' ? 'SQLite Database File Path' : 'Database Connection URI'}
            </label>
            <input
              type="text"
              required
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder={
                dbType === 'sqlite'
                  ? 'e.g. backend/dataset_analysis.db'
                  : 'e.g. postgresql+psycopg2://user:password@host:5432/dbname'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
            />
            {dbType === 'sqlite' && (
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                <Info className="h-3 w-3 shrink-0" /> Note: Relative file paths are resolved relative to the backend workspace directory.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Host
                </label>
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="e.g. localhost"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder={dbType === 'mysql' ? '3306' : '5432'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. root"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Database Name
                </label>
                <input
                  type="text"
                  required
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="e.g. sales_db"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Dataset Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Dataset Display Name
          </label>
          <input
            type="text"
            required
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g. Q2 Sales SQL Query"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* SQL Query */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            SQL SELECT Query
          </label>
          <textarea
            required
            rows={4}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM sales_data WHERE country = 'USA' LIMIT 5000;"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-mono leading-relaxed"
          />
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50/60 border border-rose-100 p-3.5 text-xs text-rose-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit action */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Importing & Preprocessing...
            </>
          ) : (
            <>
              <Play className="h-4.5 w-4.5 fill-current" />
              Import Database Dataset
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DatabaseImporter;
