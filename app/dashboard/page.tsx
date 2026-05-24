"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Plus, Calendar, ChevronDown, ChevronLeft, ChevronRight, Box, X, Loader2, Image as ImageIcon, BarChart3 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import TransactionsList from './components/IncomeChart';
import SpendingTracker from './components/TransactionsList';
import ManageFoodContent from './components/ManageFoodContent';
import ReportsContent from './components/ReportsContent';
import { useCalendarPicker, ViewMode } from '../hooks/useCalendarPicker';
import { useProductForm } from '../hooks/useProductForm';
import { getProductsAction } from '../actions/productActions';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string | null;
  image_url: string | null;
  qr_code_url: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'dashboard' | 'manage-food' | 'reports'>('dashboard');
  const [isRendered, setIsRendered] = useState<'dashboard' | 'manage-food' | 'reports'>('dashboard');
  const [animationClass, setAnimationClass] = useState('opacity-100 translate-y-0');
  const [products, setProducts] = useState<Product[]>([]);
  const [isFetchPending, startFetchTransition] = useTransition();

  const fetchInventory = () => {
    startFetchTransition(async () => {
      const result = await getProductsAction();
      if (result.success && result.data) setProducts(result.data);
    });
  };

  useEffect(() => { fetchInventory(); }, []);

  const { viewMode, setViewMode, isOpen, setIsOpen, selectedDate, setSelectedDate, currentGridMonth, currentGridYear, months, gridDays, changeMonthGrid, getFormattedDisplayLabel } = useCalendarPicker();

  const { isModalOpen, openModal, closeModal, isPending, imagePreview, handleImageChange, handleFormSubmit } = useProductForm({ onRefreshData: fetchInventory });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  const handleViewChange = (nextView: 'dashboard' | 'manage-food' | 'reports') => {
    if (nextView === view) return;
    setAnimationClass('opacity-0 translate-y-2');
    setTimeout(() => {
      setView(nextView);
      setIsRendered(nextView);
      setAnimationClass('opacity-100 translate-y-0');
    }, 200);
  };

  return (
    <div className="flex min-h-screen bg-[#08090c] text-slate-200 font-sans p-6 gap-6 selection:bg-blue-500/30">
      <Sidebar currentView={view} onViewChange={handleViewChange} />
      <div className={`flex-1 flex flex-col gap-6 transition-all duration-200 ease-in-out ${animationClass}`}>
        {isRendered === 'dashboard' ? (
          <>
            <header className="flex justify-between items-center bg-[#0f1115]/40 p-2 rounded-2xl border border-slate-900/60 backdrop-blur-sm z-30">
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 px-4 py-2.5 bg-[#0f1115] border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-[#161920] hover:border-slate-700 transition-all shadow-md group">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <div className="flex flex-col text-left min-w-[110px]">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{viewMode} View</span>
                    <span className="font-semibold text-slate-200 tracking-wide mt-0.5">{getFormattedDisplayLabel()}</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-[#0f1115] border border-slate-800 rounded-3xl shadow-2xl p-5 z-50 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-4">
                      <button onClick={() => changeMonthGrid('prev')} className="p-1 hover:bg-slate-800 rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
                      <span className="text-sm font-bold">{months[currentGridMonth]} {currentGridYear}</span>
                      <button onClick={() => changeMonthGrid('next')} className="p-1 hover:bg-slate-800 rounded-lg"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 mb-2 font-bold uppercase">
                      {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {gridDays.map((date, i) => (
                        <button key={i} onClick={() => date && setSelectedDate(date)} disabled={!date} className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs transition-all ${!date ? 'opacity-0' : 'hover:bg-slate-800'} ${date?.toDateString() === selectedDate.toDateString() ? 'bg-blue-600 text-white' : ''}`}>
                          {date?.getDate()}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-5 bg-[#08090c] p-1 rounded-xl border border-slate-800">
                      {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                        <button key={mode} onClick={() => setViewMode(mode)} className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${viewMode === mode ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>{mode}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleViewChange('manage-food')} className="flex items-center gap-2 px-4 py-2 bg-[#0f1115] border border-slate-800 rounded-xl text-sm font-medium hover:bg-[#161920]">Manage Food</button>
                <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Add Food</button>
              </div>
            </header>
            <MetricCards selectedDate={selectedDate} viewMode={viewMode} />
            <section className="grid grid-cols-3 gap-6 flex-1">
              <TransactionsList selectedDate={selectedDate} viewMode={viewMode} />
              <SpendingTracker selectedDate={selectedDate} viewMode={viewMode} />
            </section>
          </>
        ) : isRendered === 'manage-food' ? (
          <ManageFoodContent products={products} isPending={isFetchPending} />
        ) : (
          <ReportsContent selectedDate={selectedDate} viewMode={viewMode} />
        )}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0b0c11] border border-slate-800 w-full max-w-xl rounded-3xl p-8 relative flex flex-col gap-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Add New Food</h3>
                <p className="text-slate-500 text-xs mt-1">Configure your product assets and pricing structure.</p>
              </div>
              <button onClick={closeModal} className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2">
                  <div className="relative aspect-square w-full bg-[#12141c] border-2 border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                    {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <ImageIcon className="h-6 w-6 text-slate-500" />}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <div className="md:col-span-3 flex flex-col gap-4">
                  <input required type="text" name="food_name" placeholder="Product Name" className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  <input required step="0.01" type="number" name="price_per_serving" placeholder="Price (₱)" className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  <textarea name="other_details" rows={2} placeholder="Description" className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
              </div>
              <button type="submit" disabled={isPending} className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="animate-spin" /> : "Save Product"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}