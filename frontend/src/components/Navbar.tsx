import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { logout } from '../store/authSlice';
import { LogOut, User, Layers } from 'lucide-react';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentDataset } = useAppSelector((state) => state.datasets);

  useEffect(() => {
    // Force day/light mode
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className="sticky top-0 z-45 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white px-6 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/10">
          <Layers className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-800">DataLens</span>
        <span className="rounded-md border border-blue-500/20 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-blue-600 uppercase">
          MVP V1.0
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Engine Online Status */}
        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-500">Engine Online</span>
        </div>

        {!currentDataset && (
          <div className="flex items-center gap-3 border-l border-slate-150 pl-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-700">{user?.email || 'User'}</span>
              <span className="text-xs capitalize text-slate-400">{user?.role || 'Guest'}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100/50">
              {user?.email ? user.email.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-650 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


export default Navbar;
