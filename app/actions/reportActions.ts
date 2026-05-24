// app/actions/reportActions.ts
"use server";

import { createClient } from "../utils/supabase/server";

export type ReportViewMode = 'day' | 'week' | 'month';

export interface CategoryStat {
  category: string;
  totalRevenue: number;
  totalQuantity: number;
  productCount: number;
  products: { name: string; qty: number; revenue: number }[];
}

export interface OrderGroup {
  totalRevenue: number;
  totalQuantity: number;
  totalCogs: number;           // stock COGS from unit_cost
  categories: CategoryStat[];
  insight: string;
}

export interface ReportData {
  period: string;
  dateLabel: string;
  revenue: number;
  itemsSold: number;
  totalCost: number;           // manual daily_costs only
  totalStockCogs: number;      // auto COGS from orders
  mostPurchased: [string, number][];
  menu: OrderGroup;
  stock: OrderGroup;
  overallInsight: string;
}

function buildDateRange(date: Date, mode: ReportViewMode) {
  const start = new Date(date);
  const end   = new Date(date);
  if (mode === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (mode === 'week') {
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

function buildCategoryStats(orders: any[]): CategoryStat[] {
  const map: Record<string, CategoryStat> = {};
  for (const o of orders) {
    const cat = o.product_category || 'Uncategorized';
    if (!map[cat]) map[cat] = { category: cat, totalRevenue: 0, totalQuantity: 0, productCount: 0, products: [] };
    map[cat].totalRevenue  += Number(o.total_price);
    map[cat].totalQuantity += Number(o.quantity);
    const existing = map[cat].products.find(p => p.name === o.product_name);
    if (existing) {
      existing.qty     += Number(o.quantity);
      existing.revenue += Number(o.total_price);
    } else {
      map[cat].products.push({ name: o.product_name, qty: Number(o.quantity), revenue: Number(o.total_price) });
      map[cat].productCount++;
    }
  }
  return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function generateGroupInsight(group: Omit<OrderGroup, 'insight'>, type: 'menu' | 'stock'): string {
  if (group.totalQuantity === 0) return `No ${type} orders recorded in this period.`;
  const topCat  = group.categories[0];
  const margin  = group.totalRevenue > 0 ? ((group.totalRevenue - group.totalCogs) / group.totalRevenue * 100).toFixed(1) : '0.0';
  const topProd = topCat?.products.sort((a, b) => b.qty - a.qty)[0];
  return `${topCat?.category ?? 'Top category'} led with ₱${topCat?.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} revenue across ${topCat?.totalQuantity} units. Best item: ${topProd?.name ?? '—'} (${topProd?.qty ?? 0} sold). Gross margin: ${margin}%.`;
}

function generateOverallInsight(data: Omit<ReportData, 'overallInsight'>): string {
  const totalCombinedCost = data.totalCost + data.totalStockCogs;
  const net               = data.revenue - totalCombinedCost;
  const isProfitable      = net >= 0;
  const costRatio         = data.revenue > 0 ? (totalCombinedCost / data.revenue * 100).toFixed(1) : '0.0';
  const topItem           = data.mostPurchased[0];
  const menuShare         = data.revenue > 0 ? (data.menu.totalRevenue / data.revenue * 100).toFixed(0) : '0';
  const stockShare        = data.revenue > 0 ? (data.stock.totalRevenue / data.revenue * 100).toFixed(0) : '0';
  return `${isProfitable ? 'Profitable period' : 'Loss-making period'} — net ${isProfitable ? 'profit' : 'loss'} of ₱${Math.abs(net).toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Costs represent ${costRatio}% of revenue. Menu items drove ${menuShare}% of sales vs ${stockShare}% from stock products.${topItem ? ` Top seller: ${topItem[0]} (${topItem[1]} units).` : ''}`;
}

export async function getReportData(date: Date, mode: ReportViewMode): Promise<ReportData> {
  const supabase       = await createClient();
  const { start, end } = buildDateRange(date, mode);

  const [{ data: orders }, { data: costs }] = await Promise.all([
    supabase
      .from('orders')
      .select('product_name, product_category, product_type, unit_cost, total_price, quantity')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('daily_costs')
      .select('amount')
      .gte('recorded_at', start.toISOString())
      .lte('recorded_at', end.toISOString()),
  ]);

  const allOrders   = orders   ?? [];
  const allCosts    = costs    ?? [];
  const menuOrders  = allOrders.filter(o => o.product_type !== 'stock');
  const stockOrders = allOrders.filter(o => o.product_type === 'stock');

  const revenue        = allOrders.reduce((s, o) => s + Number(o.total_price), 0);
  const itemsSold      = allOrders.reduce((s, o) => s + Number(o.quantity), 0);
  const totalCost      = allCosts.reduce((s, c) => s + Number(c.amount), 0);
  const totalStockCogs = stockOrders.reduce((s, o) => {
    const uc = Number(o.unit_cost ?? 0);
    return uc > 0 ? s + uc * Number(o.quantity) : s;
  }, 0);

  const productSummary = allOrders.reduce((acc: Record<string, number>, o) => {
    acc[o.product_name] = (acc[o.product_name] || 0) + Number(o.quantity);
    return acc;
  }, {});
  const mostPurchased = Object.entries(productSummary)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) as [string, number][];

  const menuCats  = buildCategoryStats(menuOrders);
  const stockCats = buildCategoryStats(stockOrders);
  const menuCogs  = 0; // menu items typically don't have unit_cost tracked
  const stockCogs = totalStockCogs;

  const menuGroup: Omit<OrderGroup, 'insight'>  = { totalRevenue: menuOrders.reduce((s, o) => s + Number(o.total_price), 0), totalQuantity: menuOrders.reduce((s, o) => s + Number(o.quantity), 0), totalCogs: menuCogs, categories: menuCats };
  const stockGroup: Omit<OrderGroup, 'insight'> = { totalRevenue: stockOrders.reduce((s, o) => s + Number(o.total_price), 0), totalQuantity: stockOrders.reduce((s, o) => s + Number(o.quantity), 0), totalCogs: stockCogs, categories: stockCats };

  const menu  = { ...menuGroup,  insight: generateGroupInsight(menuGroup,  'menu')  };
  const stock = { ...stockGroup, insight: generateGroupInsight(stockGroup, 'stock') };

  const periodLabel = mode === 'day'
    ? start.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : mode === 'week'
    ? `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : start.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  const partialData = { period: mode, dateLabel: periodLabel, revenue, itemsSold, totalCost, totalStockCogs, mostPurchased, menu, stock };
  return { ...partialData, overallInsight: generateOverallInsight(partialData) };
}