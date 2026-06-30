import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Filter, Sparkles, Trash2, Calendar, AlertTriangle, Eye, RefreshCw, X, MessageSquare } from "lucide-react";
const CATEGORIES = [
    "Social", "Communication", "Learning", "Behaviour", "Physical",
    "Motor Skills", "Creativity", "Emotional", "Language", "Health"
];
export default function ObservationsView({ user, addToast, setActiveTab, setSelectedObservationId }) {
    const [observations, setObservations] = useState([]);
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedChild, setSelectedChild] = useState("all");
    const [selectedRisk, setSelectedRisk] = useState("all");
    // Form states
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [analyzingId, setAnalyzingId] = useState(null);
    const [formData, setFormData] = useState({
        childId: "",
        category: "Social",
        note: "",
        riskLevel: "Low"
    });
    const loadData = async () => {
        try {
            const obsData = await api.getObservations();
            setObservations(obsData);
            const childData = await api.getChildren();
            setChildren(childData);
            if (childData.length > 0) {
                setFormData(prev => ({ ...prev, childId: childData[0].id }));
            }
        }
        catch (err) {
            addToast("Failed to fetch observations", err.message || "Error reading logs.", "error");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, []);
    const handleOpenAdd = () => {
        if (children.length === 0) {
            addToast("Add Students First", "Please enroll at least one student before adding observations.", "warning");
            return;
        }
        setFormData({
            childId: children[0].id,
            category: "Social",
            note: "",
            riskLevel: "Low"
        });
        setIsAddOpen(true);
    };
    const handleCreateObservation = async (e) => {
        e.preventDefault();
        if (!formData.note) {
            addToast("Required Field", "Please write the observational notes description.", "warning");
            return;
        }
        setSubmitting(true);
        try {
            await api.createObservation(formData);
            addToast("Observation Logged", "Saved new student observation entry.", "success");
            setIsAddOpen(false);
            loadData();
        }
        catch (err) {
            addToast("Logging Failed", err.message, "error");
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDeleteObservation = async (id, e) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this observational log and any associated AI reports?")) {
            try {
                await api.deleteObservation(id);
                addToast("Observation Removed", "Successfully deleted observation record.", "success");
                loadData();
            }
            catch (err) {
                addToast("Deletion Failed", err.message, "error");
            }
        }
    };
    const handleTriggerAI = async (obsId, e) => {
        e.stopPropagation();
        setAnalyzingId(obsId);
        addToast("Triggering Gemini AI", "Analyzing observation notes against early development guidelines...", "info");
        try {
            const report = await api.generateAIReport(obsId);
            addToast("AI Analysis Complete", `Successfully generated standard report for ${report.childName}`, "success");
            loadData();
            // Directly open the report page for the user!
            setSelectedObservationId(report.id);
            setActiveTab("reports");
        }
        catch (err) {
            addToast("AI Analysis Failed", err.message || "Could not generate developmental insights.", "error");
        }
        finally {
            setAnalyzingId(null);
        }
    };
    // Filter Logic
    const filteredObservations = observations.filter(obs => {
        const matchesSearch = obs.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            obs.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
            obs.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || obs.category === selectedCategory;
        const matchesChild = selectedChild === "all" || obs.childId === selectedChild;
        const matchesRisk = selectedRisk === "all" || obs.riskLevel === selectedRisk;
        return matchesSearch && matchesCategory && matchesChild && matchesRisk;
    });
    const getCategoryStyles = (cat) => {
        switch (cat.toLowerCase()) {
            case 'social': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'communication': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'learning': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'behaviour': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'physical': return 'bg-teal-50 text-teal-700 border-teal-100';
            case 'motor skills': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'creativity': return 'bg-pink-50 text-pink-700 border-pink-100';
            case 'emotional': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'language': return 'bg-violet-50 text-violet-700 border-violet-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };
    return (<div className="space-y-6 font-sans">
      {/* Header and Log button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Observation Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Record short developmental notes. Use Gemini AI to extract professional child profiles.</p>
        </div>
        {user.role !== "Parent" && (<button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md shadow-sm transition-all text-sm self-start sm:self-auto">
            <Plus className="h-4.5 w-4.5"/>
            <span>Create Observation</span>
          </button>)}
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-5 w-5"/>
          </div>
          <input type="text" placeholder="Search observations description, student, or teacher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-sm"/>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5"/>
            <span>Child:</span>
            <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer max-w-[120px] truncate">
              <option value="all">All Students</option>
              {children.map(c => (<option key={c.id} value={c.id}>{c.fullName}</option>))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5"/>
            <span>Sphere:</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option value="all">All Spheres</option>
              {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5"/>
            <span>Risk Level:</span>
            <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option value="all">All Risks</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Feed */}
      {loading ? (<div className="space-y-4 animate-pulse">
          {[...Array(2)].map((_, i) => (<div key={i} className="h-44 bg-slate-100 rounded-xl"></div>))}
        </div>) : (<div className="space-y-4">
          {filteredObservations.map(obs => {
                const isAnalyzing = analyzingId === obs.id;
                return (<motion.div key={obs.id} layout className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden">
                {/* Left meta info */}
                <div className="flex md:flex-col justify-between md:justify-start items-center md:items-start gap-4 shrink-0 md:w-44 border-b md:border-b-0 md:border-r border-slate-50 pb-4 md:pb-0 md:pr-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono block">DATE OF LOG</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Calendar className="h-4 w-4 text-slate-400"/>
                      <span>{new Date(obs.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="space-y-1 mt-0 md:mt-4">
                    <span className="text-[10px] font-bold text-slate-400 font-mono block">STUDENT</span>
                    <span className="text-sm font-bold text-slate-900 block">{obs.childName}</span>
                    <span className="text-[10px] text-slate-400 block">{obs.classroomName}</span>
                  </div>
                </div>

                {/* Center text entry */}
                <div className="flex-1 space-y-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold border rounded-lg ${getCategoryStyles(obs.category)}`}>
                      {obs.category}
                    </span>

                    {obs.riskLevel !== "Low" && (<span className={`px-2.5 py-1 text-xs font-semibold border rounded-lg flex items-center gap-1 ${obs.riskLevel === "High" ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                        <AlertTriangle className="h-3.5 w-3.5"/>
                        <span>{obs.riskLevel} Risk</span>
                      </span>)}

                    {obs.status === "Analyzed" ? (<span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
                        AI Processed
                      </span>) : (<span className="px-2.5 py-1 text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-100 rounded-lg">
                        Observation Drafted
                      </span>)}
                  </div>

                  {/* Core Note */}
                  <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200 flex gap-3">
                    <MessageSquare className="h-5 w-5 text-slate-400 shrink-0 mt-0.5"/>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed font-sans">
                      "{obs.note}"
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 pt-1 gap-2">
                    <span>Drafted by Teacher: <strong className="text-slate-600">{obs.teacherName}</strong></span>
                    <span className="font-mono">Log ID: {obs.id}</span>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex md:flex-col justify-end gap-2.5 shrink-0 pt-4 md:pt-0 md:pl-4 border-t md:border-t-0 md:border-l border-slate-200 items-center justify-center">
                  {user.role !== "Parent" && (<button onClick={(e) => handleTriggerAI(obs.id, e)} disabled={isAnalyzing} className={`w-full md:w-36 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-medium text-xs shadow-sm transition-all ${obs.status === "Analyzed"
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                            : "bg-blue-600 hover:bg-blue-500 text-white"} disabled:opacity-50`}>
                      {isAnalyzing ? (<>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin"/>
                          <span>Generating...</span>
                        </>) : (<>
                          <Sparkles className="h-3.5 w-3.5"/>
                          <span>{obs.status === "Analyzed" ? "Re-Analyze AI" : "Generate AI Report"}</span>
                        </>)}
                    </button>)}

                  {obs.status === "Analyzed" && (<button onClick={() => {
                            setSelectedObservationId(obs.id);
                            setActiveTab("reports");
                        }} className="w-full md:w-36 flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs transition-colors">
                      <Eye className="h-3.5 w-3.5"/>
                      <span>View AI Summary</span>
                    </button>)}

                  {user.role === "Super Admin" && (<button onClick={(e) => handleDeleteObservation(obs.id, e)} className="p-2 border border-slate-200 text-slate-400 hover:text-red-600 rounded-lg hover:border-red-200 transition-colors bg-white">
                      <Trash2 className="h-4 w-4"/>
                    </button>)}
                </div>
              </motion.div>);
            })}

          {filteredObservations.length === 0 && (<div className="py-16 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-300 text-5xl mb-4">📝</span>
              <h3 className="font-display font-bold text-slate-700 text-base">No Observations Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">No recorded teacher entries match your filters. Please select other criteria or add an observation.</p>
            </div>)}
        </div>)}

      {/* Add Observation Modal */}
      <AnimatePresence>
        {isAddOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setIsAddOpen(false)} className="fixed inset-0 bg-black"></motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden z-10 border border-slate-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="font-display font-bold text-xl text-slate-900">Record Student Observation</h2>
                <button onClick={() => setIsAddOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-5 w-5"/>
                </button>
              </div>

              <form onSubmit={handleCreateObservation} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Student *</label>
                  <select value={formData.childId} onChange={(e) => setFormData({ ...formData, childId: e.target.value })} className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm">
                    {children.map(c => (<option key={c.id} value={c.id}>{c.fullName} ({c.classroomName})</option>))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Category / Sphere *</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm">
                      {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Risk Level *</label>
                    <select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })} className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm">
                      <option value="Low">Low Risk (Standard)</option>
                      <option value="Medium">Medium Risk (Watch)</option>
                      <option value="High">High Risk (Intervention Needed)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Observation Note *
                  </label>
                  <textarea required rows={4} value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm resize-none leading-relaxed" placeholder="Describe what you observed. Keep it precise, factual, e.g. 'Riya shared blocks during the session but struggled to request water during lunch, resorting to pointing and crying when not understood.'"/>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Factual details help the Gemini developmental engine generate more precise reports.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button type="button" disabled={submitting} onClick={() => setIsAddOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? (<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : ("Save Observation")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>)}
      </AnimatePresence>
    </div>);
}
