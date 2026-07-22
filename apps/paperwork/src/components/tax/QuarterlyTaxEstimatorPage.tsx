"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  AlertBanner,
  Button,
  Card,
  Input,
  Select,
  StatusBadge,
  ToolPageHeader
} from "@smarttools/ui";
import {
  FileText,
  Clock,
  Printer,
  FileDown,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  Percent,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Coins,
  ShieldAlert
} from "lucide-react";
import { DataBridge, DataBridgeKeys, TaxEstimateSummaryData } from "../../lib/shared/dataBridge";

interface BracketTier {
  id: number;
  rate: number;
  thresholdMin: number;
  thresholdMax: number;
}

const FILING_STATUSES = [
  { id: "single", label: "Single Filer", standardDeduction: 14600 },
  { id: "married_joint", label: "Married Filing Jointly", standardDeduction: 29200 },
  { id: "married_separate", label: "Married Filing Separately", standardDeduction: 14600 },
  { id: "head_household", label: "Head of Household", standardDeduction: 21900 }
];

// Simplified progressive tax brackets for 2025/2026
const TAX_BRACKETS: Record<string, BracketTier[]> = {
  single: [
    { id: 1, rate: 0.10, thresholdMin: 0, thresholdMax: 11600 },
    { id: 2, rate: 0.12, thresholdMin: 11600, thresholdMax: 47150 },
    { id: 3, rate: 0.22, thresholdMin: 47150, thresholdMax: 100525 },
    { id: 4, rate: 0.24, thresholdMin: 100525, thresholdMax: 191950 },
    { id: 5, rate: 0.32, thresholdMin: 191950, thresholdMax: 243725 },
    { id: 6, rate: 0.35, thresholdMin: 243725, thresholdMax: 609350 },
    { id: 7, rate: 0.37, thresholdMin: 609350, thresholdMax: Infinity }
  ],
  married_joint: [
    { id: 1, rate: 0.10, thresholdMin: 0, thresholdMax: 23200 },
    { id: 2, rate: 0.12, thresholdMin: 23200, thresholdMax: 94300 },
    { id: 3, rate: 0.22, thresholdMin: 94300, thresholdMax: 201050 },
    { id: 4, rate: 0.24, thresholdMin: 201050, thresholdMax: 383900 },
    { id: 5, rate: 0.32, thresholdMin: 383900, thresholdMax: 487450 },
    { id: 6, rate: 0.35, thresholdMin: 487450, thresholdMax: 731200 },
    { id: 7, rate: 0.37, thresholdMin: 731200, thresholdMax: Infinity }
  ]
};

export default function QuarterlyTaxEstimatorPage({ onTrackClick }: { onTrackClick?: (item: string) => void }) {
  const [grossRevenue, setGrossRevenue] = useState<number>(85000);
  const [businessExpenses, setBusinessExpenses] = useState<number>(12500);
  const [filingStatus, setFilingStatus] = useState<string>("single");
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [stateTaxRate, setStateTaxRate] = useState<number>(4.5);

  const [activeTab, setActiveTab] = useState<"calculator" | "vouchers">("calculator");
  const [hasImportedExpenses, setHasImportedExpenses] = useState(false);

  // Auto load summaries from active expense report & active mileage logs
  useEffect(() => {
    let cumulativeExpenses = 0;

    // 1. Load Expense report summary total
    const expenseSummary = DataBridge.get<any | null>("paperworkkit.expenseReport.summary", null);
    if (expenseSummary && expenseSummary.totalAmount) {
      cumulativeExpenses += Number(expenseSummary.totalAmount || 0);
    }

    // 2. Load Mileage logs summary total
    const mileageSummary = DataBridge.get<any | null>(DataBridgeKeys.MILEAGE_SUMMARY, null);
    if (mileageSummary && mileageSummary.totalAmount) {
      cumulativeExpenses += Number(mileageSummary.totalAmount || 0);
    }

    if (cumulativeExpenses > 0) {
      setBusinessExpenses(Math.round(cumulativeExpenses));
      setHasImportedExpenses(true);
    }
  }, []);

  // Compute values
  const calculateTaxes = () => {
    // 1. Net Self Employment income computation
    const netSEProfit = Math.max(0, grossRevenue - businessExpenses);

    // Schedule SE calculation: tax on 92.35% of net profit
    const netEarningsSubjectToSE = netSEProfit * 0.9235;

    // Social Security portion: 12.4% up to cap of $176,105 (for 2026 estimates)
    const ssWageCap = 176100;
    const ssSEAmount = Math.min(netEarningsSubjectToSE, ssWageCap) * 0.124;

    // Medicare portion: 2.9% on all earnings, plus 0.9% for earnings above $200k (simplified)
    const medicareSEAmount = netEarningsSubjectToSE * 0.029;
    const selfEmploymentTax = ssSEAmount + medicareSEAmount;

    // 2. Adjusted Gross Income (AGI) Estimation
    // Deduct 50% of Self-Employment tax prior to standard deduction
    const fiftyPercentSETax = selfEmploymentTax * 0.50;
    const adjustedGrossIncome = Math.max(0, netSEProfit + otherIncome - fiftyPercentSETax);

    // 3. Taxable Income
    const activeStatus = FILING_STATUSES.find(s => s.id === filingStatus) || FILING_STATUSES[0];
    const deductionValue = activeStatus.standardDeduction;
    const taxableIncome = Math.max(0, adjustedGrossIncome - deductionValue);

    // 4. Progressive Federal Income Tax Bracketeering
    // Married separate and head of household mapping default to single brackets for simple projection
    const bracketSet = TAX_BRACKETS[filingStatus] || TAX_BRACKETS.single;
    let computedFedTax = 0;
    let remainingTaxable = taxableIncome;

    for (const tier of bracketSet) {
      const { rate, thresholdMin, thresholdMax } = tier;
      const tierCoverage = thresholdMax - thresholdMin;

      if (remainingTaxable <= 0) break;

      if (remainingTaxable > tierCoverage && tierCoverage !== Infinity) {
        computedFedTax += tierCoverage * rate;
        remainingTaxable -= tierCoverage;
      } else {
        computedFedTax += remainingTaxable * rate;
        remainingTaxable = 0;
      }
    }

    // State estimated taxes
    const computedStateTax = (taxableIncome * stateTaxRate) / 100;

    // Totals
    const totalTaxLiability = selfEmploymentTax + computedFedTax + computedStateTax;
    const quarterlyVoucherPayment = totalTaxLiability / 4;

    const effectiveTaxRate = grossRevenue > 0 ? (totalTaxLiability / grossRevenue) * 100 : 0;

    return {
      netSEProfit,
      selfEmploymentTax,
      adjustedGrossIncome,
      deductionValue,
      taxableIncome,
      computedFedTax,
      computedStateTax,
      totalTaxLiability,
      quarterlyVoucherPayment,
      effectiveTaxRate
    };
  };

  const results = calculateTaxes();

  // Save to summary data bridge
  useEffect(() => {
    DataBridge.set(DataBridgeKeys.TAX_SUMMARY, {
      year: 2026,
      filingStatus: filingStatus,
      estimatedTotalTax: results.totalTaxLiability,
      suggestedQuarterly: results.quarterlyVoucherPayment
    });
  }, [results.totalTaxLiability, filingStatus]);

  const handlePrint = () => {
    onTrackClick("tax_estimator_print_clicked");
    window.print();
  };

  return (
    <div className="grow w-full font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="tax-estimator-wrapper">

      <ToolPageHeader
        actions={hasImportedExpenses ? (
          <StatusBadge className="gap-1.5" variant="success">
            <CheckCircle className="size-4" />
            <span>Pulled ${businessExpenses} from active expenses / mileage</span>
          </StatusBadge>
        ) : undefined}
        className="print:hidden"
        description="IRS self-employment Schedule SE projection and estimated federal bracket analysis."
        eyebrow={<StatusBadge variant="success">Form 1040-ES Estimator</StatusBadge>}
        title="Quarterly Tax Estimator"
      />

      {/* Main interactive cards split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* INPUT PARAMETERS CARD COLUMN */}
        <div className="lg:col-span-6 space-y-6 print:hidden">
          <Card className="space-y-5">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
              1. Contractor Operating Figures
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="tax-gross-revenue">
                  Estimated Gross Contractor Income ($) *
                </label>
                <Input
                  aria-describedby="tax-gross-revenue-description"
                  type="number"
                  step="500"
                  className="font-black"
                  id="tax-gross-revenue"
                  value={grossRevenue}
                  onChange={(e) => setGrossRevenue(Math.max(0, Number(e.target.value)))}
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-semibold leading-relaxed" id="tax-gross-revenue-description">
                  Total annual 1099 payouts you expect before deductions.
                </span>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="tax-business-expenses">
                  Business Deductible Expenses ($)
                </label>
                <div className="flex gap-2">
                  <Input
                    aria-describedby="tax-business-expenses-description"
                    type="number"
                    step="100"
                    className="grow font-bold"
                    id="tax-business-expenses"
                    value={businessExpenses}
                    onChange={(e) => {
                      setBusinessExpenses(Math.max(0, Number(e.target.value)));
                      setHasImportedExpenses(false);
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-semibold" id="tax-business-expenses-description">
                  Operating expense totals, mileage write-offs ($.67/mile), and gear.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="tax-filing-status">Filing Status</label>
                  <Select
                    className="font-bold"
                    id="tax-filing-status"
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value)}
                  >
                    {FILING_STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="tax-state-rate">State Tax rate (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    className="font-bold"
                    id="tax-state-rate"
                    value={stateTaxRate}
                    onChange={(e) => setStateTaxRate(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="tax-other-income">Other W-2 / Investment Income ($)</label>
                <Input
                  type="number"
                  step="500"
                  className="font-bold"
                  id="tax-other-income"
                  value={otherIncome}
                  onChange={(e) => setOtherIncome(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
          </Card>

          <AlertBanner title="Estimated Tax Safe Harbor Rules">
            <p>
              To prevent IRS late payout penalties, contractors generally need to submit quarterly payments equivalent to 90% of current tax liabilities or 100% of the previous year's taxes.
            </p>
          </AlertBanner>
        </div>

        {/* OUTPUT ANALYSIS & 1040-ES PRINT SUMMARY CARD */}
        <div className="lg:col-span-6 space-y-6">

          {/* Main computed numbers panel */}
          <Card className="space-y-6 print:hidden">
            <div className="text-center pb-4 border-b">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Suggested Q1/Q2/Q3/Q4 payment</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                ${results.quarterlyVoucherPayment.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                <span className="text-xs font-bold text-slate-400 block font-mono uppercase mt-1">Four Scheduled Installments</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold leading-snug">
              <div>
                <span className="text-[11px] font-black text-slate-400 uppercase block">Estimated Net Profit</span>
                <span className="text-sm font-black text-slate-900">${results.netSEProfit.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[11px] font-black text-slate-400 uppercase block">Self-Employment Tax (SE)</span>
                <span className="text-sm font-black text-[#0066cc]">${results.selfEmploymentTax.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
              <div>
                <span className="text-[11px] font-black text-slate-400 uppercase block">Standard Deduction</span>
                <span className="text-sm font-bold text-slate-500">${results.deductionValue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[11px] font-black text-slate-400 uppercase block">Estimated Federal Income Tax</span>
                <span className="text-sm font-black text-slate-900">${results.computedFedTax.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Bracket Visualization gauge progress bar */}
            <div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase pb-1 font-mono">
                <span>Federal Progressive Income Bracket</span>
                <span className="text-blue-600">Effective rate: {results.effectiveTaxRate.toFixed(1)}%</span>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div className="bg-sky-500 h-full border-r border-white" style={{ width: "20%" }} title="SE portion bracket" />
                <div className="bg-blue-600 h-full border-r border-white" style={{ width: "15%" }} title="10% bracket" />
                <div className="bg-indigo-600 h-full" style={{ width: `${Math.min(65, Math.max(5, results.effectiveTaxRate))}%` }} title="Progressive tier reach" />
              </div>

              <span className="block text-[11px] text-slate-400 mt-1.5 font-semibold leading-relaxed">
                 Estimate assumes single Standard deduction and does not account for child tax credits or dynamic LLC state write-offs. This constitutes standard projections.
              </span>
            </div>

            <Button
              onClick={handlePrint}
              className="w-full"
              type="button"
              variant="strong"
            >
              <Printer className="size-4" />
              <span>Print Suggested 1040-ES Schedule</span>
            </Button>
          </Card>

          {/* Printable 1040-ES Estimated Installments Vouchers */}
          <div className="relative group border border-slate-200 shadow-xl rounded-2xl overflow-hidden" id="tax-vouchers-print">
            <div className="p-8 bg-white min-h-[750px] font-sans text-slate-800" id="receipt-print-area">

              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <span className="text-[10px] font-black text-slate-400 block uppercase font-mono">DEPARTMENT OF THE TREASURY - INTERNAL REVENUE SERVICE</span>
                <h1 className="text-lg font-black text-slate-950 leading-tight">
                  FORM 1040-ES ESTIMATED TAX INSTALLMENT BLUEPRINTS
                </h1>
                <p className="text-[10px] text-slate-500 font-bold font-mono">
                  PROJECTION STATEMENT CALENDAR TAX YEAR 2026
                </p>
              </div>

              {/* Installment breakdown list */}
              <div className="space-y-6">
                {[
                  { quarter: "Voucher 1", due: "April 15, 2026", num: "Q1" },
                  { quarter: "Voucher 2", due: "June 15, 2026", num: "Q2" },
                  { quarter: "Voucher 3", due: "September 15, 2026", num: "Q3" },
                  { quarter: "Voucher 4", due: "January 15, 2027", num: "Q4" }
                ].map((item, idx) => (
                  <div key={item.quarter} className="border border-dashed border-slate-300 rounded-xl p-4 text-xs font-semibold relative">
                    <div className="absolute right-3 top-3 border px-1.5 py-0.5 rounded text-[11px] bg-slate-50 font-mono text-slate-400">
                      Cut along dotted line
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-black">{item.quarter} - INSTALLMENT SUMMARY</span>
                        <p className="text-sm font-black text-slate-950">{item.num} Payment Voucher</p>
                        <span className="block text-[10px] text-slate-500 font-bold font-mono mt-1">Due date: {item.due}</span>
                      </div>

                      <div className="text-right flex flex-col justify-end">
                        <span className="text-[11px] uppercase font-black text-slate-400">Installment Sum</span>
                        <p className="text-md font-black text-slate-900 font-mono">
                          ${results.quarterlyVoucherPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-slate-200">
                      <div>
                        <span className="text-[11px] block text-slate-400 uppercase font-mono">Taxpayer SSN/EIN</span>
                        <span className="text-[10px] font-bold text-slate-500 block">---------------------</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] block text-slate-400 uppercase">Filing Code</span>
                        <span className="text-[10px] font-bold text-slate-500 block">Form 1040-ES</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footnote instruction advice */}
              <div className="bg-slate-100 p-3 rounded-lg border text-[11px] text-slate-500 font-mono mt-8 leading-snug">
                PAYMENT INSTRUCTIONS: You may submit these quarterly estimated taxes online directly via the IRS Direct Pay service.
                Keep this printable page reference in your historic business calendar audit folders. Projections remain simulated.
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
