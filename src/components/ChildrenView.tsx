import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Child, Classroom, User, getChildAvatar } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Filter, Edit, Trash2, X, FileText, Heart, AlertTriangle, Shield, CheckCircle } from "lucide-react";

interface ChildrenViewProps {
  user: User;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function ChildrenView({ user, addToast }: ChildrenViewProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  // Detail & Form States
  const [viewingChild, setViewingChild] = useState<Child | null>(null);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    gender: "Male" as "Male" | "Female" | "Other",
    bloodGroup: "O+",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    address: "",
    medicalNotes: "",
    allergies: "",
    emergencyContact: "",
    classroomId: ""
  });

  const loadData = async () => {
    try {
      const childrenData = await api.getChildren();
      setChildren(childrenData);
      const stats = await api.getDashboardStats();
      setClassrooms(stats.classrooms || []);
    } catch (err: any) {
      addToast("Failed to fetch students data", err.message || "Error connecting to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    const defaultClassroomId = (user.role === "Teacher" && user.classroomId)
      ? user.classroomId
      : (classrooms[0]?.id || "");
    setFormData({
      fullName: "",
      dob: "",
      gender: "Male",
      bloodGroup: "O+",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      address: "",
      medicalNotes: "",
      allergies: "",
      emergencyContact: "",
      classroomId: defaultClassroomId
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingChild(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (child: Child, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChild(child);
    setFormData({
      fullName: child.fullName,
      dob: child.dob,
      gender: child.gender,
      bloodGroup: child.bloodGroup,
      parentName: child.parentName,
      parentPhone: child.parentPhone,
      parentEmail: child.parentEmail || "",
      address: child.address,
      medicalNotes: child.medicalNotes || "",
      allergies: child.allergies || "",
      emergencyContact: child.emergencyContact,
      classroomId: child.classroomId
    });
    setIsAddOpen(true);
  };

  const handleDeleteChild = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you absolutely sure you want to withdraw this child profile and wipe all attendance/observation metrics? This cannot be undone.")) {
      try {
        await api.deleteChild(id);
        addToast("Withdrawal Confirmed", "Successfully withdrew student record permanently.", "success");
        if (viewingChild?.id === id) setViewingChild(null);
        loadData();
      } catch (err: any) {
        addToast("Withdrawal Failed", err.message, "error");
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.dob || !formData.parentName || !formData.parentPhone) {
      addToast("Validation Error", "Please fill out all required fields.", "warning");
      return;
    }

    try {
      if (editingChild) {
        await api.updateChild(editingChild.id, formData);
        addToast("Profile Updated", "Successfully saved child details changes.", "success");
      } else {
        await api.createChild(formData);
        addToast("Enrolled Successfully", "New student record generated in classroom log.", "success");
      }
      setIsAddOpen(false);
      loadData();
    } catch (err: any) {
      addToast("Save Failed", err.message, "error");
    }
  };

  // Filter Logic
  const filteredChildren = children.filter(child => {
    const matchesSearch = child.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.id.includes(searchQuery);
    
    const matchesClass = selectedClass === "all" || child.classroomId === selectedClass;
    const matchesGender = selectedGender === "all" || child.gender === selectedGender;

    return matchesSearch && matchesClass && matchesGender;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Student Profiles</h1>
          <p className="text-slate-500 text-sm mt-1">Manage enrollments, guardian details, health forms, and classroom registries.</p>
        </div>
        {user.role !== "Parent" && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md shadow-sm transition-all text-sm self-start sm:self-auto"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Enroll Child</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Search by full name, parent name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            <span>Classroom:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">All Grades</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            <span>Gender:</span>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Children Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChildren.map(child => (
            <motion.div
              key={child.id}
              layout
              whileHover={{ y: -4 }}
              onClick={() => setViewingChild(child)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col cursor-pointer group hover:border-blue-300 hover:shadow-md transition-all duration-300 relative"
            >
              <div className="p-5 flex gap-4 flex-1">
                <img
                  src={child.photo || getChildAvatar(child.gender, child.fullName)}
                  alt={child.fullName}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-lg object-cover shrink-0 border border-slate-100"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                    {child.classroomName}
                  </span>
                  <h3 className="font-display font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {child.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Age: {child.age} | Blood: {child.bloodGroup}</p>
                  <p className="text-xs text-slate-400 font-medium">Parent: {child.parentName}</p>
                </div>
              </div>

              {/* Badges and Allergies alert */}
              {child.allergies && child.allergies !== "None" && (
                <div className="px-5 py-2 bg-amber-50 border-t border-b border-amber-100 text-[10px] font-semibold text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="truncate">Allergies: {child.allergies}</span>
                </div>
              )}

              {/* Action Area */}
              {user.role !== "Parent" && (
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">ID: {child.id}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleOpenEdit(child, e)}
                      className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 rounded-lg hover:border-blue-200 transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {user.role === "Super Admin" && (
                      <button
                        onClick={(e) => handleDeleteChild(child.id, e)}
                        className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 rounded-lg hover:border-red-200 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {filteredChildren.length === 0 && (
            <div className="col-span-full py-16 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-300 text-5xl mb-4">👶</span>
              <h3 className="font-display font-bold text-slate-700 text-base">No Student Profiles Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">No child matches your active filters. Clear searches or enroll a child into the program.</p>
            </div>
          )}
        </div>
      )}

      {/* Child Sliding Detail Drawer from Right */}
      <AnimatePresence>
        {viewingChild && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingChild(null)}
              className="fixed inset-0 bg-black z-40"
            ></motion.div>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-slate-200 z-50 shadow-2xl p-6 overflow-y-auto flex flex-col space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h2 className="font-display font-bold text-lg text-slate-900">Student Profile Summary</h2>
                <button
                  onClick={() => setViewingChild(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile card details */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <img
                  src={viewingChild.photo || getChildAvatar(viewingChild.gender, viewingChild.fullName)}
                  alt={viewingChild.fullName}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 object-cover rounded-lg border border-white shadow-sm"
                />
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">{viewingChild.fullName}</h3>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {viewingChild.classroomName}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Milestone Tracker Active</p>
                </div>
              </div>

              {/* Core Attributes */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone Registration details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Date of Birth</span>
                    <span className="text-slate-800 font-semibold">{new Date(viewingChild.dob).toLocaleDateString()}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Blood Group</span>
                    <span className="text-slate-800 font-semibold">{viewingChild.bloodGroup}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Instructor</span>
                    <span className="text-slate-800 font-semibold">{viewingChild.teacherName}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Unique System ID</span>
                    <span className="text-slate-800 font-mono font-semibold">{viewingChild.id}</span>
                  </div>
                </div>
              </div>

              {/* Parent & Emergency Contacts */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guardian & Emergencies</h4>
                <div className="p-4 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <p className="flex justify-between"><span className="text-slate-400">Parent/Guardian:</span> <span className="font-semibold text-slate-800">{viewingChild.parentName}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Primary Phone:</span> <span className="font-semibold text-slate-800">{viewingChild.parentPhone}</span></p>
                  {viewingChild.parentEmail && (
                    <p className="flex justify-between"><span className="text-slate-400">Guardian Email:</span> <span className="font-semibold text-slate-800">{viewingChild.parentEmail}</span></p>
                  )}
                  <p className="flex justify-between"><span className="text-slate-400">Emergency Line:</span> <span className="font-semibold text-red-600">{viewingChild.emergencyContact}</span></p>
                  <p className="flex flex-col gap-1 pt-1 border-t border-slate-100">
                    <span className="text-slate-400">Address Profile:</span>
                    <span className="font-medium text-slate-700">{viewingChild.address}</span>
                  </p>
                </div>
              </div>

              {/* Health and allergy information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical & Allergens File</h4>
                <div className="p-4 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex gap-2 items-start">
                    <Heart className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Allergies:</span>
                      <p className="text-slate-600 mt-1">{viewingChild.allergies || "No active allergens listed."}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start pt-2 border-t border-slate-100">
                    <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Special Medical Directives:</span>
                      <p className="text-slate-600 mt-1">{viewingChild.medicalNotes || "No clinical observations registered."}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={(e) => handleOpenEdit(viewingChild, e)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 text-xs transition-colors"
                >
                  Edit Profile File
                </button>
                <button
                  onClick={() => setViewingChild(null)}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 text-xs transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Enroll/Edit Child Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="fixed inset-0 bg-black"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden z-10 border border-slate-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="font-display font-bold text-xl text-slate-900">
                  {editingChild ? "Edit Student Details" : "Enroll New Student"}
                </h2>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Student Attributes */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">
                      Student Details
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        placeholder="e.g. Aarav Patel"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth *</label>
                        <input
                          type="date"
                          required
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Blood Group</label>
                        <input
                          type="text"
                          value={formData.bloodGroup}
                          onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                          className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                          placeholder="e.g. A+"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Gender *</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                          className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Class *</label>
                        <select
                          value={formData.classroomId}
                          onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                          className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        >
                          {classrooms.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Guardian details */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">
                      Guardian & Emergencies
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Primary Guardian Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        placeholder="e.g. Karan Patel"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Guardian Phone *</label>
                        <input
                          type="tel"
                          required
                          value={formData.parentPhone}
                          onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                          className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                          placeholder="e.g. +91 98123 45678"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Guardian Email (Optional)</label>
                        <input
                          type="email"
                          value={formData.parentEmail}
                          onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                          className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                          placeholder="e.g. karan.patel@gmail.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Emergency Contact Info</label>
                      <input
                        type="text"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        placeholder="e.g. Meera Patel (Mother) - +91 98123 45679"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">
                    Health & Logistics Notes
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Allergies (Peanuts, Gluten etc)</label>
                      <input
                        type="text"
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        placeholder="e.g. Eggs, Peanuts"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Clinical/Medical notes</label>
                      <input
                        type="text"
                        value={formData.medicalNotes}
                        onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                        className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm"
                        placeholder="e.g. Mild asthma, lactose sensitive"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Postal Address *</label>
                    <textarea
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm resize-none"
                      placeholder="Street name, Villa/Apartment Number, Sector, City..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    {editingChild ? "Save Changes" : "Confirm Enrollment"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
