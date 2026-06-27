import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { getChildAvatar, getUserAvatar } from "../types";
import { motion } from "motion/react";
import { Sparkles, ShieldAlert, ArrowRight, Loader2, Users, Baby } from "lucide-react";
export default function ProfileSelectorView({ user, onProfileSwitched, onCancel, addToast }) {
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(null);
    const [error, setError] = useState("");
    const [teachers, setTeachers] = useState([]);
    const [parents, setParents] = useState([]);
    const [children, setChildren] = useState([]);
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                // Load teacher/parent presets
                const profileData = await api.getProfiles();
                setTeachers(profileData.teachers || []);
                setParents(profileData.parents || []);
                // Load children list for parent selection
                if (user.role === "Parent") {
                    const childrenData = await api.getChildren();
                    setChildren(childrenData || []);
                }
            }
            catch (err) {
                setError("Failed to load records. Please try again.");
                addToast("Error Loading Data", err.message || "Failed to retrieve initial presets.", "error");
            }
            finally {
                setLoading(false);
            }
        }
        loadData();
    }, [addToast, user.role]);
    // For Teacher profile selection
    const handleSelectTeacher = async (profileId) => {
        try {
            setSwitching(profileId);
            setError("");
            const response = await api.switchProfile("Teacher", profileId);
            addToast("Profile Switched", `Acting as ${response.user.name} (${response.user.role})`, "success");
            sessionStorage.setItem("fc_profile_selected", "true");
            onProfileSwitched(response.user);
        }
        catch (err) {
            setError(err.message || "Failed to switch teacher profile.");
            addToast("Switch Failed", err.message || "Unable to switch profile.", "error");
        }
        finally {
            setSwitching(null);
        }
    };
    // For Child/Parent profile selection
    const handleSelectChild = async (child) => {
        try {
            setSwitching(child.id);
            setError("");
            // Find parent corresponding to this child's parentName
            const matchingParent = parents.find((p) => p.name.toLowerCase().trim() === child.parentName.toLowerCase().trim());
            if (!matchingParent) {
                throw new Error(`Parent profile for ${child.parentName} not found.`);
            }
            // Switch profile to that specific parent
            const response = await api.switchProfile("Parent", matchingParent.id);
            // Save selected child id
            localStorage.setItem("fc_selected_child_id", child.id);
            sessionStorage.setItem("fc_profile_selected", "true");
            addToast("Welcome", `Logged in as ${response.user.name}. Accessing reports for ${child.fullName}.`, "success");
            onProfileSwitched(response.user);
        }
        catch (err) {
            setError(err.message || "Failed to switch parent profile.");
            addToast("Switch Failed", err.message || "Unable to load student context.", "error");
        }
        finally {
            setSwitching(null);
        }
    };
    const getTeacherAvatar = (teacherName) => {
        if (teacherName.includes("Priya"))
            return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150";
        if (teacherName.includes("Sneha"))
            return "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150";
        return getUserAvatar("Female", teacherName);
    };
    return (<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-10 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-50 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>

        <div className="relative z-10 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2">
              {user.role === "Parent" ? <Baby className="h-6 w-6"/> : <Sparkles className="h-6 w-6"/>}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {user.role === "Parent" ? "Select Student Profile" : "Select Teacher Profile"}
            </h2>
            <p className="text-sm text-slate-500">
              {user.role === "Parent"
            ? "Please select your child to load their milestone logs, progress reports, and classroom attendance."
            : `You are signed in as a generic Teacher. Please select your specific teacher profile to access your classroom.`}
            </p>
          </div>

          {loading ? (<div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin"/>
              <p className="text-sm text-slate-500 font-medium animate-pulse">Loading profiles...</p>
            </div>) : error ? (<div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-red-50/50 rounded-2xl border border-red-100 p-6">
              <ShieldAlert className="h-10 w-10 text-red-500"/>
              <p className="text-sm font-semibold text-slate-800">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-2 text-xs font-bold text-blue-600 hover:underline">
                Reload profiles
              </button>
            </div>) : (<div className="space-y-6">
              {user.role === "Teacher" ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachers.map((t) => {
                    const isCurrentSwitched = switching === t.id;
                    return (<motion.div key={t.id} whileHover={{ scale: 1.01, y: -2 }} className="p-5 border border-slate-200 hover:border-blue-400 bg-white rounded-2xl transition-all shadow-sm hover:shadow-md flex items-start gap-4 cursor-pointer relative group" onClick={() => !switching && handleSelectTeacher(t.id)}>
                        <img src={getTeacherAvatar(t.name)} alt={t.name} className="h-14 w-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0" referrerPolicy="no-referrer"/>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Classroom: {t.classroomId === "cls-toddlers" ? "Toddlers" : "Nursery"}
                          </span>
                          <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors truncate">
                            {t.name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{t.email}</p>
                        </div>
                        <div className="self-center bg-slate-50 group-hover:bg-blue-600 group-hover:text-white p-2 rounded-xl transition-all">
                          {isCurrentSwitched ? (<Loader2 className="h-4 w-4 animate-spin text-blue-600 group-hover:text-white"/>) : (<ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white"/>)}
                        </div>
                      </motion.div>);
                })}
                </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {children.map((child) => {
                    const isCurrentSwitched = switching === child.id;
                    return (<motion.div key={child.id} whileHover={{ scale: 1.01, y: -2 }} className="p-5 border border-slate-200 hover:border-blue-500 bg-white rounded-2xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between gap-4 cursor-pointer relative group" onClick={() => !switching && handleSelectChild(child)}>
                        <div className="flex items-start gap-4">
                          <img src={child.photo || getChildAvatar(child.gender, child.fullName)} alt={child.fullName} className="h-14 w-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0" referrerPolicy="no-referrer"/>
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                              {child.classroomName || "Toddlers"}
                            </span>
                            <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors truncate">
                              {child.fullName}
                            </h3>
                            <div className="text-xs text-slate-400 flex gap-2">
                              <span>Age: <strong className="text-slate-600">{child.age} yrs</strong></span>
                              <span>•</span>
                              <span>Gender: <strong className="text-slate-600">{child.gender}</strong></span>
                            </div>
                          </div>
                          <div className="bg-slate-50 group-hover:bg-blue-600 group-hover:text-white p-2.5 rounded-xl transition-all self-start">
                            {isCurrentSwitched ? (<Loader2 className="h-4 w-4 animate-spin text-blue-600 group-hover:text-white"/>) : (<ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white"/>)}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                              Guardian
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              {child.parentName}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                            <Users className="h-3 w-3"/>
                            Active Link
                          </span>
                        </div>
                      </motion.div>);
                })}
                </div>)}

              {onCancel && (<div className="pt-4 flex justify-center">
                  <button onClick={onCancel} className="px-6 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                    Go Back
                  </button>
                </div>)}
            </div>)}
        </div>
      </div>
    </div>);
}
