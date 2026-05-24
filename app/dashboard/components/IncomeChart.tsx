"use client";

import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { createClient } from "@supabase/supabase-js";
import { ViewMode } from '../../hooks/useCalendarPicker';
import { getDateRange } from '../../lib/getDataRange';

const supabase = createClient(
  process.env.NEXT_PUBLIC_DATABASE_URL!,
  process.env.NEXT_PUBLIC_DATABASE_KEY!
);

interface IncomeChartProps {
  selectedDate: Date;
  viewMode: ViewMode;
}

interface ChartPoint {
  date_key: string;
  total_income: number;
  total_cost: number;
}

const CustomIncomeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161920] border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[160px]">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {payload[0].payload.date_key}
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-4 justify-between">
            <span className="text-slate-400">Total Income:</span>
            <span className="font-semibold text-blue-400">
              ₱{Number(payload[0].payload.total_income).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-4 justify-between">
            <span className="text-slate-400">Cost Budget:</span>
            <span className="font-semibold text-rose-400">
              ₱{Number(payload[0].payload.total_cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ── helpers ────────────────────────────────────────────────────────────────────

/** Returns an array of date-key strings for the given range and viewMode */
function buildDateKeys(start: Date, end: Date, viewMode: ViewMode): string[] {
  const keys: string[] = [];
  const cur = new Date(start);

  if (viewMode === 'day') {
    // hourly buckets: "00", "01", … "23"
    for (let h = 0; h < 24; h++) {
      keys.push(String(h).padStart(2, '0') + ':00');
    }
  } else if (viewMode === 'week') {
    // daily buckets: "Mon 19", "Tue 20", …
    while (cur <= end) {
      keys.push(cur.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric' }));
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    // monthly — daily buckets: "May 1", "May 2", …
    while (cur <= end) {
      keys.push(cur.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return keys;
}

/** Maps a Date to the bucket key used above */
function dateToKey(date: Date, viewMode: ViewMode): string {
  if (viewMode === 'day') {
    return String(date.getHours()).padStart(2, '0') + ':00';
  } else if (viewMode === 'week') {
    return date.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }
}

// ── component ──────────────────────────────────────────────────────────────────

export default function IncomeChart({ selectedDate, viewMode }: IncomeChartProps) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      const { start, end } = getDateRange(selectedDate, viewMode);

      // ── 1. Orders → income + stock COGS ──────────────────────────────────
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("created_at, total_price, unit_cost, quantity, product_type")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      // ── 2. Manual costs ───────────────────────────────────────────────────
      const { data: costsData, error: costsError } = await supabase
        .from("daily_costs")
        .select("recorded_at, amount")
        .gte("recorded_at", start.toISOString())
        .lte("recorded_at", end.toISOString());

      // ── 3. Build zero-filled buckets ──────────────────────────────────────
      const keys = buildDateKeys(start, end, viewMode);
      const incomeMap: Record<string, number> = Object.fromEntries(keys.map(k => [k, 0]));
      const costMap:   Record<string, number> = Object.fromEntries(keys.map(k => [k, 0]));

      // Fill income + stock COGS
      if (!ordersError && ordersData) {
        for (const row of ordersData) {
          const key = dateToKey(new Date(row.created_at), viewMode);
          if (!(key in incomeMap)) continue;

          incomeMap[key] += Number(row.total_price);

          // Stock COGS
          if (row.product_type === 'stock') {
            const unitCost = Number(row.unit_cost ?? 0);
            if (unitCost > 0) {
              costMap[key] += unitCost * Number(row.quantity ?? 1);
            }
          }
        }
      }

      // Fill manual costs
      if (!costsError && costsData) {
        for (const row of costsData) {
          const key = dateToKey(new Date(row.recorded_at), viewMode);
          if (key in costMap) {
            costMap[key] += Number(row.amount);
          }
        }
      }

      // ── 4. Assemble final array ───────────────────────────────────────────
      setChartData(
        keys.map(k => ({
          date_key:     k,
          total_income: parseFloat(incomeMap[k].toFixed(2)),
          total_cost:   parseFloat(costMap[k].toFixed(2)),
        }))
      );
      setLoading(false);
    }

    fetchChartData();
  }, [selectedDate, viewMode]);

  const maxVal = Math.max(...chartData.map(d => Math.max(d.total_income, d.total_cost)), 1000);

  return (
    <div className="col-span-2 bg-[#0f1115] border border-slate-800/50 rounded-3xl p-6 flex flex-col h-[400px] relative overflow-hidden">
      <div className="flex justify-between items-center mb-4 z-10">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">Income & Cost Overview</h3>
          <p className="text-xs text-slate-500 mt-0.5">{loading ? "Loading…" : "Orders vs expenses"}</p>
        </div>
        <div className="flex items-center gap-4 text-xs mr-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-400 font-medium">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-400 font-medium">Cost</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-3 right-6 h-64 overflow-hidden rounded-b-3xl">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="#161920" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date_key"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              dy={10}
              interval={viewMode === 'day' ? 2 : 'preserveStartEnd'}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              domain={[0, maxVal + maxVal * 0.2]}
            />
            <Tooltip
              content={<CustomIncomeTooltip />}
              cursor={{ stroke: '#1f242e', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Line type="monotone" dataKey="total_income" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 0 }} />
            <Line type="monotone" dataKey="total_cost"   stroke="#f43f5e" strokeWidth={2}   strokeDasharray="4 4" dot={{ r: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}