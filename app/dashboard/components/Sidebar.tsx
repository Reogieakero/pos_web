"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  BarChart3, 
  Moon, 
  Sun, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'manage-food' | 'reports';
  onViewChange: (view: 'dashboard' | 'manage-food' | 'reports') => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 flex flex-col justify-between shrink-0">
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            StoreOS
          </span>
        </div>

        <div className="bg-[#0f1115] border border-slate-800/40 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
              alt="George" 
              className="w-10 h-10 rounded-xl object-cover border border-slate-700/50"
            />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium"></p>
          <h3 className="text-xl font-semibold text-white mt-1 leading-snug">Welcome back,<br />Charlou!</h3>
        </div>

        <nav className="space-y-1">
          <button 
            onClick={() => onViewChange('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              currentView === 'dashboard' 
                ? 'bg-[#161920] text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1115]'
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${currentView === 'dashboard' ? 'text-blue-500' : ''}`} />
            <span className="text-sm">Dashboard</span>
          </button>

          <button 
            onClick={() => onViewChange('manage-food')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              currentView === 'manage-food' 
                ? 'bg-[#161920] text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1115]'
            }`}
          >
            <Box className={`h-4 w-4 ${currentView === 'manage-food' ? 'text-blue-500' : ''}`} />
            <span className="text-sm">Manage Products</span>
          </button>

          <button 
            onClick={() => onViewChange('reports')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              currentView === 'reports' 
                ? 'bg-[#161920] text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1115]'
            }`}
          >
            <BarChart3 className={`h-4 w-4 ${currentView === 'reports' ? 'text-blue-500' : ''}`} />
            <span className="text-sm">Reports</span>
          </button>
        </nav>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl relative overflow-hidden group shadow-lg shadow-blue-600/10">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-120 transition-transform duration-500" />
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-blue-200" />
          <h4 className="font-semibold text-white text-sm">Automate Insights</h4>
        </div>
        <p className="text-xs text-blue-100 leading-relaxed">Optimize item margins with inventory predictions</p>
      </div>
    </aside>
  );
}