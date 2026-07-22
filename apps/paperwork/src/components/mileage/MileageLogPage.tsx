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
  Navigation,
  Gauge,
  Milestone,
  Fuel
} from "lucide-react";
import { DataBridge, DataBridgeKeys, MileageEntry } from "../../lib/shared/dataBridge";

interface FuelRecord {
  id: string;
  date: string;
  gallons: number;
  cost: number;
  merchant: string;
  odometer: number;
}

interface MileageTrackerData {
  taxYear: number;
  businessRate: number; // e.g. 0.67
  vehicleModel: string;
  trips: MileageEntry[];
  fuelRecords: FuelRecord[];
}

const DEFAULT_MILEAGE: MileageTrackerData = {
  taxYear: 2026,
  businessRate: 0.67, // IRS standard rate
  vehicleModel: "2024 Tesla Model Y / Hybrid Utility",
  trips: [
    { id: "trip-1", date: new Date().toISOString().substring(0, 10), purpose: "Consulting onsite sprint", startLocation: "Asheville Office", destination: "CLT Innovation hub", startOdometer: 14200, endOdometer: 14310, miles: 110, rate: 0.67, amount: 73.70 }
  ],
  fuelRecords: [
    { id: "fuel-1", date: new Date(Date.now() - 5*24*60*60*1000).toISOString().substring(0, 10), gallons: 11.2, cost: 38.50, merchant: "Shell Station 412", odometer: 14190 }
  ]
};

const SAMPLE_MILEAGE: MileageTrackerData = {
  taxYear: 2026,
  businessRate: 0.67,
  vehicleModel: "2024 Ford Maverick Hybrid",
  trips: [
    { id: "trip-1", date: "2026-04-12", purpose: "Client pitch review meeting", startLocation: "Asheville HQ", destination: "Broad St Retail Lab", startOdometer: 19120, endOdometer: 19175, miles: 55, rate: 0.67, amount: 36.85 },
    { id: "trip-2", date: "2026-04-15", purpose: "Picked up printed flyer blueprints", startLocation: "Asheville HQ", destination: "FedEx Print Center CLT", startOdometer: 19175, endOdometer: 19290, miles: 115, rate: 0.67, amount: 77.05 },
    { id: "trip-3", date: "2026-04-20", purpose: "Site inspection post development sign-off", startLocation: "Charlotte Tech Park", destination: "Corporate Center North", startOdometer: 19290, endOdometer: 19325, miles: 35, rate: 0.67, amount: 23.45 }
  ],
  fuelRecords: [
    { id: "fuel-1", date: "2026-04-10", gallons: 12.0, cost: 42.00, merchant: "Shell Asheville Gas", odometer: 19050 },
    { id: "fuel-2", date: "2026-04-18", gallons: 11.5, cost: 40.25, merchant: "Chevron CLT Airport", odometer: 19220 }
  ]
};

export default function MileageLogPage({ onTrackClick }: { onTrackClick?: (item: string) => void }) {
  const [data, setData] = useState<MileageTrackerData>(() => {
    return DataBridge.get<MileageTrackerData>(DataBridgeKeys.MILEAGE_DRAFT, DEFAULT_MILEAGE);
  });

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);

  // Synchronize draft states
  useEffect(() => {
    // Calculate and trigger individual trip auto-amounts prior to save
    const updatedTrips = data.trips.map(t => ({
      ...t,
      amount: Number(t.miles || 0) * Number(data.businessRate || 0.67)
    }));

    // Save to localStorage
    try {
      localStorage.setItem(DataBridgeKeys.MILEAGE_DRAFT, JSON.stringify({
        ...data,
        trips: updatedTrips
      }));
    } catch (e) {
      console.error(e);
    }

    // Bridge details for Quarterly tax calculation
    const totalMileageValue = updatedTrips.reduce((acc, curr) => acc + curr.amount, 0);
    const totalMileageMiles = updatedTrips.reduce((acc, curr) => acc + Number(curr.miles || 0), 0);

    DataBridge.set(DataBridgeKeys.MILEAGE_SUMMARY, {
      year: data.taxYear,
      totalMiles: totalMileageMiles,
      totalAmount: totalMileageValue
    });
  }, [data]);

  const handleAddTrip = () => {
    const lastOdo = data.trips.length > 0 ? (data.trips[data.trips.length - 1].endOdometer || 0) : 0;
    const newTrip: MileageEntry = {
      id: `trip-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      purpose: "",
      startLocation: "",
      destination: "",
      startOdometer: lastOdo || undefined,
      endOdometer: lastOdo ? lastOdo + 10 : undefined,
      miles: 0,
      rate: data.businessRate,
      amount: 0
    };
    setData({
      ...data,
      trips: [...data.trips, newTrip]
    });
    onTrackClick("mileage_trip_added");
  };

  const handleRemoveTrip = (id: string) => {
    setData({
      ...data,
      trips: data.trips.filter(t => t.id !== id)
    });
    onTrackClick("mileage_trip_removed");
  };

  const handleTripChange = (id: string, field: keyof MileageEntry, val: any) => {
    const updated = data.trips.map(t => {
      if (t.id === id) {
        const u = {
          ...t,
          [field]: field === "startOdometer" || field === "endOdometer" || field === "miles" ? (val === "" ? "" : Number(val)) : val
        };
        // Auto reconcile miles if start & end odometers are updated
        if (field === "startOdometer" || field === "endOdometer") {
          const start = Number(u.startOdometer || 0);
          const end = Number(u.endOdometer || 0);
          if (end > start) {
            u.miles = end - start;
          }
        }
        u.amount = Number(u.miles || 0) * Number(data.businessRate);
        return u;
      }
      return t;
    });
    setData({ ...data, trips: updated });
  };

  const handleAddFuel = () => {
    const newFuel: FuelRecord = {
      id: `fuel-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      gallons: 0,
      cost: 0,
      merchant: "",
      odometer: 0
    };
    setData({
      ...data,
      fuelRecords: [...data.fuelRecords, newFuel]
    });
    onTrackClick("mileage_fuel_added");
  };

  const handleRemoveFuel = (id: string) => {
    setData({
      ...data,
      fuelRecords: data.fuelRecords.filter(f => f.id !== id)
    });
    onTrackClick("mileage_fuel_removed");
  };

  const handleFuelChange = (id: string, field: keyof FuelRecord, val: any) => {
    const updated = data.fuelRecords.map(f => {
      if (f.id === id) {
        return {
          ...f,
          [field]: field === "gallons" || field === "cost" || field === "odometer" ? (val === "" ? "" : Number(val)) : val
        };
      }
      return f;
    });
    setData({ ...data, fuelRecords: updated });
  };

  const handleLoadSample = () => {
    setData(SAMPLE_MILEAGE);
    onTrackClick("mileage_sample_loaded");
  };

  const handleClearDraft = () => {
    if (confirm("Are you sure you want to clear mileage log history?")) {
      setData(DEFAULT_MILEAGE);
      onTrackClick("mileage_draft_cleared");
    }
  };

  // Stats calculation
  const calculateStats = () => {
    const tripsCount = data.trips.length;
    const totalMiles = data.trips.reduce((acc, current) => acc + Number(current.miles || 0), 0);
    const totalDue = totalMiles * Number(data.businessRate || 0.67);
    const avgMiles = tripsCount > 0 ? (totalMiles / tripsCount).toFixed(1) : "0";

    const totalFuelCost = data.fuelRecords.reduce((acc, current) => acc + Number(current.cost || 0), 0);
    const totalGallons = data.fuelRecords.reduce((acc, current) => acc + Number(current.gallons || 0), 0);

    // Simple MPG estimation over odometer ranges of fuel fills
    let fuelEconomy = "N/A";
    if (data.fuelRecords.length > 1 && totalGallons > 0) {
      const sortedFuelLogs = [...data.fuelRecords].sort((a,b) => a.odometer - b.odometer);
      const minOdo = sortedFuelLogs[0].odometer;
      const maxOdo = sortedFuelLogs[sortedFuelLogs.length - 1].odometer;
      const odoDelta = maxOdo - minOdo;
      if (odoDelta > 0) {
        // Gallons filled except the first tank to compute correct mileage
        const computationGallons = sortedFuelLogs.slice(1).reduce((acc, c) => acc + Number(c.gallons || 0), 0);
        if (computationGallons > 0) {
          fuelEconomy = (odoDelta / computationGallons).toFixed(1);
        }
      }
    }

    return {
      tripsCount,
      totalMiles,
      totalDue,
      avgMiles,
      totalFuelCost,
      fuelEconomy
    };
  };

  const stats = calculateStats();

  const handleExportCSV = () => {
    onTrackClick("mileage_csv_exported");
    let content = "Date,Business Purpose,Start Location,Destination,Start Odometer,End Odometer,Miles,Rate,Amount Due\n";
    data.trips.forEach((t) => {
      content += `"${t.date}","${t.purpose.replace(/"/g, '""')}","${t.startLocation.replace(/"/g, '""')}","${t.destination.replace(/"/g, '""')}",${t.startOdometer || ""},${t.endOdometer || ""},${t.miles},${data.businessRate},${(t.miles * data.businessRate).toFixed(2)}\n`;
    });

    if (data.fuelRecords.length > 0) {
      content += "\nFUEL & LOGISTIC ENTRIES\n";
      content += "Date,Merchant/Gas Station,Gallons Filled,Total Cost,Odometer Reading\n";
      data.fuelRecords.forEach((f) => {
        content += `"${f.date}","${f.merchant.replace(/"/g, '""')}",${f.gallons},${f.cost},${f.odometer}\n`;
      });
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mileage-tax-log-${data.taxYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    onTrackClick("mileage_print_clicked");
    window.print();
  };

  return (
    <div className="grow w-full font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="mileage-tracker-wrapper">

      <ToolPageHeader
        actions={(
          <>
            <Button onClick={handleLoadSample} size="sm" variant="secondary">
              <RefreshCw className="size-3.5" />
              <span>Load Sample</span>
            </Button>
            <Button onClick={handleClearDraft} size="sm" variant="danger-subtle">
              Clear Fields
            </Button>
          </>
        )}
        className="print:hidden"
        description="Log tax-deductible driving trips, manage fuel consumption ratings, and export clean sheets."
        eyebrow={<StatusBadge variant="success">IRS Audit-Compliant Mileage Format</StatusBadge>}
        title="Mileage Log Tracker"
      />

      {/* Metrics Dashboard Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:hidden" id="mileage-stats-grid">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85">
          <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Driven Miles</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{stats.totalMiles}</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">miles</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/85">
          <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Estimated Deduction</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600">${stats.totalDue.toFixed(2)}</span>
            <span className="text-[11px] font-mono font-bold text-slate-400">write-off</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/85">
          <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Trip Length</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{stats.avgMiles}</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">mi/trip</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/85">
          <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Fuel Economy Rating</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-600">
              {stats.fuelEconomy !== "N/A" ? `${stats.fuelEconomy}` : "N/A"}
            </span>
            {stats.fuelEconomy !== "N/A" && <span className="text-[10px] font-bold text-slate-500 font-mono">MPG</span>}
          </div>
        </div>
      </div>

      {/* Mobile tabs mapping */}
      <div className="flex md:hidden bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/50 print:hidden" id="mileage-tabs-switch">
        <button
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "edit" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500"}`}
          onClick={() => setActiveTab("edit")}
        >
          1. Edit Driving Logs
        </button>
        <button
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "preview" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500"}`}
          onClick={() => setActiveTab("preview")}
        >
          2. Printable Records View
        </button>
      </div>

      {/* Editor Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* EDITING FORM SECTION */}
        <div className={`lg:col-span-7 space-y-6 ${activeTab === "edit" ? "block" : "hidden md:block"} print:hidden`}>

          <Card className="space-y-6">

            {/* Rates & Vehicle info */}
            <div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                1. Vehicle Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="mileage-tax-year">Tax Filing Year</label>
                  <Select
                    className="font-bold"
                    id="mileage-tax-year"
                    value={data.taxYear}
                    onChange={(e) => setData({ ...data, taxYear: Number(e.target.value) })}
                  >
                    <option value={2026}>Tax Year 2026 ($.67/mi)</option>
                    <option value={2025}>Tax Year 2025 ($.67/mi)</option>
                    <option value={2024}>Tax Year 2024 ($.67/mi)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="mileage-deduction-rate">Deduction rate ($/mile) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    className="font-black"
                    id="mileage-deduction-rate"
                    value={data.businessRate}
                    onChange={(e) => setData({ ...data, businessRate: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="mileage-vehicle-model">Vehicle Description Model</label>
                  <Input
                    type="text"
                    className="font-semibold"
                    id="mileage-vehicle-model"
                    value={data.vehicleModel}
                    onChange={(e) => setData({ ...data, vehicleModel: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Trip items input list */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest font-sans">
                  2. Driving Mileage Entries
                </h3>
                <Button
                  type="button"
                  onClick={handleAddTrip}
                  size="sm"
                  variant="strong"
                >
                  <Plus className="size-3.5" />
                  <span>Add New Trip</span>
                </Button>
              </div>

              <div className="space-y-4">
                {data.trips.map((trip, idx) => (
                  <div key={trip.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 relative">
                    <Button
                      type="button"
                      onClick={() => handleRemoveTrip(trip.id)}
                      aria-label="Remove trip"
                      className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase mb-1" htmlFor={`mileage-trip-${trip.id}-date`}>Date *</label>
                        <Input
                          id={`mileage-trip-${trip.id}-date`}
                          type="date"
                          value={trip.date}
                          onChange={(e) => handleTripChange(trip.id, "date", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase mb-1" htmlFor={`mileage-trip-${trip.id}-purpose`}>Purpose *</label>
                        <Input
                          type="text"
                          placeholder="e.g. Broad Street lab drop-off"
                          className="font-semibold"
                          id={`mileage-trip-${trip.id}-purpose`}
                          value={trip.purpose}
                          onChange={(e) => handleTripChange(trip.id, "purpose", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1" htmlFor={`mileage-trip-${trip.id}-miles`}>Miles Driven *</label>
                        <Input
                          type="number"
                          placeholder="e.g. 50"
                          className="font-black"
                          id={`mileage-trip-${trip.id}-miles`}
                          value={trip.miles || ""}
                          onChange={(e) => handleTripChange(trip.id, "miles", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[10px] font-medium text-slate-500">
                      <div>
                        <Input
                          aria-label={`Trip ${idx + 1} start location`}
                          type="text"
                          placeholder="Start loc (Optional)"
                          value={trip.startLocation || ""}
                          onChange={(e) => handleTripChange(trip.id, "startLocation", e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          aria-label={`Trip ${idx + 1} destination`}
                          type="text"
                          placeholder="Destination (Optional)"
                          value={trip.destination || ""}
                          onChange={(e) => handleTripChange(trip.id, "destination", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input
                          aria-label={`Trip ${idx + 1} starting odometer`}
                          type="number"
                          placeholder="Start Odo"
                          className="text-center font-mono font-bold"
                          value={trip.startOdometer || ""}
                          onChange={(e) => handleTripChange(trip.id, "startOdometer", e.target.value)}
                        />
                        <Input
                          aria-label={`Trip ${idx + 1} ending odometer`}
                          type="number"
                          placeholder="End Odo"
                          className="text-center font-mono font-bold"
                          value={trip.endOdometer || ""}
                          onChange={(e) => handleTripChange(trip.id, "endOdometer", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gasoline Fuel Receipts log */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4 font-sans">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                  3. Fuel Purchase Tracker (For MPG / Expenses)
                </h3>
                <Button
                  type="button"
                  onClick={handleAddFuel}
                  size="sm"
                  variant="strong"
                >
                  <Plus className="size-3.5" />
                  <span>Add Fuel Slip</span>
                </Button>
              </div>

              {data.fuelRecords.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl text-slate-400 text-xs font-semibold">
                  No fuel receipt records logged. Enter gas logs to compute active vehicle MPG!
                </div>
              ) : (
                <div className="space-y-3">
                  {data.fuelRecords.map((fuel) => (
                    <div key={fuel.id} className="p-3 bg-slate-50 border rounded-xl relative flex flex-col md:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={() => handleRemoveFuel(fuel.id)}
                        aria-label="Remove fuel record"
                        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>

                      <div className="grow grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase" htmlFor={`mileage-fuel-${fuel.id}-date`}>Refuel Date</label>
                          <Input
                            id={`mileage-fuel-${fuel.id}-date`}
                            type="date"
                            value={fuel.date}
                            onChange={(e) => handleFuelChange(fuel.id, "date", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-[11px] font-black text-slate-400 uppercase" htmlFor={`mileage-fuel-${fuel.id}-merchant`}>Merchant</label>
                          <Input
                            type="text"
                            placeholder="Shell, Exxon..."
                            className="font-semibold"
                            id={`mileage-fuel-${fuel.id}-merchant`}
                            value={fuel.merchant}
                            onChange={(e) => handleFuelChange(fuel.id, "merchant", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase" htmlFor={`mileage-fuel-${fuel.id}-gallons`}>Gallons</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="font-bold"
                            id={`mileage-fuel-${fuel.id}-gallons`}
                            value={fuel.gallons || ""}
                            onChange={(e) => handleFuelChange(fuel.id, "gallons", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase" htmlFor={`mileage-fuel-${fuel.id}-cost`}>Cost ($)</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="font-black"
                            id={`mileage-fuel-${fuel.id}-cost`}
                            value={fuel.cost || ""}
                            onChange={(e) => handleFuelChange(fuel.id, "cost", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase" htmlFor={`mileage-fuel-${fuel.id}-odometer`}>Odometer</label>
                          <Input
                            type="number"
                            placeholder="e.g. 19050"
                            className="text-center font-mono font-bold"
                            id={`mileage-fuel-${fuel.id}-odometer`}
                            value={fuel.odometer || ""}
                            onChange={(e) => handleFuelChange(fuel.id, "odometer", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </Card>

          <AlertBanner title="IRS Mileage Log Mandates" variant="success">
            <p>
              Taxpayers must maintain written records detailing trip dates, business miles drivings, starting coordinates, and professional transaction purposes.
              Keep this exported file in your audit folders.
            </p>
          </AlertBanner>

        </div>

        {/* PRINT ACTIONABLE SHEETS COLUMN */}
        <div className={`lg:col-span-5 space-y-6 lg:sticky lg:top-20 leading-relaxed ${activeTab === "preview" ? "block" : "hidden md:block"}`}>

          <Card className="space-y-3 p-4 print:hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b border-slate-100 pb-2 font-sans">
              <span>MILEAGE SHEET DRIVING REPORT</span>
              <StatusBadge variant="info">Ready to Print</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <Button
                onClick={handlePrint}
                className="w-full"
                type="button"
                variant="strong"
              >
                <Printer className="size-4" />
                <span>Save to PDF</span>
              </Button>
              <Button
                onClick={handleExportCSV}
                className="w-full"
                type="button"
                variant="secondary"
              >
                <Download className="size-4" />
                <span>Export CSV Sheet</span>
              </Button>
            </div>
          </Card>

          {/* Formulated sheets paper render */}
          <div className="relative group border border-slate-200 shadow-2xl rounded-2xl">
            <div className="p-8 bg-white min-h-[750px] font-sans text-slate-800" id="receipt-print-area">

              <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-6">
                <div>
                  <span className="text-[11px] font-black tracking-widest text-[#0066cc] uppercase">
                    IRS TAX SCHEDULE REPORTING
                  </span>
                  <h1 className="text-xl font-black text-slate-950 mt-1 uppercase">
                    MILEAGE &amp; TRIP COMPLIANCE LOG
                  </h1>
                  <span className="text-[10px] text-slate-400 font-bold block font-mono mt-1">
                    TAX FILING CALENDAR YEAR {data.taxYear}
                  </span>
                </div>

                <div className="text-right">
                  <div className="bg-slate-100 border border-slate-200 px-3 py-1 font-black text-xs inline-block text-slate-900 rounded font-mono">
                    LOG-M-{data.taxYear}
                  </div>
                  <span className="block text-[11px] text-slate-500 font-bold font-mono mt-2">
                    RATE COMPLIANT: ${data.businessRate}/mi
                  </span>
                </div>
              </div>

              {/* Vehicle credentials */}
              <div className="bg-slate-50 border rounded-xl p-3 mb-6 text-xs flex justify-between font-semibold">
                <div>
                  <span className="text-[11px] text-slate-400 font-extrabold block uppercase tracking-wider mb-0.5">Primary Vehicle</span>
                  <p className="text-slate-900 font-extrabold">{data.vehicleModel || "Registered Tax Vehicle"}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 font-extrabold block uppercase tracking-wider mb-0.5">Deduction Sum</span>
                  <p className="text-emerald-700 font-mono font-black">${stats.totalDue.toFixed(2)}</p>
                </div>
              </div>

              {/* Printable Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Trip Purpose / Coordinates</th>
                      <th className="py-2.5 px-3 text-center w-16">Miles</th>
                      <th className="py-2.5 px-3 text-right w-24">Write-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trips.map((t, idx) => (
                      <tr key={t.id || idx} className="border-b last:border-b-0 border-slate-200">
                        <td className="py-3 px-3 font-mono text-slate-500">{t.date}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 leading-snug">
                          {t.purpose || "Business Trip Outing"}
                          {(t.startLocation || t.destination) && (
                            <span className="block text-[11px] text-slate-400/80 font-mono leading-none pt-1">
                              From: {t.startLocation || "HQ"} → To: {t.destination || "Site"}
                            </span>
                          )}
                          {t.startOdometer !== undefined && t.endOdometer !== undefined && (
                            <span className="block text-[11px] text-blue-600/80 font-mono leading-none pt-0.5">
                              Odometer Readings: {t.startOdometer} → {t.endOdometer}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">
                          {t.miles} mi
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          ${(t.miles * data.businessRate).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Fuel record logs representation */}
              {data.fuelRecords.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 text-xs">
                  <div className="bg-slate-100/50 px-3 py-1.5 border-b border-slate-200 text-[10px] font-black text-slate-900 uppercase">
                    Refueling Log &amp; Reconciles
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/75 text-[11px] font-black text-slate-400 uppercase">
                      <tr className="border-b">
                        <th className="py-1.5 px-3">Date</th>
                        <th className="py-1.5 px-3">Gas Station Merchant</th>
                        <th className="py-1.5 px-3 text-center">Gallons</th>
                        <th className="py-1.5 px-3 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fuelRecords.map((f, idx) => (
                        <tr key={f.id || idx} className="border-b last:border-b-0 border-slate-100">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{f.date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">{f.merchant || "Fuel Fill Station"}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{f.gallons} gal</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-800">${f.cost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Declarations credentials signatory info */}
              <div className="border-t border-slate-200/80 pt-6 mt-12 text-center text-xs">
                <p className="font-extrabold text-slate-900 uppercase">Audit Records Declaration Sign-off</p>
                <p className="text-[10px] text-slate-500 leading-normal max-w-xl mx-auto mt-2">
                  I hereby declare that this mileage register accurate details of actual miles, calendar dates, and coordinates driven purely in service of corporate business milestones.
                </p>

                <div className="grid grid-cols-2 gap-8 mt-8 max-w-md mx-auto">
                  <div className="space-y-2">
                    <div className="border-b border-slate-300 h-8" />
                    <span className="block text-[11px] uppercase font-bold text-slate-400">Driver Signatory</span>
                  </div>
                  <div className="space-y-2">
                    <div className="border-b border-slate-300 h-8" />
                    <span className="block text-[11px] uppercase font-bold text-slate-400 font-mono">Reconciled date</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
