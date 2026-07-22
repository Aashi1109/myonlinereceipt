// Design-system barrel for /design-sync. Re-exports the app's page components
// as named exports so the converter can assign them to window.SmarttoolsPaperwork.
// Not imported by the app itself. Safe to delete outside a sync run.
export { default as InvoiceForm } from "./components/InvoiceForm";
export { default as InvoicePreviewRenderer } from "./components/InvoicePreviewRenderer";
export { default as TemplateSelector } from "./components/TemplateSelector";
export { default as RelatedTools } from "./components/RelatedTools";
export { default as ReceiptGeneratorPage } from "./components/receipt/ReceiptGeneratorPage";
export { default as ExpenseReportPage } from "./components/expense/ExpenseReportPage";
export { default as MileageLogPage } from "./components/mileage/MileageLogPage";
export { default as NecTrackerPage } from "./components/nec1099/NecTrackerPage";
export { default as QuarterlyTaxEstimatorPage } from "./components/tax/QuarterlyTaxEstimatorPage";
export { default as W9RequestPage } from "./components/w9/W9RequestPage";
