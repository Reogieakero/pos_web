"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Plus, Calendar, ChevronDown, ChevronLeft, ChevronRight, X, Loader2, Utensils, Package, ChevronUp } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import TransactionsList from './components/IncomeChart';
import SpendingTracker from './components/TransactionsList';
import ManageFoodContent from './components/ManageFoodContent';
import ReportsContent from './components/ReportsContent';
import { useCalendarPicker, ViewMode } from '../hooks/useCalendarPicker';
import { useProductForm } from '../hooks/useProductForm';
import { getProductsAction } from '../actions/productActions';

// ── Custom scrollbar styles injected once ──────────────────────────────────────
const SCROLLBAR_STYLE = `
  .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb {
    background: #1e2433;
    border-radius: 999px;
  }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #2e3650; }
  .custom-scroll { scrollbar-width: thin; scrollbar-color: #1e2433 transparent; }
`;

interface Product {
  id: number;
  name: string;
  price: number;
  category: string | null;
  image_url: string | null;
  qr_code_url: string | null;
  created_at: string;
  product_type: 'food' | 'stock';
  stock_quantity: number | null;
  stock_unit: string | null;
  low_stock_threshold: number | null;
  selling_price: number | null; // ← fixed: was missing, caused TS2719
}

// ── Predefined category options per product type ───────────────────────────────
const FOOD_CATEGORIES = [
  'Main Course', 'Appetizer', 'Dessert', 'Drinks', 'Snacks',
  'Breakfast', 'Lunch Special', 'Dinner Special', 'Side Dish', 'Others',
];
const STOCK_CATEGORIES = [
  'Dry Goods', 'Condiments', 'Beverages', 'Dairy', 'Meat & Poultry',
  'Seafood', 'Vegetables & Fruits', 'Packaging', 'Cleaning Supplies', 'Others',
];

// ── Reusable custom select dropdown ───────────────────────────────────────────
function CategorySelect({
  value,
  onChange,
  options,
  placeholder,
  accentColor = 'blue',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  accentColor?: 'blue' | 'violet';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ring = accentColor === 'violet' ? 'focus-within:border-violet-500/50' : 'focus-within:border-blue-500/50';
  const highlight = accentColor === 'violet' ? 'bg-violet-500/10 text-violet-300' : 'bg-blue-500/10 text-blue-300';
  const chevronColor = accentColor === 'violet' ? 'text-violet-400' : 'text-blue-400';

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between bg-[#12141c] border border-slate-800 rounded-xl px-4 py-3 text-sm text-left transition-all ${ring} ${value ? 'text-white' : 'text-slate-600'}`}
      >
        <span className="truncate">{value || placeholder}</span>
        {open
          ? <ChevronUp className={`h-3.5 w-3.5 shrink-0 ml-2 ${chevronColor}`} />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 ml-2 text-slate-500" />
        }
      </button>

      {open && (
        <div className="absolute z-[200] mt-1.5 w-full bg-[#0f1115] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* allow custom text entry */}
          <div className="p-2 border-b border-slate-800/60">
            <input
              autoFocus
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="Type or pick below…"
              className="w-full bg-[#08090c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-all"
            />
          </div>
          <ul className="custom-scroll max-h-44 overflow-y-auto py-1">
            {options.map(opt => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-all hover:${highlight.split(' ')[0]}
                    ${value === opt ? highlight : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'dashboard' | 'manage-food' | 'reports'>('dashboard');
  const [isRendered, setIsRendered] = useState<'dashboard' | 'manage-food' | 'reports'>('dashboard');
  const [animationClass, setAnimationClass] = useState('opacity-100 translate-y-0');
  const [products, setProducts] = useState<Product[]>([]);
  const [isFetchPending, startFetchTransition] = useTransition();

  // Add product modal state
  const [productType, setProductType] = useState<'food' | 'stock'>('food');
  const [stockUnit, setStockUnit] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [category, setCategory] = useState('');

  const fetchInventory = () => {
    startFetchTransition(async () => {
      const result = await getProductsAction();
      if (result.success && result.data) setProducts(result.data as Product[]);
    });
  };

  useEffect(() => { fetchInventory(); }, []);

  const {
    viewMode, setViewMode, isOpen, setIsOpen,
    selectedDate, setSelectedDate,
    currentGridMonth, currentGridYear,
    months, gridDays, changeMonthGrid, getFormattedDisplayLabel,
  } = useCalendarPicker();

  const {
    isModalOpen, openModal, closeModal,
    isPending, imagePreview, handleImageChange, handleFormSubmit,
  } = useProductForm({ onRefreshData: fetchInventory });

  // Reset fields when modal closes or type changes
  useEffect(() => {
    if (!isModalOpen) {
      setProductType('food');
      setStockUnit('');
      setStockQuantity('');
      setLowStockThreshold('');
      setSellingPrice('');
      setCategory('');
    }
  }, [isModalOpen]);

  useEffect(() => {
    setCategory('');
  }, [productType]);

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

  const handleEnhancedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    // Inject product_type
    let typeInput = form.querySelector<HTMLInputElement>('input[name="product_type"]');
    if (!typeInput) {
      typeInput = document.createElement('input');
      typeInput.type = 'hidden';
      typeInput.name = 'product_type';
      form.appendChild(typeInput);
    }
    typeInput.value = productType;

    // Inject category (from controlled state, not a native input)
    let catInput = form.querySelector<HTMLInputElement>('input[name="other_details"]');
    if (!catInput) {
      catInput = document.createElement('input');
      catInput.type = 'hidden';
      catInput.name = 'other_details';
      form.appendChild(catInput);
    }
    catInput.value = category;

    // Inject stock fields if stock type
    if (productType === 'stock') {
      const stockFields: Record<string, string> = {
        stock_unit: stockUnit,
        stock_quantity: stockQuantity,
        low_stock_threshold: lowStockThreshold,
        selling_price: sellingPrice,
      };
      for (const [fieldName, fieldValue] of Object.entries(stockFields)) {
        let el = form.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
        if (!el) {
          el = document.createElement('input');
          el.type = 'hidden';
          el.name = fieldName;
          form.appendChild(el);
        }
        el.value = fieldValue;
      }
    }

    handleFormSubmit(e as any);
  };

  return (
    <>
      {/* Inject custom scrollbar CSS once */}
      <style>{SCROLLBAR_STYLE}</style>

      <div className="flex min-h-screen bg-[#08090c] text-slate-200 font-sans p-6 gap-6 selection:bg-blue-500/30">
        <Sidebar currentView={view} onViewChange={handleViewChange} />

        <div className={`flex-1 flex flex-col gap-6 transition-all duration-200 ease-in-out ${animationClass}`}>
          {isRendered === 'dashboard' ? (
            <>
              {/* ── Header ── */}
              <header className="flex justify-between items-center bg-[#0f1115]/40 p-2 rounded-2xl border border-slate-900/60 backdrop-blur-sm z-30">
                {/* Calendar picker */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 px-4 py-2.5 bg-[#0f1115] border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-[#161920] hover:border-slate-700 transition-all shadow-md group"
                  >
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
                          <button
                            key={i}
                            onClick={() => date && setSelectedDate(date)}
                            disabled={!date}
                            className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs transition-all
                              ${!date ? 'opacity-0' : 'hover:bg-slate-800'}
                              ${date?.toDateString() === selectedDate.toDateString() ? 'bg-blue-600 text-white' : ''}`}
                          >
                            {date?.getDate()}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-5 bg-[#08090c] p-1 rounded-xl border border-slate-800">
                        {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${viewMode === mode ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleViewChange('manage-food')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0f1115] border border-slate-800 rounded-xl text-sm font-medium hover:bg-[#161920] transition-all"
                  >
                    Manage Inventory
                  </button>
                  <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </button>
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

        {/* ── Add Product Modal ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="custom-scroll bg-[#0b0c11] border border-slate-800 w-full max-w-xl rounded-3xl p-8 relative flex flex-col gap-7 max-h-[90vh] overflow-y-auto">

              {/* Modal header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Add New Product</h3>
                  <p className="text-slate-500 text-xs mt-1">Configure product details, type, and pricing structure.</p>
                </div>
                <button onClick={closeModal} className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Product type toggle */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#08090c] border border-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setProductType('food')}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all
                      ${productType === 'food'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Utensils className="h-4 w-4" />
                    Food / Menu Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('stock')}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all
                      ${productType === 'stock'
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                        : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Package className="h-4 w-4" />
                    Stock / Inventory
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 px-1">
                  {productType === 'food'
                    ? 'A sellable menu item. Will appear on the food catalog with QR code.'
                    : 'A raw material or supply item. Tracked by quantity with low-stock alerts.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleEnhancedSubmit} className="flex flex-col gap-5">
                {/* Image + base fields */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  {/* Image upload */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                      {productType === 'food' ? 'Food Photo' : 'Item Photo'}
                    </label>
                    <div className="relative aspect-square w-full bg-[#12141c] border-2 border-dashed border-slate-800 hover:border-slate-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors group">
                      {imagePreview
                        ? <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                        : (
                          <div className="flex flex-col items-center gap-2 text-slate-600 group-hover:text-slate-400 transition-colors">
                            {productType === 'food' ? <Utensils className="h-7 w-7" /> : <Package className="h-7 w-7" />}
                            <span className="text-[10px] font-medium">Upload image</span>
                          </div>
                        )
                      }
                      <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  {/* Core fields */}
                  <div className="md:col-span-3 flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {productType === 'food' ? 'Food Name' : 'Item Name'}
                      </label>
                      <input
                        required
                        type="text"
                        name="food_name"
                        placeholder={productType === 'food' ? 'e.g. Chicken Adobo' : 'e.g. Rice (50kg sack)'}
                        className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>

                    {/* Price per serving — food only */}
                    {productType === 'food' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price per Serving (₱)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-sm font-semibold text-slate-600">₱</span>
                          <input
                            required
                            step="0.01"
                            type="number"
                            name="price_per_serving"
                            placeholder="0.00"
                            min="0.01"
                            className="w-full bg-[#12141c] border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Custom category select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {productType === 'food' ? 'Category' : 'Category'}
                      </label>
                      <CategorySelect
                        value={category}
                        onChange={setCategory}
                        options={productType === 'food' ? FOOD_CATEGORIES : STOCK_CATEGORIES}
                        placeholder={productType === 'food' ? 'e.g. Main Course, Drinks…' : 'e.g. Dry Goods, Condiments…'}
                        accentColor={productType === 'food' ? 'blue' : 'violet'}
                      />
                    </div>
                  </div>
                </div>

                {/* Stock-specific fields */}
                {productType === 'stock' && (
                  <div className="flex flex-col gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Stock Details</span>
                    </div>
                    {/* Row 1: cost + selling price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cost per Unit (₱)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-600">₱</span>
                          <input
                            required
                            type="number"
                            name="price_per_serving"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            className="w-full bg-[#12141c] border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                          />
                        </div>
                        <p className="text-[9px] text-slate-600 px-0.5">What you pay to acquire / restock this item.</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selling Price (₱)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-600">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={sellingPrice}
                            onChange={e => setSellingPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#12141c] border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                          />
                        </div>
                        <p className="text-[9px] text-slate-600 px-0.5">Price charged to customers per unit.</p>
                      </div>
                    </div>
                    {/* Row 2: unit + qty + low alert */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit</label>
                        <input
                          type="text"
                          value={stockUnit}
                          onChange={e => setStockUnit(e.target.value)}
                          placeholder="kg, pcs, L…"
                          className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Qty</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={stockQuantity}
                          onChange={e => setStockQuantity(e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Low Alert ≤</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={lowStockThreshold}
                          onChange={e => setLowStockThreshold(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600">
                      Stock auto-decrements when an order is placed. Low stock alert fires when qty ≤ threshold.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isPending}
                  className={`w-full py-3.5 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all
                    ${productType === 'food'
                      ? 'bg-white hover:bg-slate-100 text-black'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPending
                    ? <><Loader2 className="animate-spin h-4 w-4" /> Saving…</>
                    : productType === 'food'
                      ? <><Utensils className="h-4 w-4" /> Save Food Item</>
                      : <><Package className="h-4 w-4" /> Save Stock Item</>
                  }
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}