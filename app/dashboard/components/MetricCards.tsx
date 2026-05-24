"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, TrendingUp, Package, Sparkles, Plus, X, Loader2, Receipt, AlertTriangle, Pencil } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis } from 'recharts';
import { createClient } from "@supabase/supabase-js";
import { getDateRange, ViewMode } from '../../lib/getDataRange';

const supabase = createClient(
  process.env.NEXT_PUBLIC_DATABASE_URL!,
  process.env.NEXT_PUBLIC_DATABASE_KEY!
);

const areaData = [
  { name: '15', value: 30 }, { name: '16', value: 25 }, { name: '17', value: 35 },
  { name: '18', value: 20 }, { name: '19', value: 30 }, { name: '20', value: 40 },
  { name: '21', value: 38 }, { name: '22', value: 45 }, { name: '23', value: 42 },
  { name: '24', value: 50 },
];

// ─── Overlay ──────────────────────────────────────────────────────────────────
function AddCostOverlay({
  onClose,
  onSaved,
  initialData,
}: {
  onClose: () => void;
  onSaved: (amount: number, label: string) => void;
  initialData?: { id: string; amount: number; label: string };
}) {
  const [amount, setAmount] = useState(initialData?.amount.toString() || "");
  const [label, setLabel] = useState(initialData?.label || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setError("Enter a valid amount."); return; }
    if (!label.trim()) { setError("Add a short description."); return; }
    setSaving(true);
    setError(null);
    if (initialData) {
      const { error: sbError } = await supabase
        .from("daily_costs")
        .update({ amount: parsed, label: label.trim() })
        .eq("id", initialData.id);
      if (sbError) { setError(sbError.message); setSaving(false); return; }
    } else {
      const { error: sbError } = await supabase.from("daily_costs").insert({
        amount: parsed,
        label: label.trim(),
        recorded_at: new Date().toISOString(),
      });
      if (sbError) { setError(sbError.message); setSaving(false); return; }
    }
    onSaved(parsed, label.trim());
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  }

  return (
    <div className="absolute inset-0 z-50 rounded-3xl flex flex-col justify-between bg-[#0b0d12]/95 backdrop-blur-md border border-rose-500/20 p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">
              {initialData ? "Edit Cost" : "Log Cost"}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1">
            {initialData ? "Updating existing entry" : "Saved to today's expenses"}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 bg-slate-900 rounded-lg text-slate-500 hover:text-white transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-rose-400 pointer-events-none">₱</span>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#12141c] border border-slate-800 focus:border-rose-500/50 rounded-xl pl-8 pr-4 py-3 text-xl font-semibold text-white placeholder:text-slate-700 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <input
          type="text"
          placeholder="Description (e.g. Supplies, Rent)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={60}
          className="w-full bg-[#12141c] border border-slate-800 focus:border-rose-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-700 outline-none transition-colors"
        />
        {error && <p className="text-[10px] text-rose-400 font-medium">{error}</p>}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-rose-500/90 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? "Update Cost" : "Save Cost")}
      </button>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TopProduct {
  product_name: string;
  product_category: string | null;
  total_quantity: number;
  total_revenue: number;
  revenue_pct: number;
}

interface ProductStat {
  product_name: string;
  product_category: string | null;
  total_quantity: number;
  total_revenue: number;
}

interface Insight {
  type: 'push' | 'warning' | 'opportunity';
  label: string;
  product: string;
  detail: string;
}

interface MetricCardsProps {
  selectedDate: Date;
  viewMode: ViewMode;
}

interface CostRow {
  id: string;
  label: string;
  amount: number;
  source: 'manual' | 'stock';
}

// ─── Insight engine ───────────────────────────────────────────────────────────
function computeInsight(products: ProductStat[], totalIncome: number, totalCost: number): Insight | null {
  if (products.length === 0) return null;
  const sorted = [...products].sort((a, b) => b.total_quantity - a.total_quantity);
  const top = sorted[0];
  const grandRevenue = products.reduce((s, p) => s + p.total_revenue, 0);
  if (sorted.length >= 2 && (top.total_revenue / grandRevenue) > 0.5) {
    const second = sorted[1];
    return {
      type: 'opportunity',
      label: 'Growth Opportunity',
      product: second.product_name,
      detail: `${top.product_name} drives ${Math.round((top.total_revenue / grandRevenue) * 100)}% of revenue. Push ${second.product_name} (${second.total_quantity} units) to reduce dependency and grow total sales.`,
    };
  }
  if (totalIncome > 0 && (totalCost / totalIncome) > 0.7) {
    return {
      type: 'warning',
      label: 'Margin Alert',
      product: top.product_name,
      detail: `Costs are ${Math.round((totalCost / totalIncome) * 100)}% of income. Prioritize high-volume items like ${top.product_name} (${top.total_quantity} units) to maximize revenue per transaction.`,
    };
  }
  return {
    type: 'push',
    label: 'Top Recommendation',
    product: top.product_name,
    detail: `${top.product_name} leads with ${top.total_quantity} units and ₱${top.total_revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })} revenue — ${Math.round((top.total_revenue / grandRevenue) * 100)}% of total. Keep stock ready and prioritize this item.`,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MetricCards({ selectedDate, viewMode }: MetricCardsProps) {
  const [showCostOverlay, setShowCostOverlay] = useState(false);
  const [editingCost, setEditingCost] = useState<{ id: string; amount: number; label: string } | undefined>();
  const [periodCost, setPeriodCost] = useState(0);
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [periodIncome, setPeriodIncome] = useState(0);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [topProduct, setTopProduct] = useState<TopProduct | null>(null);
  const [topLoading, setTopLoading] = useState(true);
  const [incomeLoading, setIncomeLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<ProductStat[]>([]);
  const [insight, setInsight] = useState<Insight | null>(null);

  // ── Fetch income + costs (manual + auto stock COGS) ──────────────────────
  async function fetchIncomeAndCosts() {
    setIncomeLoading(true);
    const { start, end } = getDateRange(selectedDate, viewMode);

    // Single query — pull everything needed for both income and COGS
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("product_id, product_name, product_type, unit_price, unit_cost, quantity, total_price")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (ordersError || !ordersData) {
      setPeriodIncome(0);
      setCostRows([]);
      setPeriodCost(0);
      setIncomeLoading(false);
      return;
    }

    // ── Income ──────────────────────────────────────────────────────────────
    // total_price on every order already stores unit_price * qty at time of sale,
    // so we can sum it directly — no extra products fetch needed.
    const income = ordersData.reduce(
      (sum: number, r: any) => sum + Number(r.total_price),
      0
    );
    setPeriodIncome(income);

    // ── Manual costs ────────────────────────────────────────────────────────
    const { data: costsData, error: costsError } = await supabase
      .from("daily_costs")
      .select("id, amount, label")
      .gte("recorded_at", start.toISOString())
      .lte("recorded_at", end.toISOString());

    const manualRows: CostRow[] = !costsError && costsData
      ? costsData.map((c: any) => ({
          id: c.id,
          label: c.label,
          amount: Number(c.amount),
          source: 'manual' as const,
        }))
      : [];

    // ── Stock COGS — auto from unit_cost stored on each order ───────────────
    // unit_cost is written at order-save time (= product.price at that moment),
    // so no extra products lookup is needed, and historical costs stay accurate
    // even if the product's cost price changes later.
    const stockOrders = ordersData.filter((r: any) => r.product_type === 'stock');

    // Group by product name so we show one pill per product, not one per order
    const stockCogMap: Record<string, { qty: number; unitCost: number }> = {};
    for (const r of stockOrders) {
      const unitCost = Number(r.unit_cost ?? 0);
      // Skip rows where cost wasn't recorded (old orders before the column existed)
      if (unitCost <= 0) continue;
      if (!stockCogMap[r.product_name]) {
        stockCogMap[r.product_name] = { qty: 0, unitCost };
      }
      stockCogMap[r.product_name].qty += Number(r.quantity ?? 1);
    }

    const stockCostRows: CostRow[] = Object.entries(stockCogMap).map(
      ([name, { qty, unitCost }]) => ({
        id: `stock__${name}`,
        label: `${name} (stock)`,
        amount: parseFloat((unitCost * qty).toFixed(2)),
        source: 'stock' as const,
      })
    );

    const allRows = [...manualRows, ...stockCostRows];
    setCostRows(allRows);
    setPeriodCost(allRows.reduce((s, r) => s + r.amount, 0));
    setIncomeLoading(false);
  }

  // ── Fetch top product ────────────────────────────────────────────────────
  async function fetchTopProduct() {
    setTopLoading(true);
    const { start, end } = getDateRange(selectedDate, viewMode);

    const { data, error } = await supabase
      .from("orders")
      .select("product_id, product_name, product_category, product_type, quantity, total_price")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (error || !data || data.length === 0) {
      setTopProduct(null);
      setAllProducts([]);
      setInsight(null);
      setTopLoading(false);
      return;
    }

    // total_price already reflects the actual selling price at time of order
    const totals: Record<string, ProductStat> = {};
    for (const row of data) {
      const key = row.product_name;
      if (!totals[key]) {
        totals[key] = {
          product_name: row.product_name,
          product_category: row.product_category ?? null,
          total_quantity: 0,
          total_revenue: 0,
        };
      }
      totals[key].total_quantity += Number(row.quantity);
      totals[key].total_revenue  += Number(row.total_price);
    }

    const sorted = Object.values(totals).sort((a, b) => b.total_quantity - a.total_quantity);
    const top = sorted[0];
    const grandTotal = sorted.reduce((sum, p) => sum + p.total_revenue, 0);
    const revenue_pct = grandTotal > 0 ? Math.round((top.total_revenue / grandTotal) * 100) : 0;
    setTopProduct({ ...top, revenue_pct });
    setAllProducts(sorted);
    setTopLoading(false);
  }

  useEffect(() => { fetchIncomeAndCosts(); }, [selectedDate, viewMode]);
  useEffect(() => { fetchTopProduct(); },    [selectedDate, viewMode]);

  useEffect(() => {
    if (!topLoading && !incomeLoading) {
      setInsight(computeInsight(allProducts, periodIncome, periodCost));
    }
  }, [allProducts, periodIncome, periodCost, topLoading, incomeLoading]);

  function handleCostSaved() {
    fetchIncomeAndCosts();
    setSavedToast("Changes saved");
    setTimeout(() => setSavedToast(null), 3000);
  }

  // ── Derived display values ────────────────────────────────────────────────
  const netValue    = periodIncome - periodCost;
  const isProfit    = netValue >= 0;
  const statusStyles = isProfit
    ? "border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]"
    : "border-rose-500/30 shadow-[0_0_15px_-3px_rgba(244,63,94,0.1)]";

  const costPct     = periodIncome > 0 ? ((periodCost / periodIncome) * 100).toFixed(1) : "0.0";
  const periodLabel = viewMode === 'day' ? 'Today' : viewMode === 'week' ? 'This Week' : 'This Month';

  const insightColors = {
    push:        { badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', icon: <TrendingUp className="h-3 w-3" />,    bar: 'from-emerald-500/20' },
    warning:     { badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',       icon: <AlertTriangle className="h-3 w-3" />, bar: 'from-amber-500/20'   },
    opportunity: { badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',    icon: <Sparkles className="h-3 w-3" />,      bar: 'from-indigo-500/20'  },
  };
  const colors = insight ? insightColors[insight.type] : insightColors.push;

  const manualCostRows    = costRows.filter(r => r.source === 'manual');
  const stockCostRowsDisp = costRows.filter(r => r.source === 'stock');
  const stockCostTotal    = stockCostRowsDisp.reduce((s, r) => s + r.amount, 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="grid grid-cols-3 gap-6">

      {/* ── Card 1: Performance ── */}
      <div className={`bg-[#0f1115] border rounded-3xl p-6 relative flex flex-col justify-between overflow-hidden group h-[260px] ${statusStyles}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent opacity-40" />

        {(showCostOverlay || editingCost) && (
          <AddCostOverlay
            initialData={editingCost}
            onClose={() => { setShowCostOverlay(false); setEditingCost(undefined); }}
            onSaved={handleCostSaved}
          />
        )}

        {savedToast && (
          <div className="absolute bottom-4 left-4 right-4 z-30 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-[10px] text-emerald-400 font-medium animate-in fade-in slide-in-from-bottom-1 duration-300">
            ✓ {savedToast}
          </div>
        )}

        <div className="z-10">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-400">Performance · {periodLabel}</span>
            <button className="p-1.5 bg-[#161920] border border-slate-800/80 rounded-lg hover:bg-[#1f242e] transition-all">
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex flex-col gap-4 mt-5">

            {/* Income */}
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Income</p>
              {incomeLoading ? (
                <div className="h-8 w-36 rounded-lg bg-slate-800/60 animate-pulse mt-1" />
              ) : (
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-semibold text-blue-400 tracking-tight">
                    ₱{periodIncome.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                  {periodIncome > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isProfit ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"}`}>
                      {isProfit ? "PROFIT" : "LOSS"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Cost */}
            <div className="border-t border-slate-800/60 pt-3">
              <div className="flex justify-between items-center">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Cost</p>
                <button
                  onClick={() => setShowCostOverlay(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 rounded-lg text-[10px] font-semibold text-rose-400 transition-all group/btn"
                >
                  <Plus className="h-3 w-3 group-hover/btn:rotate-90 transition-transform duration-200" />
                  Add Cost
                </button>
              </div>

              {incomeLoading ? (
                <div className="h-8 w-32 rounded-lg bg-slate-800/60 animate-pulse mt-1" />
              ) : (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-rose-500 tracking-tight">
                      ₱{periodCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{costPct}% of income</span>
                  </div>

                  {/* Cost breakdown pills */}
                  <div className="flex flex-wrap gap-1 mt-0.5">

                    {/* Stock COGS — one aggregated pill showing the total, expandable per-product */}
                    {stockCostTotal > 0 && (
                      <div className="group/stock relative">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[9px] text-violet-300 font-medium select-none cursor-default">
                          <Package className="h-2.5 w-2.5" />
                          Stock COGS: ₱{stockCostTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </div>
                        {/* Per-product breakdown on hover */}
                        {stockCostRowsDisp.length > 1 && (
                          <div className="absolute bottom-full left-0 mb-1.5 z-20 hidden group-hover/stock:flex flex-col gap-1 bg-[#0f1115] border border-violet-500/20 rounded-xl p-2 shadow-xl min-w-[160px]">
                            <p className="text-[8px] text-violet-400 font-semibold uppercase tracking-widest mb-0.5">Per product</p>
                            {stockCostRowsDisp.map(r => (
                              <div key={r.id} className="flex justify-between gap-3 text-[9px]">
                                <span className="text-slate-400 truncate max-w-[100px]">{r.label.replace(' (stock)', '')}</span>
                                <span className="text-violet-300 font-semibold shrink-0">
                                  ₱{r.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual cost pills — click to edit */}
                    {manualCostRows.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setEditingCost({ id: c.id, amount: c.amount, label: c.label })}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/40 hover:bg-slate-800 rounded text-[9px] text-slate-400 border border-slate-700 transition-colors"
                      >
                        <Pencil className="h-2 w-2" />
                        {c.label}: ₱{c.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </button>
                    ))}
                  </div>

                  {/* Net profit/loss line */}
                  {(periodIncome > 0 || periodCost > 0) && (
                    <div className={`flex items-center justify-between mt-1 pt-1.5 border-t border-slate-800/40`}>
                      <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-widest">Net</span>
                      <span className={`text-[11px] font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}₱{netValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 2: Top Selling Item ── */}
      <div className="bg-[#0f1115] border border-slate-800/50 rounded-3xl p-6 flex flex-col h-[260px] relative overflow-hidden group">
        <div className="z-10 flex flex-col h-full">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-400">Top Selling Item · {periodLabel}</span>
            <button className="p-1.5 bg-[#161920] border border-slate-800/80 rounded-lg hover:bg-[#1f242e] transition-all">
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
          {topLoading ? (
            <div className="flex flex-col gap-2 mt-3 animate-pulse">
              <div className="h-7 w-48 rounded-lg bg-slate-800/60" />
              <div className="h-4 w-28 rounded-lg bg-slate-800/40" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-28 rounded-lg bg-slate-800/40" />
                <div className="h-6 w-24 rounded-lg bg-slate-800/40" />
              </div>
            </div>
          ) : topProduct ? (
            <div className="flex flex-col gap-1 mt-3">
              <span className="text-2xl font-semibold text-white tracking-tight truncate max-w-[240px]">{topProduct.product_name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {topProduct.total_quantity} units sold
                </span>
                {topProduct.product_category && <span className="text-[10px] text-slate-500">{topProduct.product_category}</span>}
              </div>
              <div className="flex gap-2 mt-4">
                <span className="text-[11px] bg-[#161920] border border-slate-800 px-2.5 py-1 rounded-lg text-slate-400 flex items-center gap-1.5">
                  <Package className="h-3 w-3" /> {topProduct.total_quantity} units
                </span>
                <span className="text-[11px] bg-[#161920] border border-slate-800 px-2.5 py-1 rounded-lg text-slate-400 flex items-center gap-1.5">
                  {topProduct.revenue_pct}% of gross revenue
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 mt-4">
              <Package className="h-6 w-6 text-slate-700" />
              <p className="text-xs text-slate-500">No orders in this period</p>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 w-full overflow-hidden rounded-b-3xl">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide padding={{ left: 0, right: 0 }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#balanceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Card 3: Sales Insight ── */}
      <div className="bg-[#0f1115] border border-slate-800/50 rounded-3xl p-6 relative flex flex-col justify-between overflow-hidden group h-[260px]">
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bar} via-transparent to-transparent opacity-40`} />
        <div className="relative z-10 flex flex-col h-full gap-3">
          <div className="flex justify-between items-start shrink-0">
            <span className="text-sm font-medium text-slate-400">Sales Insight · {periodLabel}</span>
            <button className="p-1.5 bg-[#161920] border border-slate-800/80 rounded-lg hover:bg-[#1f242e] transition-all">
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
          {topLoading || incomeLoading ? (
            <div className="flex flex-col gap-2 animate-pulse flex-1 justify-center">
              <div className="h-3 w-24 rounded-full bg-slate-800/60" />
              <div className="h-3 w-full rounded-full bg-slate-800/60 mt-2" />
              <div className="h-3 w-5/6 rounded-full bg-slate-800/50" />
              <div className="h-3 w-4/6 rounded-full bg-slate-800/40" />
            </div>
          ) : insight ? (
            <div className="flex flex-col gap-3 flex-1">
              <span className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${colors.badge}`}>
                {colors.icon}
                {insight.label}
              </span>
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                {insight.detail}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-2">
              <Package className="h-6 w-6 text-slate-700" />
              <p className="text-xs text-slate-500">No data to analyze</p>
              <p className="text-[10px] text-slate-600">Orders will appear once sales are recorded</p>
            </div>
          )}
          <div className="shrink-0 border-t border-slate-800/40 pt-3 flex justify-between items-center">
            <div className="flex gap-1.5">
              {allProducts.slice(0, 3).map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
              ))}
            </div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-semibold">
              {allProducts.length} product{allProducts.length !== 1 ? "s" : ""} analyzed
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}