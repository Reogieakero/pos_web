"use server";

import { createClient } from "../utils/supabase/server";

export async function getReportData(date: Date, mode: 'day' | 'week' | 'month') {
  const supabase = await createClient();
  
  const start = new Date(date);
  const end = new Date(date);

  if (mode === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (mode === 'week') {
    start.setDate(date.getDate() - date.getDay());
    end.setDate(start.getDate() + 6);
  } else {
    start.setDate(1);
    end.setMonth(date.getMonth() + 1, 0);
  }

  // Fetch orders including product_name for aggregation
  const { data: orders } = await supabase
    .from('orders')
    .select('product_name, total_price, quantity')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const { data: costs } = await supabase
    .from('daily_costs')
    .select('amount')
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString());

  const revenue = orders?.reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0;
  const itemsSold = orders?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
  const totalCost = costs?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  // Aggregate product counts
  const productSummary = orders?.reduce((acc: any, curr) => {
    acc[curr.product_name] = (acc[curr.product_name] || 0) + curr.quantity;
    return acc;
  }, {});

  const mostPurchased = Object.entries(productSummary || {})
    .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
    .slice(0, 3);

  // Now returning all four properties required by your state
  return { revenue, itemsSold, totalCost, mostPurchased };
}