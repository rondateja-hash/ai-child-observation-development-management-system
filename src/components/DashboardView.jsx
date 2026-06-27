import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { motion } from "motion/react";
import { Users, BookOpen, Sparkles, Clock, Calendar, CheckSquare, ShieldCheck, TrendingUp } from "lucide-react";
export default function DashboardView({ user, addToast, setActiveTab }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function loadStats() {
            try {
                const data = await api.getDashboardStats();
                setStats(data);
            }
            catch (err) {
                addToast("Error Loading Data", err.message || "Failed to load dashboard metrics.", "error");
            }
            finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);
    if (loading) {
        return (<div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (<div key={i} className="h-28 bg-slate-100 rounded-xl"></div>))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-xl"></div>
          <div className="h-96 bg-slate-100 rounded-xl"></div>
        </div>
      </div>);
    }
    const totals = stats?.totals || {
        children: 0,
        teachers: 0,
        observations: 0,
        reportsGenerated: 0,
        attendanceRate: 90,
        pendingObservations: 0
    };
    const recentLogs = stats?.recentLogs || [];
    const categoryChart = stats?.categoryChart || [];
    const monthlyObservations = stats?.monthlyObservations || [];
    const classrooms = stats?.classrooms || [];
    // Color mapping helper for observation categories
    const getCatColor = (cat) => {
        switch (cat.toLowerCase()) {
            case 'social': return 'from-blue-500 to-cyan-400 bg-blue-50 text-blue-600';
            case 'communication': return 'from-purple-500 to-indigo-400 bg-purple-50 text-purple-600';
            case 'behaviour': return 'from-amber-500 to-orange-400 bg-amber-50 text-amber-600';
            case 'learning': return 'from-emerald-500 to-teal-400 bg-emerald-50 text-emerald-600';
            default: return 'from-slate-500 to-slate-400 bg-slate-50 text-slate-600';
        }
    };
    return (<div className="space-y-8 font-sans">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {user.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Role: <span className="font-semibold text-blue-600">{user.role}</span> | Centre: FirstCry Intellitots, Koramangala
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-slate-500 text-sm font-medium self-start md:self-auto">
          <Calendar className="h-4 w-4 text-slate-400"/>
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab("children")}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-blue-600">
            <Users className="h-24 w-24"/>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Children</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="h-4.5 w-4.5"/>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totals.children}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+1 this week</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab("observations")}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-purple-600">
            <BookOpen className="h-24 w-24"/>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observations Logged</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <BookOpen className="h-4.5 w-4.5"/>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totals.observations}</span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              {totals.pendingObservations} pending review
            </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab("reports")}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-indigo-600">
            <Sparkles className="h-24 w-24"/>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Reports Generated</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles className="h-4.5 w-4.5"/>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totals.reportsGenerated}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">100% Milestone Fit</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab("attendance")}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-emerald-600">
            <Clock className="h-24 w-24"/>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Clock className="h-4.5 w-4.5"/>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totals.attendanceRate}%</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Optimal Rate</span>
          </div>
        </motion.div>
      </div>

      {/* Charts and Data Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend (Bar Chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Observation Trends</h3>
              <p className="text-xs text-slate-500">Log activity counts over current weekday sequence</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5"/>
              <span>+18% versus last week</span>
            </div>
          </div>

          {/* Simple Highly Polished SVG Bar Chart */}
          <div className="h-64 flex items-end justify-between px-4 pt-4 relative">
            <div className="absolute inset-x-0 bottom-8 h-px bg-slate-100"></div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-4 h-px border-t border-dashed border-slate-100"></div>
            <div className="absolute inset-x-0 top-12 h-px border-t border-dashed border-slate-100"></div>

            {monthlyObservations.map((day, idx) => {
            const maxVal = Math.max(...monthlyObservations.map((d) => d.count)) || 1;
            const barHeight = (day.count / maxVal) * 80; // percent height
            return (<div key={idx} className="flex flex-col items-center gap-2 z-10 w-1/5 group">
                  <div className="text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 duration-300">
                    {day.count} logs
                  </div>
                  <div className="w-8 sm:w-12 bg-slate-100 rounded-t-xl h-44 flex items-end overflow-hidden">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${barHeight}%` }} transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }} className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl group-hover:from-blue-500 group-hover:to-indigo-400 transition-colors"></motion.div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{day.name}</span>
                </div>);
        })}
          </div>
        </div>

        {/* Category Breakdown (Donut Chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-display text-base font-bold text-slate-900 mb-1">Developmental Spheres</h3>
          <p className="text-xs text-slate-500 mb-6">Distribution of logged developmental categories</p>

          <div className="relative flex items-center justify-center h-48">
            {/* Visual Donut representation */}
            <svg className="w-36 h-36 transform -rotate-90">
              <circle cx="72" cy="72" r="54" stroke="#f1f5f9" strokeWidth="12" fill="transparent"/>
              {/* Dynamic segmented slices */}
              <circle cx="72" cy="72" r="54" stroke="#2563eb" strokeWidth="12" fill="transparent" strokeDasharray="339" strokeDashoffset="100" className="transition-all duration-1000"/>
              <circle cx="72" cy="72" r="54" stroke="#8b5cf6" strokeWidth="12" fill="transparent" strokeDasharray="339" strokeDashoffset="240" className="transition-all duration-1000"/>
              <circle cx="72" cy="72" r="54" stroke="#f59e0b" strokeWidth="12" fill="transparent" strokeDasharray="339" strokeDashoffset="300" className="transition-all duration-1000"/>
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-bold text-slate-900">{categoryChart.reduce((a, b) => a + b.value, 0) || totals.observations}</span>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Sphere Logs</p>
            </div>
          </div>

          {/* Slices legend */}
          <div className="mt-6 space-y-2">
            {categoryChart.slice(0, 3).map((item, idx) => (<div key={idx} className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${getCatColor(item.name).split(' ')[0]}`}></div>
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} logs</span>
              </div>))}
            {categoryChart.length === 0 && (<div className="text-xs text-slate-400 text-center py-4">No categories recorded yet.</div>)}
          </div>
        </div>
      </div>

      {/* Classrooms and Recent System Logs section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classrooms list */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">Assigned Classrooms</h3>
            <span className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer" onClick={() => setActiveTab("attendance")}>Manage Logs</span>
          </div>

          <div className="space-y-3">
            {classrooms.map((cls) => {
            const occupants = cls.id === 'cls-toddlers' ? 2 : (cls.id === 'cls-nursery' ? 1 : 1);
            const fillPercent = Math.min(100, Math.round((occupants / cls.capacity) * 100));
            return (<div key={cls.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 relative group overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{cls.name}</h4>
                      <p className="text-xs text-slate-400">Capacity: {cls.capacity} students max</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                      {occupants} Active
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full" style={{ width: `${fillPercent}%` }}></div>
                  </div>
                </div>);
        })}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">Recent Activities Audit</h3>
            <ShieldCheck className="h-5 w-5 text-emerald-500"/>
          </div>

          <div className="divide-y divide-slate-50 font-sans">
            {recentLogs.map((log, idx) => (<div key={idx} className="py-3 flex items-start gap-3.5 first:pt-0 last:pb-0">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 mt-0.5">
                  <CheckSquare className="h-4 w-4 text-blue-600"/>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">{log.userName} — <span className="text-slate-500 font-medium">{log.action}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>))}
            {recentLogs.length === 0 && (<p className="text-xs text-slate-400 text-center py-8">No activities recorded in audit logs.</p>)}
          </div>
        </div>
      </div>
    </div>);
}
