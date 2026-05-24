"use client";

import React, { useEffect, useState } from "react";
import { ShoppingBag, Package, Layers, Tag, Box, RefreshCw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getDateRange, ViewMode } from "../../lib/getDataRange";

const supabase = createClient(
  process.env.NEXT_PUBLIC_DATABASE_URL!,
  process.env.NEXT_PUBLIC_DATABASE_KEY!
);

interface Order {
  id: string;
  product_id: string;
  product_name: string;
  product_category: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  source: "qr_scan" | "manual";
  created_at: string;
  synced_at: string | null;
  product_type: "food" | "stock" | null;
  unit_cost: number | null;
  selling_price?: number | null;
}

interface TransactionsListProps {
  selectedDate: Date;
  viewMode: ViewMode;
}

function CategoryIcon({ category }: { category: string | null }) {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("subscription") || cat.includes("service")) return <Layers className="h-3.5 w-3.5 text-blue-400" />;
  if (cat.includes("food") || cat.includes("grocery")) return <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />;
  if (cat.includes("tech") || cat.includes("software") || cat.includes("app")) return <Box className="h-3.5 w-3.5 text-violet-400" />;
  if (cat.includes("clothing") || cat.includes("fashion")) return <Tag className="h-3.5 w-3.5 text-pink-400" />;
  return <Package className="h-3.5 w-3.5 text-slate-400" />;
}

function SourceBadge({ source }: { source: Order["source"] }) {
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-wide uppercase ${
      source === "qr_scan"
        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
        : "bg-slate-700/40 text-slate-500 border border-slate-700/40"
    }`}>
      {source === "qr_scan" ? "QR" : "Manual"}
    </span>
  );
}

function StockBadge() {
  return (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-wide uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
      Stock
    </span>
  );
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#161920]/30 border border-slate-900/50 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-slate-800/60" />
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-28 rounded-full bg-slate-800/60" />
          <div className="h-2 w-16 rounded-full bg-slate-800/40" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-2.5 w-14 rounded-full bg-slate-800/60" />
        <div className="h-2 w-10 rounded-full bg-slate-800/40" />
      </div>
    </div>
  );
}

export default function TransactionsList({ selectedDate, viewMode }: TransactionsListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchOrders(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const { start, end } = getDateRange(selectedDate, viewMode);

    const { data: ordersData, error: sbError } = await supabase
      .from("orders")
      .select("id, product_id, product_name, product_category, unit_price, quantity, total_price, source, created_at, synced_at, product_type, unit_cost")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(30);

    if (sbError) {
      setError(sbError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const rows = (ordersData ?? []) as Order[];

    const stockProductIds = [
      ...new Set(
        rows
          .filter(o => o.product_type === "stock")
          .map(o => o.product_id)
      ),
    ];

    const sellingPriceMap: Record<string, number> = {};

    if (stockProductIds.length > 0) {
      const { data: productData } = await supabase
        .from("products")
        .select("id, selling_price")
        .in("id", stockProductIds);

      if (productData) {
        for (const p of productData) {
          if (p.selling_price != null) {
            sellingPriceMap[String(p.id)] = Number(p.selling_price);
          }
        }
      }
    }

    const enriched = rows.map(o => ({
      ...o,
      selling_price: o.product_type === "stock"
        ? (sellingPriceMap[String(o.product_id)] ?? null)
        : null,
    }));

    setOrders(enriched);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchOrders();
  }, [selectedDate, viewMode]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const { start, end } = getDateRange(selectedDate, viewMode);
        const newOrder = payload.new as Order;
        const createdAt = new Date(newOrder.created_at);
        if (createdAt >= start && createdAt <= end) {
          fetchOrders();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, viewMode]);

  const totalRevenue = orders.reduce((sum, o) => {
    const isStock = o.product_type === "stock";
    const total = isStock && o.selling_price != null
      ? o.selling_price * Number(o.quantity)
      : Number(o.total_price);
    return sum + total;
  }, 0);

  const totalUnits  = orders.reduce((sum, o) => sum + Number(o.quantity), 0);
  const periodLabel = viewMode === "day" ? "Today" : viewMode === "week" ? "This Week" : "This Month";

  return (
    <div className="bg-[#0f1115] border border-slate-800/50 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden h-[400px]">
      <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-blue-500/40 via-transparent to-transparent" />

      <div className="flex justify-between items-start shrink-0">
        <div>
          <span className="text-sm font-medium text-slate-400">Orders · {periodLabel}</span>
          {!loading && !error && (
            <p className="text-[10px] text-slate-600 mt-0.5">
              {orders.length} order{orders.length !== 1 ? "s" : ""} · {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
              {orders.length > 0 && (
                <span className="ml-1 text-emerald-600">
                  · ₱{totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })} total
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="p-1.5 bg-[#161920] border border-slate-800/80 rounded-lg hover:bg-[#1f242e] transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-1.5
        [&::-webkit-scrollbar]:w-1
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-slate-800/60
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-slate-700/80">

        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-xs text-red-400 font-medium">Failed to load orders</p>
            <p className="text-[10px] text-slate-600 max-w-[180px]">{error}</p>
            <button onClick={() => fetchOrders()} className="mt-1 text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <Package className="h-6 w-6 text-slate-700" />
            <p className="text-xs text-slate-500">No orders in this period</p>
            <p className="text-[10px] text-slate-600">Try selecting a different date range</p>
          </div>
        )}

        {!loading && !error && orders.map((order) => {
          const isStock = order.product_type === "stock";

          const displayUnitPrice = isStock && order.selling_price != null
            ? order.selling_price
            : Number(order.unit_price);

          const displayTotal = isStock && order.selling_price != null
            ? order.selling_price * Number(order.quantity)
            : Number(order.total_price);

          return (
            <div
              key={order.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors group
                ${isStock
                  ? "bg-violet-500/5 border-violet-900/40 hover:bg-violet-500/10"
                  : "bg-[#161920]/30 border-slate-900/50 hover:bg-[#161920]/60"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0
                  ${isStock ? "bg-violet-500/10 border-violet-800/40" : "bg-black border-slate-800"}`}>
                  {isStock
                    ? <Package className="h-3.5 w-3.5 text-violet-400" />
                    : <CategoryIcon category={order.product_category} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate leading-tight">{order.product_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <SourceBadge source={order.source} />
                    {isStock && <StockBadge />}
                    {order.quantity > 1 && (
                      <span className="text-[9px] text-slate-600">×{order.quantity}</span>
                    )}
                    {order.product_category && (
                      <span className="text-[9px] text-slate-600 truncate">{order.product_category}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 ml-2">
                <span className={`text-xs font-semibold ${isStock ? "text-violet-300" : "text-white"}`}>
                  ₱{displayTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5">
                  ₱{displayUnitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })} each
                </span>
                <span className="text-[9px] text-slate-600 mt-0.5">{relativeTime(order.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}