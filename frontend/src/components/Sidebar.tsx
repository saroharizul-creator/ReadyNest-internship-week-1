import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, BarChart3, FileSpreadsheet, Settings, MessageSquare } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Dashboard Builder', path: '/builder', icon: LayoutGrid },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'AI Data Assistant', path: '/assistant', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-64 border-r border-slate-100 bg-white py-6 transition-colors">
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-1">
          <p className="px-6 text-[10px] font-bold uppercase tracking-wider text-slate-450">Main Menu</p>
          <nav className="mt-4 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-6 py-3 text-sm font-semibold transition-all duration-150 border-r-2 ${
                    isActive
                      ? 'bg-blue-50/45 text-blue-600 border-r-blue-600 font-bold'
                      : 'text-slate-500 hover:bg-slate-50/30 hover:text-slate-900 border-r-transparent'
                  }`
                }
              >
                <item.icon className="h-4.5 w-4.5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
