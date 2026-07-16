/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldAlert, KeyRound, ArrowRight, Sparkles } from "lucide-react";

interface AdminAuthGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AdminAuthGate({
  onSuccess,
  onCancel,
}: AdminAuthGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          sessionStorage.setItem("paperwork_kit_admin_authorized", "true");
          onSuccess();
        } else {
          setError(true);
          setPassword("");
        }
      } else {
        setError(true);
        setPassword("");
      }
    } catch (err) {
      console.error("Database passcode check failed:", err);
      // Fallback check if server offline
      if (password === "admin123") {
        sessionStorage.setItem("paperwork_kit_admin_authorized", "true");
        onSuccess();
      } else {
        setError(true);
        setPassword("");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 select-none font-sans" id="admin-pass-gate">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-fade-in text-slate-800">
        
        {/* Header Indicator */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-xs">
            <KeyRound className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-slate-900 text-base tracking-tight select-none">
              Administrative Credentials Gate
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal uppercase tracking-wider">
              Protected Area • Access Restricted
            </p>
          </div>
        </div>

        {/* Info advice box */}
        <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-[10.5px] leading-normal text-slate-500 font-medium">
          Accessing template architecture settings requires credentials. 
          For sandbox exploratory review, key is <code className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-extrabold select-all">admin123</code>.
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Passcode
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full px-3 py-2 border rounded-xl text-xs bg-slate-55/35 text-center font-bold tracking-widest focus:outline-none focus:ring-1 ${
                error 
                  ? "border-rose-400 focus:ring-rose-500 text-rose-700" 
                  : "border-slate-250 focus:ring-blue-500 text-slate-800"
              }`}
              autoFocus
            />
            {error && (
              <p className="text-[9px] text-rose-600 font-bold block pt-0.5 animate-bounce-none text-center">
                Invalid credential passcode. Access denied.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1 font-semibold">
            <button
              onClick={onCancel}
              type="button"
              className="flex-1 py-2 text-xs border border-slate-205 rounded-xl text-slate-650 hover:bg-slate-50 cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-extrabold shadow-sm flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Unlock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        <p className="text-[9px] text-slate-400 italic text-center pt-1 leading-normal">
          * Notice: Production builds should secure operations using next-auth, firebase-rules, clerk, or supabase auth guards.
        </p>

      </div>
    </div>
  );
}
