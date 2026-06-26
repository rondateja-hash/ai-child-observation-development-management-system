import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Child, Classroom, Attendance, User, getChildAvatar } from "../types";
import { motion } from "motion/react";
import { Calendar, Check, X, Clock, Save, Loader2, BookOpen, AlertCircle } from "lucide-react";

interface AttendanceProps {
  user: User;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function AttendanceView({ user, addToast }: AttendanceProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local unsaved state mapping: childId -> { status, notes }
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, { status: 'Present' | 'Absent' | 'Late'; notes?: string }>>({});

  useEffect(() => {
    async function loadMetadata() {
      try {
        const stats = await api.getDashboardStats();
        const classes = stats.classrooms || [];
        setClassrooms(classes);
        
        // Auto-select user class if teacher, or first class
        if (user.classroomId) {
          setSelectedClassId(user.classroomId);
        } else if (classes.length > 0) {
          setSelectedClassId(classes[0].id);
        }
      } catch (err: any) {
        addToast("Error loading metadata", err.message, "error");
      }
    }
    loadMetadata();
  }, [user]);

  useEffect(() => {
    if (!selectedDate) return;
    if (user.role !== "Parent" && !selectedClassId) return;

    async function loadSheet() {
      setLoading(true);
      try {
        // Load children (Parents see all their children, others filter by class)
        const childrenData = await api.getChildren();
        const classKids = user.role === "Parent"
          ? childrenData
          : childrenData.filter(c => c.classroomId === selectedClassId);
        setChildren(classKids);

        // Fetch saved attendance records for this date
        const savedRecords = await api.getAttendance(selectedDate, user.role === "Parent" ? undefined : selectedClassId);
        
        const initialSheet: Record<string, { status: 'Present' | 'Absent' | 'Late'; notes?: string }> = {};
        
        // Pre-populate sheet from saved records or default to "Present"
        classKids.forEach(kid => {
          const saved = savedRecords.find(r => r.childId === kid.id);
          initialSheet[kid.id] = {
            status: saved ? saved.status : "Present",
            notes: saved ? saved.notes || "" : ""
          };
        });

        setAttendanceSheet(initialSheet);
      } catch (err: any) {
        addToast("Error fetching sheet", err.message, "error");
      } finally {
        setLoading(false);
      }
    }

    loadSheet();
  }, [selectedClassId, selectedDate, user]);

  const handleStatusChange = (childId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceSheet(prev => ({
      ...prev,
      [childId]: { ...prev[childId], status }
    }));
  };

  const handleNotesChange = (childId: string, notes: string) => {
    setAttendanceSheet(prev => ({
      ...prev,
      [childId]: { ...prev[childId], notes }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.keys(attendanceSheet).map(childId => ({
        childId,
        status: attendanceSheet[childId].status,
        notes: attendanceSheet[childId].notes
      }));

      await api.saveAttendance(selectedDate, selectedClassId, records);
      addToast(
        "Attendance Saved",
        `Successfully logged attendance for ${classrooms.find(c => c.id === selectedClassId)?.name} class!`,
        "success"
      );
    } catch (err: any) {
      addToast("Failed to save", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header and save action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Attendance Register</h1>
          <p className="text-slate-500 text-sm mt-1">Record and inspect daily attendance across classrooms and grade levels.</p>
        </div>
        {user.role !== "Parent" && (
          <button
            onClick={handleSave}
            disabled={saving || children.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md shadow-sm transition-all text-sm disabled:opacity-50 self-start sm:self-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Saving Registers..." : "Save Attendance"}</span>
          </button>
        )}
      </div>

      {/* Selectors card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Date</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="h-4 w-4" />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm font-semibold"
            />
          </div>
        </div>

        {user.role !== "Parent" && (
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Classroom</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Sheet view */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-200">
            {children.map(kid => {
              const current = attendanceSheet[kid.id] || { status: "Present", notes: "" };
              return (
                <div key={kid.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                  {/* Child Identity */}
                  <div className="flex items-center gap-3">
                    <img
                      src={kid.photo || getChildAvatar(kid.gender, kid.fullName)}
                      alt={kid.fullName}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                    />
                    <div>
                      <strong className="text-sm font-bold text-slate-800">{kid.fullName}</strong>
                      <p className="text-[10px] font-mono text-slate-400">ID: {kid.id}</p>
                    </div>
                  </div>

                  {/* Segmented Status Toggle Button Group */}
                  <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg self-start md:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={user.role === "Parent"}
                      onClick={() => handleStatusChange(kid.id, "Present")}
                      className={`flex items-center gap-1 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        current.status === "Present"
                          ? "bg-white text-emerald-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Present</span>
                    </button>
                    <button
                      type="button"
                      disabled={user.role === "Parent"}
                      onClick={() => handleStatusChange(kid.id, "Late")}
                      className={`flex items-center gap-1 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        current.status === "Late"
                          ? "bg-white text-amber-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Late</span>
                    </button>
                    <button
                      type="button"
                      disabled={user.role === "Parent"}
                      onClick={() => handleStatusChange(kid.id, "Absent")}
                      className={`flex items-center gap-1 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        current.status === "Absent"
                          ? "bg-white text-red-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Absent</span>
                    </button>
                  </div>

                  {/* Optional Notes or health details */}
                  <div className="flex-1 max-w-xs w-full">
                    <input
                      type="text"
                      placeholder="Note details, e.g. 'Fever', 'Late traffic'..."
                      value={current.notes || ""}
                      disabled={user.role === "Parent"}
                      onChange={(e) => handleNotesChange(kid.id, e.target.value)}
                      className="block w-full px-3 py-1.5 bg-slate-50/50 border border-slate-200/50 focus:border-blue-500 focus:bg-white rounded-md text-slate-700 placeholder-slate-400 focus:outline-none transition-all text-xs font-medium"
                    />
                  </div>
                </div>
              );
            })}

            {children.length === 0 && (
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
                <h3 className="font-display font-bold text-slate-700 text-sm">No Children Registered</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please add or enroll students into this classroom to manage schedules.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
