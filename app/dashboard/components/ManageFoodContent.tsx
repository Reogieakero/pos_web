"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateProductAction, adjustStockQuantityAction } from '@/app/actions/productActions';
import {
  Utensils, Search, Loader2, Calendar, Trash2, QrCode, Layers,
  ArrowUpRight, CheckCircle2, Edit3, Save, Image as ImageIcon,
  LayoutGrid, Table as TableIcon, Package, AlertTriangle,
  Plus, Minus, TrendingDown, ChevronDown, BarChart2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  selling_price: number | null;
}

interface ManageFoodContentProps {
  products: Product[];
  isPending: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLowStock(p: Product) {
  if (p.product_type !== 'stock') return false;
  if (p.stock_quantity === null) return false;
  return p.low_stock_threshold !== null && p.stock_quantity <= p.low_stock_threshold;
}

function stockStatusColor(p: Product) {
  if (p.stock_quantity === null) return 'text-slate-500';
  if (isLowStock(p)) return 'text-rose-400';
  return 'text-emerald-400';
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockBadge({ product }: { product: Product }) {
  if (product.product_type !== 'stock') return null;
  const low = isLowStock(product);
  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border
      ${low
        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      }`}>
      {low ? <AlertTriangle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
      {product.stock_quantity ?? '—'} {product.stock_unit ?? ''}
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────

function QrModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] border border-slate-800/90 p-7 rounded-3xl flex flex-col items-center gap-5 relative max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-[#161920] hover:bg-[#1f242e] border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-all">
          <XIcon className="h-4 w-4" />
        </button>
        <div className="text-center mt-2 space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3" />
            {product.product_type === 'stock' ? 'Stock QR Code' : 'Digital Menu Link'}
          </span>
          <h3 className="text-lg font-bold text-white tracking-tight pt-1">{product.name}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-2xl ring-4 ring-blue-600/10">
          <img src={product.qr_code_url || ""} alt="QR Code" className="w-64 h-64 select-none object-contain" />
        </div>
        <div className="w-full bg-[#161920]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center gap-1">
          <p className="text-sm font-bold text-white tracking-tight">{product.name}</p>
          {product.product_type === 'food' ? (
            <div className="flex items-baseline text-emerald-400 font-extrabold text-sm tracking-tight">
              <span className="text-[10px] font-semibold text-emerald-500/80 mr-0.5">₱</span>
              {Number(product.price).toFixed(2)}
            </div>
          ) : (
            <p className="text-xs text-slate-400">{product.stock_quantity} {product.stock_unit}</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Food Edit Modal ──────────────────────────────────────────────────────────

function FoodEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [editName, setEditName] = useState(product.name);
  const [editPrice, setEditPrice] = useState<number>(product.price);
  const [editImage, setEditImage] = useState<string | null>(product.image_url);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || editPrice <= 0) return;
    setIsSaving(true);
    try {
      const result = await updateProductAction(
        product.id, editName, editPrice,
        editImage !== product.image_url ? editImage : null
      );
      if (!result.success) throw new Error(result.error || "Failed update.");
      onSaved({ ...product, name: editName, price: editPrice, image_url: editImage });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1115] border border-slate-800 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Edit Food Item</h3>
            <p className="text-xs text-slate-500 mt-1">Adjust pricing, display names, and inventory metadata.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white bg-slate-900/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-800">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-800 bg-[#06070a]">
              {editImage
                ? <img src={editImage} className="w-full h-full object-cover" alt="Preview" />
                : <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon /></div>
              }
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Edit3 className="h-5 w-5" />
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            <p className="text-xs text-slate-400">Click image to update.</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest pl-1">Food Name</label>
              <input type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full bg-[#06070a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest pl-1">Price per serving (₱)</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-sm font-semibold text-slate-600">₱</span>
                <input type="number" step="0.01" required min="0.01" value={editPrice || ''}
                  onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#06070a] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#161920] hover:bg-[#1f242e] border border-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-all">Cancel</button>
            <button type="submit" disabled={isSaving}
              className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-200 text-black font-bold rounded-xl text-sm transition-all disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Update Food Details"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Stock Edit Modal ─────────────────────────────────────────────────────────

function StockEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [editName, setEditName] = useState(product.name);
  const [editPrice, setEditPrice] = useState<number>(product.price);
  const [editQty, setEditQty] = useState<number>(product.stock_quantity ?? 0);
  const [editUnit, setEditUnit] = useState(product.stock_unit ?? '');
  const [editThreshold, setEditThreshold] = useState<number>(product.low_stock_threshold ?? 0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(product.selling_price ?? 0);
  const [editImage, setEditImage] = useState<string | null>(product.image_url);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateProductAction(
        product.id, editName, editPrice,
        editImage !== product.image_url ? editImage : null,
        { stock_quantity: editQty, stock_unit: editUnit || null, low_stock_threshold: editThreshold || null, selling_price: editSellingPrice || null }
      );
      if (!result.success) throw new Error(result.error || "Failed.");
      onSaved({ ...product, name: editName, price: editPrice, image_url: editImage, stock_quantity: editQty, stock_unit: editUnit || null, low_stock_threshold: editThreshold || null, selling_price: editSellingPrice || null });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1115] border border-slate-800 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Edit Stock Item</h3>
            <p className="text-xs text-slate-500 mt-1">Manage name, cost, quantity, unit, and alert thresholds.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white bg-slate-900/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-800">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-8 space-y-5">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-800 bg-[#06070a]">
              {editImage
                ? <img src={editImage} className="w-full h-full object-cover" alt="Preview" />
                : <div className="w-full h-full flex items-center justify-center text-slate-600"><Package className="h-6 w-6" /></div>
              }
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            <p className="text-xs text-slate-400">Click image to update.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest">Item Name</label>
              <input type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full bg-[#06070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest">Cost / Unit (₱)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-600">₱</span>
                <input type="number" step="0.01" required min="0.01" value={editPrice || ''}
                  onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#06070a] border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
              </div>
              <p className="text-[9px] text-slate-600">What you pay to acquire this item.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest">Selling Price / Unit (₱)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-600">₱</span>
                <input type="number" step="0.01" min="0" value={editSellingPrice || ''}
                  onChange={e => setEditSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#06070a] border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
              </div>
              <p className="text-[9px] text-slate-600">Price charged to customers per unit.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest">Unit (kg, pcs, L…)</label>
              <input type="text" value={editUnit} onChange={e => setEditUnit(e.target.value)}
                placeholder="e.g. kg"
                className="w-full bg-[#06070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest">Current Quantity</label>
              <input type="number" step="0.01" min="0" value={editQty || ''}
                onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#06070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest">Low Stock Alert ≤</label>
              <input type="number" step="0.01" min="0" value={editThreshold || ''}
                onChange={e => setEditThreshold(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 5"
                className="w-full bg-[#06070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#161920] hover:bg-[#1f242e] border border-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-all">Cancel</button>
            <button type="submit" disabled={isSaving}
              className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Update Stock Details"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Food Grid/Table ──────────────────────────────────────────────────────────

function FoodInventory({ products, viewMode, setViewMode, onEdit, onQr }: {
  products: Product[];
  viewMode: 'grid' | 'table';
  setViewMode: (v: 'grid' | 'table') => void;
  onEdit: (p: Product) => void;
  onQr: (p: Product) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">{products.length} item{products.length !== 1 ? 's' : ''} in menu</p>
        <div className="flex bg-[#090a0f] border border-slate-800/80 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
            <TableIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-1 max-h-[calc(100vh-300px)]">
          {products.map(product => (
            <div key={product.id} className="bg-[#0f1115]/80 border border-slate-800/70 rounded-2xl overflow-hidden shadow-2xl hover:border-slate-700/80 transition-all duration-300 flex flex-col group relative">
              <div className="h-48 w-full relative bg-[#06070a] overflow-hidden border-b border-slate-900">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-600 bg-gradient-to-b from-[#13161f] to-[#0d0f14]"><Utensils className="h-10 w-10 opacity-40" /></div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60" />
                {product.category && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#090a0f]/80 backdrop-blur-md rounded-lg border border-slate-800/60 text-[10px] text-slate-300 font-semibold tracking-wide uppercase max-w-[140px] truncate">
                    {product.category}
                  </div>
                )}
                <button onClick={() => onEdit(product)}
                  className="absolute top-3 right-3 px-2.5 py-1.5 bg-[#090a0f]/90 hover:bg-blue-600 backdrop-blur-md border border-slate-800/60 hover:border-blue-500 rounded-lg flex items-center gap-1 text-[10px] text-slate-300 hover:text-white font-bold tracking-wider transition-all duration-200 shadow-lg">
                  <Edit3 className="h-3 w-3" /><span>Edit</span>
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4 flex-1 justify-between">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-base tracking-tight line-clamp-1 group-hover:text-blue-400 transition-colors">{product.name}</h4>
                    <ArrowUpRight className="h-4 w-4 text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-baseline text-emerald-400 font-extrabold text-lg tracking-tight">
                      <span className="text-sm font-semibold text-emerald-500/80 mr-0.5">₱</span>
                      <span>{Number(product.price).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-800/40 font-medium">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>{new Date(product.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-3.5 border-t border-slate-900/80">
                  {product.qr_code_url ? (
                    <button onClick={() => onQr(product)}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-[#12151c] hover:bg-[#191e29] border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95">
                      <QrCode className="h-3.5 w-3.5 text-blue-400" /><span>View QR</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center py-2 px-3 bg-[#12151c]/40 border border-slate-900 text-slate-600 rounded-xl text-xs font-semibold select-none">No QR</div>
                  )}
                  <button className="flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-semibold transition-all active:scale-95">
                    <Trash2 className="h-3.5 w-3.5 opacity-80" /><span>Archive</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0f1115]/80 border border-slate-800/70 rounded-2xl overflow-hidden shadow-2xl overflow-y-auto max-h-[calc(100vh-300px)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="p-4">Item</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Added</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 text-sm">
              {products.map(product => (
                <tr key={product.id} className="border-b border-slate-800/40 hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    {product.image_url && <img src={product.image_url} className="w-10 h-10 rounded-lg object-cover bg-slate-800" alt="" />}
                    <span className="font-medium text-white">{product.name}</span>
                  </td>
                  <td className="p-4 text-slate-400">{product.category || '—'}</td>
                  <td className="p-4 text-emerald-400 font-bold">₱{Number(product.price).toFixed(2)}</td>
                  <td className="p-4 text-slate-500 text-xs">{new Date(product.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(product)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><Edit3 className="h-4 w-4" /></button>
                      {product.qr_code_url && <button onClick={() => onQr(product)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><QrCode className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Stock Grid/Table ─────────────────────────────────────────────────────────

function StockInventory({ products, viewMode, setViewMode, onEdit, onQr, onAdjust }: {
  products: Product[];
  viewMode: 'grid' | 'table';
  setViewMode: (v: 'grid' | 'table') => void;
  onEdit: (p: Product) => void;
  onQr: (p: Product) => void;
  onAdjust: (id: number, delta: number) => void;
}) {
  const lowStockCount = products.filter(isLowStock).length;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500 font-medium">{products.length} stock item{products.length !== 1 ? 's' : ''}</p>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-bold text-rose-400">
              <AlertTriangle className="h-3 w-3" />
              {lowStockCount} low stock
            </div>
          )}
        </div>
        <div className="flex bg-[#090a0f] border border-slate-800/80 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
            <TableIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-y-auto pr-1 max-h-[calc(100vh-300px)]">
          {products.map(product => {
            const low = isLowStock(product);
            return (
              <div key={product.id} className={`bg-[#0f1115]/80 border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col group relative
                ${low ? 'border-rose-500/30 hover:border-rose-500/50' : 'border-slate-800/70 hover:border-slate-700/80'}`}>
                {/* Image area */}
                <div className="h-36 w-full relative bg-[#06070a] overflow-hidden border-b border-slate-900">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    : <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#13161f] to-[#0d0f14]">
                        <Package className="h-10 w-10 text-violet-500/30" />
                      </div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60" />
                  {low && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/20 backdrop-blur-md border border-rose-500/30 rounded-lg text-[10px] text-rose-300 font-bold">
                      <AlertTriangle className="h-2.5 w-2.5" /> LOW STOCK
                    </div>
                  )}
                  <button onClick={() => onEdit(product)}
                    className="absolute top-3 right-3 px-2.5 py-1.5 bg-[#090a0f]/90 hover:bg-violet-600 backdrop-blur-md border border-slate-800/60 hover:border-violet-500 rounded-lg flex items-center gap-1 text-[10px] text-slate-300 hover:text-white font-bold tracking-wider transition-all shadow-lg">
                    <Edit3 className="h-3 w-3" /><span>Edit</span>
                  </button>
                </div>

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <h4 className="font-bold text-white text-sm tracking-tight line-clamp-1">{product.name}</h4>
                    {product.category && <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{product.category}</p>}
                  </div>

                  {/* Stock quantity display */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl border
                    ${low ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/40 border-slate-800/40'}`}>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Quantity</p>
                      <p className={`text-lg font-extrabold tracking-tight ${low ? 'text-rose-400' : 'text-white'}`}>
                        {product.stock_quantity ?? '—'}
                        <span className="text-xs font-medium text-slate-400 ml-1">{product.stock_unit}</span>
                      </p>
                    </div>
                    {product.low_stock_threshold !== null && (
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Threshold</p>
                        <p className="text-xs font-semibold text-slate-500">≤ {product.low_stock_threshold} {product.stock_unit}</p>
                      </div>
                    )}
                  </div>

                  {/* Adjust qty buttons */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => onAdjust(product.id, -1)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition-all active:scale-95">
                      <Minus className="h-3 w-3" /> Deduct
                    </button>
                    <button onClick={() => onAdjust(product.id, 1)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold transition-all active:scale-95">
                      <Plus className="h-3 w-3" /> Restock
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-900/60">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-slate-600 uppercase tracking-widest">Cost</span>
                        <span className="text-[11px] text-slate-400 font-semibold">₱{Number(product.price).toFixed(2)}<span className="text-slate-600 font-normal">/{product.stock_unit || 'unit'}</span></span>
                      </div>
                      {product.selling_price != null && (
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest">Selling</span>
                          <span className="text-[11px] text-emerald-400 font-semibold">₱{Number(product.selling_price).toFixed(2)}<span className="text-slate-600 font-normal">/{product.stock_unit || 'unit'}</span></span>
                        </div>
                      )}
                      {product.qr_code_url && (
                        <button onClick={() => onQr(product)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors ml-1">
                          <QrCode className="h-3.5 w-3.5 text-violet-400" />
                        </button>
                      )}
                    </div>
                    {product.selling_price != null && product.price > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-900/40 rounded-lg border border-slate-800/40">
                        <TrendingDown className="h-2.5 w-2.5 text-slate-500" />
                        <span className="text-[9px] text-slate-500">Margin: </span>
                        <span className={`text-[9px] font-bold ${
                          product.selling_price > product.price ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {product.selling_price > product.price ? '+' : ''}
                          {(((product.selling_price - product.price) / product.price) * 100).toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-slate-600 ml-auto">
                          +₱{(product.selling_price - product.price).toFixed(2)}/unit
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0f1115]/80 border border-slate-800/70 rounded-2xl overflow-hidden shadow-2xl overflow-y-auto max-h-[calc(100vh-300px)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="p-4">Item</th>
                <th className="p-4">Category</th>
                <th className="p-4">Cost/Unit</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 text-sm">
              {products.map(product => {
                const low = isLowStock(product);
                return (
                  <tr key={product.id} className={`border-b border-slate-800/40 transition-colors ${low ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'hover:bg-slate-900/40'}`}>
                    <td className="p-4 flex items-center gap-3">
                      {product.image_url
                        ? <img src={product.image_url} className="w-10 h-10 rounded-lg object-cover bg-slate-800" alt="" />
                        : <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center"><Package className="h-4 w-4 text-violet-400/60" /></div>
                      }
                      <span className="font-medium text-white">{product.name}</span>
                    </td>
                    <td className="p-4 text-slate-400">{product.category || '—'}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-violet-300 font-bold text-sm">₱{Number(product.price).toFixed(2)}<span className="text-slate-500 font-normal text-xs">/{product.stock_unit || 'unit'}</span></span>
                        {product.selling_price != null && (
                          <span className="text-emerald-400 text-xs font-semibold">↗ ₱{Number(product.selling_price).toFixed(2)}
                            {product.price > 0 && (
                              <span className="text-slate-500 font-normal ml-1">
                                ({(((product.selling_price - product.price) / product.price) * 100).toFixed(1)}% margin)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`font-bold ${low ? 'text-rose-400' : 'text-white'}`}>
                        {product.stock_quantity ?? '—'} {product.stock_unit}
                      </span>
                      {product.low_stock_threshold !== null && (
                        <span className="text-slate-600 text-xs ml-2">/ min {product.low_stock_threshold}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {low
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] text-rose-400 font-bold"><AlertTriangle className="h-2.5 w-2.5" /> Low Stock</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold"><CheckCircle2 className="h-2.5 w-2.5" /> In Stock</span>
                      }
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        <button onClick={() => onAdjust(product.id, -1)} className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-colors">
                          <Minus className="h-3.5 w-3.5 text-rose-400" />
                        </button>
                        <button onClick={() => onAdjust(product.id, 1)} className="p-1.5 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded-lg transition-colors">
                          <Plus className="h-3.5 w-3.5 text-emerald-400" />
                        </button>
                        <button onClick={() => onEdit(product)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {product.qr_code_url && (
                          <button onClick={() => onQr(product)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                            <QrCode className="h-3.5 w-3.5 text-violet-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManageFoodContent({ products: initialProducts, isPending }: ManageFoodContentProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'food' | 'stock'>('food');
  const [foodViewMode, setFoodViewMode] = useState<'grid' | 'table'>('grid');
  const [stockViewMode, setStockViewMode] = useState<'grid' | 'table'>('grid');
  const [activeQrProduct, setActiveQrProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  useEffect(() => { setProducts(initialProducts); }, [initialProducts]);

  const foodProducts  = products.filter(p => p.product_type === 'food');
  const stockProducts = products.filter(p => p.product_type === 'stock');
  const lowStockCount = stockProducts.filter(isLowStock).length;

  const filtered = (list: Product[]) =>
    list.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const handleSaved = (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAdjust = async (id: number, delta: number) => {
    const result = await adjustStockQuantityAction(id, delta);
    if (result.success && result.newQuantity !== undefined) {
      setProducts(prev => prev.map(p =>
        p.id === id ? { ...p, stock_quantity: result.newQuantity! } : p
      ));
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center bg-[#0f1115]/60 p-5 rounded-2xl border border-slate-800/60 backdrop-blur-md gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-xl text-blue-400 shadow-inner">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Product Inventory</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage food menu items and stock inventory separately.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search items…"
            className="bg-[#090a0f] border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all w-56"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800/60 pb-0">
        <button
          onClick={() => setActiveTab('food')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition-all
            ${activeTab === 'food'
              ? 'text-white border-blue-500 bg-blue-500/5'
              : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
          <Utensils className="h-4 w-4" />
          Food Menu
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
            ${activeTab === 'food' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-500'}`}>
            {foodProducts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition-all
            ${activeTab === 'stock'
              ? 'text-white border-violet-500 bg-violet-500/5'
              : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
          <Package className="h-4 w-4" />
          Stock Inventory
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
            ${activeTab === 'stock' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-800 text-slate-500'}`}>
            {stockProducts.length}
          </span>
          {lowStockCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/20">
              <AlertTriangle className="h-2.5 w-2.5" />{lowStockCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {isPending ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            <span className="text-xs font-medium tracking-wide">Syncing database…</span>
          </div>
        </div>
      ) : activeTab === 'food' ? (
        filtered(foodProducts).length === 0 ? (
          <div className="flex-1 border border-dashed border-slate-800/80 rounded-3xl flex flex-col items-center justify-center p-12 bg-[#0f1115]/20">
            <Utensils className="h-8 w-8 text-slate-600 mb-3" />
            <span className="text-sm font-semibold text-slate-400">No food items found</span>
          </div>
        ) : (
          <FoodInventory
            products={filtered(foodProducts)}
            viewMode={foodViewMode}
            setViewMode={setFoodViewMode}
            onEdit={p => setEditingProduct(p)}
            onQr={p => setActiveQrProduct(p)}
          />
        )
      ) : (
        filtered(stockProducts).length === 0 ? (
          <div className="flex-1 border border-dashed border-slate-800/80 rounded-3xl flex flex-col items-center justify-center p-12 bg-[#0f1115]/20">
            <Package className="h-8 w-8 text-slate-600 mb-3" />
            <span className="text-sm font-semibold text-slate-400">No stock items found</span>
            <p className="text-xs text-slate-600 mt-1">Add stock items from the &ldquo;Add Product&rdquo; panel and choose Stock type.</p>
          </div>
        ) : (
          <StockInventory
            products={filtered(stockProducts)}
            viewMode={stockViewMode}
            setViewMode={setStockViewMode}
            onEdit={p => setEditingProduct(p)}
            onQr={p => setActiveQrProduct(p)}
            onAdjust={handleAdjust}
          />
        )
      )}

      {/* Modals */}
      {mounted && activeQrProduct && (
        <QrModal product={activeQrProduct} onClose={() => setActiveQrProduct(null)} />
      )}
      {mounted && editingProduct && editingProduct.product_type === 'food' && (
        <FoodEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={updated => { handleSaved(updated); setEditingProduct(null); }}
        />
      )}
      {mounted && editingProduct && editingProduct.product_type === 'stock' && (
        <StockEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={updated => { handleSaved(updated); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}