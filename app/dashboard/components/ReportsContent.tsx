"use client";

import React from 'react';
import useSWR from 'swr';
import { DollarSign, Package, TrendingUp, FileText, ShoppingBag, BarChart2 } from 'lucide-react';
import { getReportData, ReportData } from '@/app/actions/reportActions';

const fetcher = (args: [Date, string]) => getReportData(args[0], args[1] as any);

// ── PDF builder ────────────────────────────────────────────────────────────────

async function buildPDF(data: ReportData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const W   = 210;
  const pad = 14;
  let   y   = 0;

  const totalCombinedCost = data.totalCost + data.totalStockCogs;
  const net               = data.revenue - totalCombinedCost;
  const isProfitable      = net >= 0;

  // ── helpers ──────────────────────────────────────────────────────────────
  const ph  = (peso: number) => `P${peso.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const pct = (n: number, d: number) => d > 0 ? `${(n / d * 100).toFixed(1)}%` : '0.0%';

  function newPage() {
    doc.addPage();
    y = 20;
  }

  function checkY(needed: number) {
    if (y + needed > 275) newPage();
  }

  function sectionHeader(title: string, color: [number, number, number]) {
    checkY(14);
    doc.setFillColor(...color);
    doc.roundedRect(pad, y, W - pad * 2, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), pad + 4, y + 6);
    doc.setTextColor(30, 30, 30);
    y += 13;
  }

  function kpiRow(items: { label: string; value: string; sub?: string }[]) {
    checkY(22);
    const colW = (W - pad * 2) / items.length;
    items.forEach((item, i) => {
      const x = pad + i * colW;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(x, y, colW - 2, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label, x + 4, y + 5.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(item.value, x + 4, y + 13);
      if (item.sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(item.sub, x + 4, y + 17);
      }
    });
    y += 22;
  }

  function insightBox(text: string, color: [number, number, number]) {
    checkY(20);
    const lines = doc.splitTextToSize(text, W - pad * 2 - 8) as string[];
    const boxH  = lines.length * 5 + 8;
    checkY(boxH);
    doc.setFillColor(color[0], color[1], color[2], 0.08);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.roundedRect(pad, y, W - pad * 2, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 70);
    lines.forEach((line, i) => doc.text(line, pad + 4, y + 6 + i * 5));
    y += boxH + 4;
  }

  function categoryTable(cats: ReportData['menu']['categories'], totalRev: number) {
    if (cats.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No data for this period.', pad + 2, y + 5);
      y += 10;
      return;
    }
    // header row
    checkY(8);
    doc.setFillColor(226, 232, 240);
    doc.rect(pad, y, W - pad * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Category', pad + 2, y + 5);
    doc.text('Items', pad + 70, y + 5);
    doc.text('Units', pad + 95, y + 5);
    doc.text('Revenue', pad + 118, y + 5);
    doc.text('Share', pad + 148, y + 5);
    y += 7;

    cats.forEach((cat, idx) => {
      checkY(7);
      doc.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 251 : 255);
      doc.rect(pad, y, W - pad * 2, 7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(cat.category, pad + 2, y + 5);
      doc.text(String(cat.productCount), pad + 70, y + 5);
      doc.text(String(cat.totalQuantity), pad + 95, y + 5);
      doc.text(ph(cat.totalRevenue), pad + 118, y + 5);
      doc.text(pct(cat.totalRevenue, totalRev), pad + 148, y + 5);
      y += 7;

      // product sub-rows
      cat.products.sort((a, b) => b.qty - a.qty).forEach(prod => {
        checkY(6);
        doc.setFillColor(252, 252, 254);
        doc.rect(pad, y, W - pad * 2, 6, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`  • ${prod.name}`, pad + 4, y + 4.2);
        doc.text(String(prod.qty), pad + 95, y + 4.2);
        doc.text(ph(prod.revenue), pad + 118, y + 4.2);
        y += 6;
      });
    });
    y += 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Cover + Summary
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 55, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Business Performance Report', pad, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`${data.dateLabel}  ·  ${data.period.toUpperCase()} VIEW`, pad, 36);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pad, 45);

  y = 65;

  sectionHeader('Financial Summary', [59, 130, 246]);
  kpiRow([
    { label: 'Total Revenue',    value: ph(data.revenue),          sub: `${data.itemsSold} items sold` },
    { label: 'Total Costs',      value: ph(totalCombinedCost),     sub: `Manual + Stock COGS` },
    { label: `Net ${isProfitable ? 'Profit' : 'Loss'}`, value: ph(Math.abs(net)), sub: pct(Math.abs(net), data.revenue) + ' margin' },
  ]);

  kpiRow([
    { label: 'Manual Costs',    value: ph(data.totalCost),         sub: 'Logged expenses' },
    { label: 'Stock COGS',      value: ph(data.totalStockCogs),    sub: 'Auto from orders' },
    { label: 'Menu Revenue',    value: ph(data.menu.totalRevenue), sub: pct(data.menu.totalRevenue, data.revenue) + ' of total' },
  ]);

  y += 2;
  insightBox(`Overall: ${data.overallInsight}`, isProfitable ? [16, 185, 129] : [244, 63, 94]);

  // Top products
  sectionHeader('Top Products  (All Categories)', [100, 116, 139]);
  checkY(8);
  doc.setFillColor(226, 232, 240);
  doc.rect(pad, y, W - pad * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Product', pad + 2, y + 5);
  doc.text('Units Sold', pad + 120, y + 5);
  y += 7;
  data.mostPurchased.forEach(([name, qty], idx) => {
    checkY(7);
    doc.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, 251);
    doc.rect(pad, y, W - pad * 2, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`${idx + 1}. ${name}`, pad + 2, y + 5);
    doc.text(String(qty), pad + 120, y + 5);
    y += 7;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Menu Orders
  // ══════════════════════════════════════════════════════════════════════════
  newPage();

  sectionHeader('Menu Orders', [245, 158, 11]);
  kpiRow([
    { label: 'Menu Revenue',  value: ph(data.menu.totalRevenue),   sub: pct(data.menu.totalRevenue, data.revenue) + ' of total' },
    { label: 'Units Sold',    value: String(data.menu.totalQuantity) },
    { label: 'Categories',    value: String(data.menu.categories.length) },
  ]);
  insightBox(data.menu.insight, [245, 158, 11]);

  sectionHeader('Menu — By Category & Product', [251, 191, 36]);
  categoryTable(data.menu.categories, data.menu.totalRevenue);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — Stock Orders
  // ══════════════════════════════════════════════════════════════════════════
  newPage();

  sectionHeader('Stock Orders', [139, 92, 246]);
  kpiRow([
    { label: 'Stock Revenue', value: ph(data.stock.totalRevenue),  sub: pct(data.stock.totalRevenue, data.revenue) + ' of total' },
    { label: 'Units Sold',    value: String(data.stock.totalQuantity) },
    { label: 'Stock COGS',    value: ph(data.totalStockCogs),       sub: 'Cost of goods sold' },
  ]);
  insightBox(data.stock.insight, [139, 92, 246]);

  sectionHeader('Stock — By Category & Product', [167, 139, 250]);
  categoryTable(data.stock.categories, data.stock.totalRevenue);

  // ── footer on every page ─────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, W - pad - 16, 290);
    doc.text('Confidential · Business Report', pad, 290);
  }

  return doc;
}

// ── component ──────────────────────────────────────────────────────────────────

export default function ReportsContent({ selectedDate, viewMode }: { selectedDate: Date; viewMode: string }) {
  const { data, isLoading } = useSWR([selectedDate, viewMode], fetcher);
  const reportData = data || { revenue: 0, itemsSold: 0, totalCost: 0, totalStockCogs: 0, mostPurchased: [], menu: { totalRevenue: 0, totalQuantity: 0, totalCogs: 0, categories: [], insight: '' }, stock: { totalRevenue: 0, totalQuantity: 0, totalCogs: 0, categories: [], insight: '' }, overallInsight: '', dateLabel: '', period: viewMode };

  const totalCombinedCost = reportData.totalCost + (reportData.totalStockCogs ?? 0);
  const net               = reportData.revenue - totalCombinedCost;
  const isProfitable      = net >= 0;

  const handleExportPDF = async () => {
    if (!data) return;
    const doc = await buildPDF(data);
    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-[#08090c] p-8 rounded-3xl space-y-8">

        {/* Header */}
        <header className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Business Analytics
              {isLoading && <span className="text-sm font-normal text-slate-500 ml-2">Updating...</span>}
            </h2>
            <p className="text-slate-500 mt-1 uppercase text-xs font-bold tracking-widest">
              {viewMode} report · {reportData.dateLabel || selectedDate.toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={isLoading || !data}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20"
          >
            <FileText className="h-4 w-4" /> Export PDF
          </button>
        </header>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard title="Total Revenue"  value={`₱${reportData.revenue.toLocaleString()}`}              icon={<DollarSign className="h-5 w-5" />} badge="Income" badgeColor="blue" />
          <ReportCard title="Items Sold"     value={String(reportData.itemsSold)}                           icon={<Package className="h-5 w-5" />}    badge="Orders" badgeColor="indigo" />
          <ReportCard title="Total Costs"    value={`₱${totalCombinedCost.toLocaleString()}`}               icon={<TrendingUp className="h-5 w-5" />}  badge={isProfitable ? 'Profitable' : 'At Loss'} badgeColor={isProfitable ? 'emerald' : 'rose'} />
        </div>

        {/* Menu vs Stock split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GroupCard title="Menu Orders" icon={<ShoppingBag className="h-4 w-4" />} color="amber" group={reportData.menu} totalRevenue={reportData.revenue} />
          <GroupCard title="Stock Orders" icon={<BarChart2 className="h-4 w-4" />} color="violet" group={reportData.stock} totalRevenue={reportData.revenue} cogsLabel={`COGS: ₱${(reportData.totalStockCogs ?? 0).toLocaleString()}`} />
        </div>

        {/* Overall insight */}
        {reportData.overallInsight && (
          <div className={`p-4 rounded-2xl border text-sm ${isProfitable ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/5 border-rose-500/20 text-rose-300'}`}>
            <span className="font-semibold uppercase text-[10px] tracking-widest block mb-1 opacity-60">Overall Insight</span>
            {reportData.overallInsight}
          </div>
        )}
      </div>
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────

function ReportCard({ title, value, icon, badge, badgeColor }: { title: string; value: string; icon: React.ReactNode; badge: string; badgeColor: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-400/10', indigo: 'text-indigo-400 bg-indigo-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10', rose: 'text-rose-400 bg-rose-400/10',
  };
  return (
    <div className="bg-[#0f1115] border border-slate-800 p-6 rounded-3xl">
      <div className="flex justify-between items-center mb-4">
        <div className="p-2 bg-slate-900 rounded-xl text-blue-400">{icon}</div>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${colors[badgeColor] ?? colors.blue}`}>{badge}</span>
      </div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
    </div>
  );
}

function GroupCard({ title, icon, color, group, totalRevenue, cogsLabel }: { title: string; icon: React.ReactNode; color: string; group: any; totalRevenue: number; cogsLabel?: string }) {
  const palette: Record<string, string> = {
    amber:  'border-amber-500/20 text-amber-400 bg-amber-500/10',
    violet: 'border-violet-500/20 text-violet-400 bg-violet-500/10',
  };
  const style = palette[color] ?? palette.amber;
  const share = totalRevenue > 0 ? ((group.totalRevenue / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className={`bg-[#0f1115] border rounded-3xl p-6 ${style.split(' ')[0]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 text-sm font-semibold ${style.split(' ')[1]}`}>
          {icon} {title}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${style.split(' ')[1]} ${style.split(' ')[2]}`}>{share}% of revenue</span>
      </div>
      <p className="text-2xl font-bold text-white">₱{group.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
      <p className="text-xs text-slate-500 mt-1">{group.totalQuantity} units{cogsLabel ? ` · ${cogsLabel}` : ''}</p>
      {group.categories.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {group.categories.slice(0, 3).map((cat: any) => (
            <div key={cat.category} className="flex justify-between text-xs">
              <span className="text-slate-400 truncate max-w-[140px]">{cat.category}</span>
              <span className="text-slate-300 font-medium">₱{cat.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}
      {group.insight && (
        <p className="text-[10px] text-slate-500 mt-3 leading-relaxed italic border-t border-slate-800 pt-3">{group.insight}</p>
      )}
    </div>
  );
}