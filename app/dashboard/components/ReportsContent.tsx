"use client";

import React from 'react';
import useSWR from 'swr';
import { DollarSign, Package, TrendingUp, FileText } from 'lucide-react';
import { getReportData } from '@/app/actions/reportActions';

const fetcher = (args: [Date, string]) => getReportData(args[0], args[1] as any);

export default function ReportsContent({ selectedDate, viewMode }: { selectedDate: Date, viewMode: string }) {
  const { data, isLoading } = useSWR([selectedDate, viewMode], fetcher, { refreshInterval: 5000 });
  const reportData = data || { revenue: 0, itemsSold: 0, totalCost: 0, mostPurchased: [] };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');

    const netIncome = reportData.revenue - reportData.totalCost;
    const isProfitable = netIncome >= 0;

    const topProductsHtml = reportData.mostPurchased.map(([name, qty]) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${qty}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b;">
        <header style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0; color: #0f172a; font-size: 28px;">Performance Summary</h1>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Report for: ${selectedDate.toDateString()} (${viewMode})</p>
        </header>

        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 16px; color: #475569; text-transform: uppercase;">Financial Overview</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Total Revenue</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">₱${reportData.revenue.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Operational Costs</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">₱${reportData.totalCost.toLocaleString()}</td>
            </tr>
            <tr style="background: ${isProfitable ? '#dcfce7' : '#fee2e2'};">
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Net ${isProfitable ? 'Profit' : 'Loss'}</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: ${isProfitable ? '#166534' : '#991b1b'};">
                ₱${Math.abs(netIncome).toLocaleString()}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 16px; color: #475569; text-transform: uppercase;">Top Selling Items</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead><tr style="background: #f1f5f9;"><th style="padding: 10px; text-align: left;">Product</th><th style="padding: 10px; text-align: right;">Quantity</th></tr></thead>
            <tbody>${topProductsHtml || '<tr><td colspan="2">No data</td></tr>'}</tbody>
          </table>
        </div>

        <div style="padding: 15px; border-radius: 6px; background-color: ${isProfitable ? '#f0fdf4' : '#fff1f2'}; border: 1px solid ${isProfitable ? '#bbf7d0' : '#fecaca'};">
          <p style="margin: 0; font-weight: bold; color: ${isProfitable ? '#166534' : '#991b1b'};">
            ${isProfitable ? '✅ Operation is currently PROFITABLE' : '⚠️ Operation is currently at a LOSS'}
          </p>
        </div>
      </div>
    `;

    doc.html(htmlContent, {
      callback: (doc) => window.open(doc.output('bloburl'), '_blank'),
      x: 10, y: 10, width: 190, windowWidth: 800
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div id="report-content" className="bg-[#08090c] p-8 rounded-3xl space-y-8">
        <header className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
                Business Analytics {isLoading && <span className="text-sm font-normal text-slate-500 ml-2">Updating...</span>}
            </h2>
            <p className="text-slate-500 mt-1 uppercase text-xs font-bold tracking-widest">
              {viewMode} report for {selectedDate.toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 transition-colors rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20"
          >
            <FileText className="h-4 w-4" /> Preview PDF
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard title="Total Revenue" value={`₱${reportData.revenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} trend="Active" />
          <ReportCard title="Items Sold" value={reportData.itemsSold.toString()} icon={<Package className="h-5 w-5" />} trend="Active" />
          <ReportCard title="Total Costs" value={`₱${reportData.totalCost.toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} trend="Active" />
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-[#0f1115] border border-slate-800 p-6 rounded-3xl">
      <div className="flex justify-between items-center mb-4">
        <div className="p-2 bg-slate-900 rounded-xl text-blue-400">{icon}</div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">{trend}</span>
      </div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
    </div>
  );
}