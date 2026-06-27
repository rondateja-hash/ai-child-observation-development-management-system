import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Save, Key, Mail, Landmark, Loader2, CheckCircle, Info } from "lucide-react";
export default function SettingsView({ user, addToast }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await api.getSettings();
                setSettings(data);
            }
            catch (err) {
                addToast("Error loading configurations", err.message, "error");
            }
            finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);
    const handleSave = async (e) => {
        e.preventDefault();
        if (!settings)
            return;
        setSaving(true);
        try {
            await api.updateSettings(settings);
            addToast("Settings Updated", "Successfully saved system configurations to database.", "success");
        }
        catch (err) {
            addToast("Failed to save", err.message, "error");
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (<div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="h-44 bg-slate-100 rounded-xl"></div>
        <div className="h-44 bg-slate-100 rounded-xl"></div>
      </div>);
    }
    return (<div className="space-y-6 font-sans">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Portal Configurations</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Manage school registries, SMTP mailer configurations, and inspect AI service integrations.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branch / School Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Landmark className="h-5 w-5 text-blue-600"/>
            <h2 className="font-display font-bold text-base text-slate-900">Centre Identification</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-600 mb-1.5">Primary School Group</label>
              <input type="text" disabled={user.role !== "Super Admin"} value={settings?.schoolName || ""} onChange={(e) => setSettings(prev => prev ? { ...prev, schoolName: e.target.value } : null)} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm font-semibold"/>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5">Branch / Centre Name</label>
              <input type="text" disabled={user.role !== "Super Admin"} value={settings?.centreBranch || ""} onChange={(e) => setSettings(prev => prev ? { ...prev, centreBranch: e.target.value } : null)} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm font-semibold"/>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5">Contact Line</label>
              <input type="text" disabled={user.role !== "Super Admin"} value={settings?.contactPhone || ""} onChange={(e) => setSettings(prev => prev ? { ...prev, contactPhone: e.target.value } : null)} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm font-semibold"/>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5">Portal URL Reference</label>
              <input type="url" disabled={user.role !== "Super Admin"} value={settings?.portalUrl || ""} onChange={(e) => setSettings(prev => prev ? { ...prev, portalUrl: e.target.value } : null)} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm font-semibold"/>
            </div>
          </div>
        </div>

        {/* SMTP Mailer Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Mail className="h-5 w-5 text-blue-600"/>
            <h2 className="font-display font-bold text-base text-slate-900">SMTP Notification Gateways</h2>
          </div>

          <p className="text-xs text-slate-400 font-medium">Used to automatically dispatch parent notifications, audit log summaries, and clinical warnings.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-600 mb-1.5">SMTP Host Server</label>
              <input type="text" disabled={user.role !== "Super Admin"} value={settings?.smtpHost || ""} onChange={(e) => setSettings(prev => prev ? { ...prev, smtpHost: e.target.value } : null)} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"/>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5">SMTP Port</label>
              <input type="number" disabled={user.role !== "Super Admin"} value={settings?.smtpPort || 587} onChange={(e) => setSettings(prev => prev ? { ...prev, smtpPort: Number(e.target.value) } : null)} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"/>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5">Sender Email Address</label>
              <input type="email" disabled={user.role !== "Super Admin"} value={settings?.smtpUser || ""} onChange={(e) => setSettings(prev => prev ? { ...prev, smtpUser: e.target.value } : null)} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"/>
            </div>
          </div>
        </div>

        {/* Gemini API and Server Deployment info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Key className="h-5 w-5 text-blue-600"/>
            <h2 className="font-display font-bold text-base text-slate-900">AI Service Integration</h2>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-3.5 items-start">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5"/>
            <div>
              <span className="text-sm font-bold text-emerald-900">Gemini-3.5 AI Engine Active</span>
              <p className="text-xs text-emerald-700/95 mt-1 leading-relaxed">
                The full-stack observation report processor is running with the latest @google/genai module and is connected to Google AI Studio's server-side secure gateway.
              </p>
            </div>
          </div>

          {/* Secure credentials explanation card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex gap-3 items-start text-xs text-slate-500 leading-relaxed font-medium">
            <Info className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5"/>
            <div>
              <span className="font-bold text-slate-700 block">Security & API Credentials Policy</span>
              <p className="mt-1">
                To guarantee children's privacy and portal safety, API secrets (such as the <code>GEMINI_API_KEY</code>) are managed exclusively server-side via the secure environment variables panel. They are never exposed to clients, and no form exists on the client to input these keys.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        {user.role === "Super Admin" && (<div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md shadow-sm transition-all text-sm disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
              <span>{saving ? "Saving Changes..." : "Save System Configurations"}</span>
            </button>
          </div>)}
      </form>
    </div>);
}
