import React from 'react';
import { useAppSelector } from '../store';
import { Shield, Server } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Manage your workspace credentials and configuration preferences.</p>
      </div>

      <div className="max-w-2xl divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {/* Profile details */}
        <div className="p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" /> Security & Profile
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</p>
              <p className="text-sm text-slate-700 mt-1">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role Permissions</p>
              <p className="text-sm text-slate-700 capitalize mt-1">{user?.role || 'User'}</p>
            </div>
          </div>
        </div>

        {/* Server Details */}
        <div className="p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary-500" /> Platform Services
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">API Connection</p>
              <p className="text-sm text-green-600 font-semibold mt-1">Connected: http://127.0.0.1:8000/api</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Database Engine</p>
              <p className="text-sm text-slate-700 mt-1">MySQL 8.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
