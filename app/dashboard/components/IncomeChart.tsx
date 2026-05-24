"use client";

import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, ArrowUpRight } from 'lucide-react';
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

export default function IncomeChart({ selectedDate, viewMode }: IncomeChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      const { start, end } = getDateRange(selectedDate, viewMode);

      const { data, error } = await supabase.rpc('get_daily_income_and_costs', {
        start_date: start.toISOString(),
        end_date: end.toISOString()
      });

      if (!error && data) {
        setChartData(data);
      }
      setLoading(false);
    }
    fetchChartData();
  }, [selectedDate, viewMode]);

  const maxVal = Math.max(...chartData.map((d) => Math.max(d.total_income, d.total_cost)), 1000);

  return (
    <div className="col-span-2 bg-[#0f1115] border border-slate-800/50 rounded-3xl p-6 flex flex-col h-[400px] relative overflow-hidden">
      <div className="flex justify-between items-center mb-4 z-10">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">Income & Cost Overview</h3>
          <p className="text-xs text-slate-500 mt-0.5">{loading ? "Loading..." : "Orders vs expenses"}</p>
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
            <XAxis dataKey="date_key" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} domain={[0, maxVal + maxVal * 0.2]} />
            <Tooltip content={<CustomIncomeTooltip />} cursor={{ stroke: '#1f242e', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line type="monotone" dataKey="total_income" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 0 }} />
            <Line type="monotone" dataKey="total_cost" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}