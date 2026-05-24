"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateProductAction } from '@/app/actions/productActions';
import { Utensils, Search, SlidersHorizontal, Loader2, Calendar, Trash2, QrCode, Layers, ArrowUpRight, CheckCircle2, Edit3, Save, Image as ImageIcon, LayoutGrid, Table as TableIcon } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string | null;
  image_url: string | null;
  qr_code_url: string | null;
  created_at: string;
}

interface ManageFoodContentProps {
  products: Product[];
  isPending: boolean;
}

export default function ManageFoodContent({ products: initialProducts, isPending }: ManageFoodContentProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProductQr, setActiveProductQr] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editImage, setEditImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setProducts(initialProducts);
    return () => setMounted(false);
  }, [initialProducts]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStartEdit = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price);
    setEditImage(product.image_url);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || editPrice <= 0) return;

    setIsSaving(true);
    try {
      const result = await updateProductAction(
        editingProduct.id, 
        editName, 
        editPrice, 
        editImage !== editingProduct.image_url ? editImage : null
      );
      
      if (!result.success) throw new Error(result.error || "Failed update.");

      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id ? { ...p, name: editName, price: editPrice, image_url: editImage } : p
      ));
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex justify-between items-center bg-[#0f1115]/60 p-5 rounded-2xl border border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-xl text-blue-400 shadow-inner">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Food Product Inventory</h2>
            <p className="text-xs text-slate-400 mt-0.5">Review system configurations, adjust price margins, and manage active catalog nodes.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#090a0f] border border-slate-800/80 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food items..." 
              className="bg-[#090a0f] border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all w-64"
            />
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            <span className="text-xs font-medium tracking-wide">Syncing Supabase Database Assets...</span>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex-1 border border-dashed border-slate-800/80 rounded-3xl flex flex-col items-center justify-center p-12 bg-[#0f1115]/20">
          <div className="p-4 bg-slate-900/40 rounded-full mb-3 text-slate-500">
            <Layers className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-slate-300">No Food Records Found</span>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-1 max-h-[calc(100vh-180px)]">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-[#0f1115]/80 border border-slate-800/70 rounded-2xl overflow-hidden shadow-2xl hover:border-slate-700/80 transition-all duration-300 flex flex-col group relative">
                  <div className="h-48 w-full relative bg-[#06070a] overflow-hidden border-b border-slate-900">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 bg-gradient-to-b from-[#13161f] to-[#0d0f14]"><Utensils className="h-10 w-10 opacity-40" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60" />
                    {product.category && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#090a0f]/80 backdrop-blur-md rounded-lg border border-slate-800/60 text-[10px] text-slate-300 font-semibold tracking-wide uppercase max-w-[140px] truncate">{product.category}</div>
                    )}
                    <button onClick={(e) => handleStartEdit(product, e)} className="absolute top-3 right-3 px-2.5 py-1.5 bg-[#090a0f]/90 hover:bg-blue-600 backdrop-blur-md border border-slate-800/60 hover:border-blue-500 rounded-lg flex items-center gap-1 text-[10px] text-slate-300 hover:text-white font-bold tracking-wider transition-all duration-200 shadow-lg">
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-4 flex-1 justify-between">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-white text-base tracking-tight line-clamp-1 group-hover:text-blue-400 transition-colors duration-200">{product.name}</h4>
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
                        <button onClick={() => setActiveProductQr(product)} className="flex items-center justify-center gap-2 py-2 px-3 bg-[#12151c] hover:bg-[#191e29] border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95">
                          <QrCode className="h-3.5 w-3.5 text-blue-400" />
                          <span>View QR</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center py-2 px-3 bg-[#12151c]/40 border border-slate-900 text-slate-600 rounded-xl text-xs font-semibold select-none">No QR Code</div>
                      )}
                      <button className="flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95">
                        <Trash2 className="h-3.5 w-3.5 opacity-80" />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#0f1115]/80 border border-slate-800/70 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] uppercase tracking-widest">
                    <th className="p-4">Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 text-sm">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-800/40 hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        {product.image_url && <img src={product.image_url} className="w-10 h-10 rounded-lg object-cover bg-slate-800" alt="" />}
                        <span className="font-medium text-white">{product.name}</span>
                      </td>
                      <td className="p-4">{product.category || '-'}</td>
                      <td className="p-4 text-emerald-400 font-bold">₱{Number(product.price).toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={(e) => handleStartEdit(product, e)} className="p-2 hover:bg-slate-800 rounded-lg"><Edit3 className="h-4 w-4" /></button>
                          {product.qr_code_url && <button onClick={() => setActiveProductQr(product)} className="p-2 hover:bg-slate-800 rounded-lg"><QrCode className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeProductQr && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0f1115] border border-slate-800/90 p-7 rounded-3xl flex flex-col items-center gap-5 relative max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setActiveProductQr(null)} className="absolute top-4 right-4 p-2 bg-[#161920] hover:bg-[#1f242e] border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-all">
              <X className="h-4 w-4" />
            </button>
            <div className="text-center mt-2 space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                <CheckCircle2 className="h-3 w-3" /> Digital Menu Link
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight pt-1">Product QR</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-2xl ring-4 ring-blue-600/10">
              <img src={activeProductQr.qr_code_url || ""} alt="QR Code" className="w-64 h-64 select-none object-contain" />
            </div>
            <div className="w-full bg-[#161920]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center gap-1">
              <p className="text-sm font-bold text-white tracking-tight">{activeProductQr.name}</p>
              <div className="flex items-baseline text-emerald-400 font-extrabold text-sm tracking-tight">
                <span className="text-[10px] font-semibold text-emerald-500/80 mr-0.5">₱</span>
                {Number(activeProductQr.price).toFixed(2)}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingProduct && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f1115] border border-slate-800 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Edit Item Configuration</h3>
                <p className="text-xs text-slate-500 mt-1">Adjust pricing, display names, and inventory metadata.</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-2 text-slate-500 hover:text-white bg-slate-900/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveChanges} className="p-8 space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-800 bg-[#06070a]">
                  {editImage ? (
                    <img src={editImage} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon /></div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Edit3 className="h-5 w-5" />
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                <p className="text-xs text-slate-400">Click image to update.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest pl-1">Food Name</label>
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-[#06070a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest pl-1">Price per serving (₱)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm font-semibold text-slate-600">₱</span>
                    <input type="number" step="0.01" required min="0.01" value={editPrice || ''} onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)} className="w-full bg-[#06070a] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-3 px-4 bg-[#161920] hover:bg-[#1f242e] border border-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-all">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-200 text-black font-bold rounded-xl text-sm transition-all disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Saving..." : "Update Food Details"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}