"use client";

import React from 'react';
import useSWR from 'swr';
import { DollarSign, Package, TrendingUp, FileText, ShoppingBag, BarChart2 } from 'lucide-react';
import { getReportData, ReportData } from '@/app/actions/reportActions';

const fetcher = (args: [Date, string]) => getReportData(args[0], args[1] as any);

async function buildPDF(data: ReportData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  const pad = 14;
  let y = 0;

  const totalCombinedCost = data.totalCost + data.totalStockCogs;
  const net = data.revenue - totalCombinedCost;
  const isProfitable = net >= 0;
  const costRatio = data.revenue > 0 ? ((totalCombinedCost / data.revenue) * 100).toFixed(1) : '0.0';
  const menuShare = data.revenue > 0 ? ((data.menu.totalRevenue / data.revenue) * 100).toFixed(1) : '0.0';
  const stockShare = data.revenue > 0 ? ((data.stock.totalRevenue / data.revenue) * 100).toFixed(1) : '0.0';

  const ph = (peso: number) => `P${peso.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const pct = (n: number, d: number) => d > 0 ? `${(n / d * 100).toFixed(1)}%` : '0.0%';

  function newPage() {
    doc.addPage();
    y = 20;
  }

  function checkY(needed: number) {
    if (y + needed > 275) newPage();
  }

  function sectionHeader(title: string, subtitle: string, color: [number, number, number]) {
    checkY(18);
    doc.setFillColor(...color);
    doc.roundedRect(pad, y, W - pad * 2, 13, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), pad + 4, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 230, 255);
    doc.text(subtitle, pad + 4, y + 11);
    doc.setTextColor(30, 30, 30);
    y += 17;
  }

  function kpiRow(items: { label: string; value: string; sub?: string; valueColor?: [number, number, number] }[]) {
    checkY(24);
    const colW = (W - pad * 2) / items.length;
    items.forEach((item, i) => {
      const x = pad + i * colW;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(x, y, colW - 2, 20, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label, x + 4, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const vc = item.valueColor ?? [15, 23, 42];
      doc.setTextColor(vc[0], vc[1], vc[2]);
      doc.text(item.value, x + 4, y + 13.5);
      if (item.sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(item.sub, x + 4, y + 18.5);
      }
    });
    y += 24;
  }

  function insightBox(text: string, color: [number, number, number]) {
    checkY(20);
    const lines = doc.splitTextToSize(text, W - pad * 2 - 10) as string[];
    const boxH = lines.length * 5 + 10;
    checkY(boxH);
    doc.setFillColor(
      Math.min(255, color[0] + 220),
      Math.min(255, color[1] + 220),
      Math.min(255, color[2] + 220)
    );
    doc.setDrawColor(...color);
    doc.setLineWidth(0.4);
    doc.roundedRect(pad, y, W - pad * 2, boxH, 2, 2, 'FD');
    doc.setFillColor(...color);
    doc.rect(pad, y, 1.5, boxH, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    lines.forEach((line, i) => doc.text(line, pad + 6, y + 7 + i * 5));
    y += boxH + 5;
  }

  function plainTextBox(lines: string[], bgColor: [number, number, number] = [248, 250, 252]) {
    const boxH = lines.length * 6 + 8;
    checkY(boxH);
    doc.setFillColor(...bgColor);
    doc.roundedRect(pad, y, W - pad * 2, boxH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    lines.forEach((line, i) => doc.text(line, pad + 5, y + 7 + i * 6));
    y += boxH + 4;
  }

  function divider() {
    checkY(6);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(pad, y, W - pad, y);
    y += 5;
  }

  function categoryTable(cats: ReportData['menu']['categories'], totalRev: number) {
    if (cats.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No orders recorded for this period.', pad + 2, y + 5);
      y += 12;
      return;
    }

    checkY(8);
    doc.setFillColor(226, 232, 240);
    doc.rect(pad, y, W - pad * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Category / Product', pad + 2, y + 5);
    doc.text('Qty Sold', pad + 105, y + 5);
    doc.text('Revenue', pad + 128, y + 5);
    doc.text('% Share', pad + 155, y + 5);
    y += 7;

    cats.forEach((cat, idx) => {
      checkY(7);
      doc.setFillColor(idx % 2 === 0 ? 241 : 248, idx % 2 === 0 ? 245 : 250, idx % 2 === 0 ? 251 : 255);
      doc.rect(pad, y, W - pad * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(cat.category, pad + 2, y + 5);
      doc.text(String(cat.totalQuantity), pad + 105, y + 5);
      doc.text(ph(cat.totalRevenue), pad + 128, y + 5);
      doc.text(pct(cat.totalRevenue, totalRev), pad + 155, y + 5);
      y += 7;

      cat.products.sort((a, b) => b.qty - a.qty).forEach(prod => {
        checkY(6);
        doc.setFillColor(252, 252, 254);
        doc.rect(pad, y, W - pad * 2, 6, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const prodName = prod.name.length > 45 ? prod.name.substring(0, 45) + '...' : prod.name;
        doc.text(`    • ${prodName}`, pad + 2, y + 4.2);
        doc.text(String(prod.qty), pad + 105, y + 4.2);
        doc.text(ph(prod.revenue), pad + 128, y + 4.2);
        y += 6;
      });
    });
    y += 4;
  }

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 60, 'F');

  doc.setFillColor(59, 130, 246);
  doc.rect(0, 60, W, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('Business Performance Report', pad, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(data.dateLabel, pad, 36);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.period.toUpperCase()} VIEW  ·  Generated: ${new Date().toLocaleString('en-PH')}`, pad, 45);

  doc.setFontSize(8);
  doc.setTextColor(isProfitable ? 52 : 239, isProfitable ? 211 : 68, isProfitable ? 153 : 68);
  doc.text(isProfitable ? '✓  This period is PROFITABLE' : '⚠  This period is at a LOSS', pad, 55);

  y = 72;

  sectionHeader('Financial Summary', 'A quick overview of money in and money out for this period', [59, 130, 246]);

  kpiRow([
    { label: 'Total Sales (Revenue)', value: ph(data.revenue), sub: `From ${data.itemsSold} items sold`, valueColor: [37, 99, 235] },
    { label: 'Total Expenses', value: ph(totalCombinedCost), sub: `${costRatio}% of your sales`, valueColor: [220, 38, 38] },
    {
      label: isProfitable ? 'Net Profit (You Earned)' : 'Net Loss (Shortfall)',
      value: ph(Math.abs(net)),
      sub: `${pct(Math.abs(net), data.revenue)} ${isProfitable ? 'profit margin' : 'loss rate'}`,
      valueColor: isProfitable ? [22, 163, 74] : [220, 38, 38]
    },
  ]);

  kpiRow([
    { label: 'Manual Expenses Logged', value: ph(data.totalCost), sub: 'Costs you added manually (rent, supplies, etc.)' },
    { label: 'Stock Cost of Goods', value: ph(data.totalStockCogs), sub: 'Cost to buy the stock items you sold' },
    { label: 'Menu vs Stock Split', value: `${menuShare}% / ${stockShare}%`, sub: 'Menu sales vs Stock product sales' },
  ]);

  insightBox(
    isProfitable
      ? `Good news: Your business made a profit of ${ph(Math.abs(net))} this period. For every peso earned, you spent ${costRatio} centavos on expenses. Keep monitoring your costs to protect this margin.`
      : `Heads up: Your expenses exceeded your sales by ${ph(Math.abs(net))} this period. Your costs were ${costRatio}% of revenue. Consider reducing manual expenses or increasing sales volume to return to profit.`,
    isProfitable ? [22, 163, 74] : [220, 38, 38]
  );

  divider();

  sectionHeader('Top Selling Products', 'The products your customers bought the most this period', [100, 116, 139]);

  checkY(8);
  doc.setFillColor(226, 232, 240);
  doc.rect(pad, y, W - pad * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Product Name', pad + 2, y + 5);
  doc.text('Units Sold', pad + 120, y + 5);
  doc.text('Rank', pad + 155, y + 5);
  y += 7;

  data.mostPurchased.forEach(([name, qty], idx) => {
    checkY(7);
    doc.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, 251);
    doc.rect(pad, y, W - pad * 2, 7, 'F');
    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(idx === 0 ? 15 : 51, idx === 0 ? 23 : 65, idx === 0 ? 42 : 85);
    const productName = name.length > 55 ? name.substring(0, 55) + '...' : name;
    doc.text(productName, pad + 2, y + 5);
    doc.text(String(qty), pad + 120, y + 5);
    doc.text(idx === 0 ? '🥇 Best Seller' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`, pad + 148, y + 5);
    y += 7;
  });

  newPage();

  sectionHeader('Menu Orders Breakdown', 'Food and drink items prepared and sold from your menu', [245, 158, 11]);

  kpiRow([
    { label: 'Menu Sales Revenue', value: ph(data.menu.totalRevenue), sub: `${menuShare}% of all sales`, valueColor: [180, 83, 9] },
    { label: 'Menu Items Sold', value: String(data.menu.totalQuantity), sub: 'Total portions / servings' },
    { label: 'Menu Categories', value: String(data.menu.categories.length), sub: 'Types of menu items offered' },
  ]);

  const menuAvgPerItem = data.menu.totalQuantity > 0
    ? data.menu.totalRevenue / data.menu.totalQuantity
    : 0;

  plainTextBox([
    `Average price per menu item sold: ${ph(menuAvgPerItem)}`,
    `Menu contributed ${menuShare}% of total business revenue this period.`,
    data.menu.categories.length > 0
      ? `Your top menu category is "${data.menu.categories[0].category}" with ${ph(data.menu.categories[0].totalRevenue)} in sales.`
      : 'No menu categories found for this period.',
  ]);

  insightBox(
    data.menu.insight || 'No menu order data available for this period.',
    [245, 158, 11]
  );

  sectionHeader('Menu — Sales by Category and Product', 'How each menu category and item performed', [251, 191, 36]);
  categoryTable(data.menu.categories, data.menu.totalRevenue);

  newPage();

  sectionHeader('Stock Orders Breakdown', 'Physical products sold directly from your inventory', [139, 92, 246]);

  const stockMargin = data.stock.totalRevenue > 0
    ? ((data.stock.totalRevenue - data.totalStockCogs) / data.stock.totalRevenue * 100).toFixed(1)
    : '0.0';
  const stockAvgPerItem = data.stock.totalQuantity > 0
    ? data.stock.totalRevenue / data.stock.totalQuantity
    : 0;

  kpiRow([
    { label: 'Stock Sales Revenue', value: ph(data.stock.totalRevenue), sub: `${stockShare}% of all sales`, valueColor: [109, 40, 217] },
    { label: 'Stock Items Sold', value: String(data.stock.totalQuantity), sub: 'Total units moved from inventory' },
    { label: 'Stock Gross Margin', value: `${stockMargin}%`, sub: `After ${ph(data.totalStockCogs)} in stock costs`, valueColor: parseFloat(stockMargin) >= 30 ? [22, 163, 74] : [220, 38, 38] },
  ]);

  plainTextBox([
    `Cost of goods sold (COGS): ${ph(data.totalStockCogs)} — what you paid to buy these items.`,
    `Gross profit from stock sales: ${ph(data.stock.totalRevenue - data.totalStockCogs)} after deducting COGS.`,
    `Average selling price per stock item: ${ph(stockAvgPerItem)}.`,
    data.stock.categories.length > 0
      ? `Top stock category: "${data.stock.categories[0].category}" earned ${ph(data.stock.categories[0].totalRevenue)}.`
      : 'No stock categories found for this period.',
  ]);

  insightBox(
    data.stock.insight || 'No stock order data available for this period.',
    [139, 92, 246]
  );

  sectionHeader('Stock — Sales by Category and Product', 'How each stock category and item performed', [167, 139, 250]);
  categoryTable(data.stock.categories, data.stock.totalRevenue);

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 285, W, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}  ·  ${data.dateLabel}  ·  ${data.period.toUpperCase()} VIEW`, pad, 292);
    doc.text('Confidential — For Owner Use Only', W - pad - 44, 292);
  }

  return doc;
}

export default function ReportsContent({ selectedDate, viewMode }: { selectedDate: Date; viewMode: string }) {
  const { data, isLoading } = useSWR([selectedDate, viewMode], fetcher);
  const reportData = data || {
    revenue: 0, itemsSold: 0, totalCost: 0, totalStockCogs: 0,
    mostPurchased: [],
    menu: { totalRevenue: 0, totalQuantity: 0, totalCogs: 0, categories: [], insight: '' },
    stock: { totalRevenue: 0, totalQuantity: 0, totalCogs: 0, categories: [], insight: '' },
    overallInsight: '', dateLabel: '', period: viewMode,
  };

  const totalCombinedCost = reportData.totalCost + (reportData.totalStockCogs ?? 0);
  const net = reportData.revenue - totalCombinedCost;
  const isProfitable = net >= 0;

  const handleExportPDF = async () => {
    if (!data) return;
    const doc = await buildPDF(data);
    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-[#08090c] p-8 rounded-3xl space-y-8">

        <header className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Business Analytics
              {isLoading && <span className="text-sm font-normal text-slate-500 ml-2">Loading...</span>}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard title="Total Revenue" value={`₱${reportData.revenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} badge="Income" badgeColor="blue" />
          <ReportCard title="Items Sold" value={String(reportData.itemsSold)} icon={<Package className="h-5 w-5" />} badge="Orders" badgeColor="indigo" />
          <ReportCard title="Total Costs" value={`₱${totalCombinedCost.toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} badge={isProfitable ? 'Profitable' : 'At Loss'} badgeColor={isProfitable ? 'emerald' : 'rose'} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GroupCard title="Menu Orders" icon={<ShoppingBag className="h-4 w-4" />} color="amber" group={reportData.menu} totalRevenue={reportData.revenue} />
          <GroupCard title="Stock Orders" icon={<BarChart2 className="h-4 w-4" />} color="violet" group={reportData.stock} totalRevenue={reportData.revenue} cogsLabel={`COGS: ₱${(reportData.totalStockCogs ?? 0).toLocaleString()}`} />
        </div>

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

function ReportCard({ title, value, icon, badge, badgeColor }: { title: string; value: string; icon: React.ReactNode; badge: string; badgeColor: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-400/10',
    indigo: 'text-indigo-400 bg-indigo-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    rose: 'text-rose-400 bg-rose-400/10',
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
    amber: 'border-amber-500/20 text-amber-400 bg-amber-500/10',
    violet: 'border-violet-500/20 text-violet-400 bg-violet-500/10',
  };
  const style = palette[color] ?? palette.amber;
  const share = totalRevenue > 0 ? ((group.totalRevenue / totalRevenue) * 100).toFixed(1) : '0.0';
  const [borderCls, textCls, bgCls] = style.split(' ');

  return (
    <div className={`bg-[#0f1115] border rounded-3xl p-6 ${borderCls}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 text-sm font-semibold ${textCls}`}>
          {icon} {title}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${textCls} ${bgCls}`}>{share}% of revenue</span>
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