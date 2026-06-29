import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Filter, Edit, Trash2, X, Mail, Phone, Lock, Sparkles, UserCheck } from "lucide-react";
const ROLES = ["Super Admin", "Centre Head", "Centre Admin", "Teacher", "Counsellor", "Parent"];
export default function UsersView({ user, addToast }) {
    const [users, setUsers] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    // Search/Filters states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState("all");
    const [activeDirectoryTab, setActiveDirectoryTab] = useState("staff");
    // Detail / Form States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "Teacher",
        phone: "",
        classroomId: "",
        active: true,
        gender: ""
    });
    const loadData = async () => {
        try {
            const usersData = await api.getUsers();
            setUsers(usersData);
            const stats = await api.getDashboardStats();
            setClassrooms(stats.classrooms || []);
        }
        catch (err) {
            addToast("Failed to fetch system users", err.message, "error");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, []);
    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            password: "",
            role: activeDirectoryTab === "parents" ? "Parent" : "Teacher",
            phone: "",
            classroomId: classrooms[0]?.id || "",
            active: true,
            gender: ""
        });
    };
    const handleOpenAdd = () => {
        resetForm();
        setEditingUser(null);
        setIsAddOpen(true);
    };
    const handleOpenEdit = (targetUser) => {
        setEditingUser(targetUser);
        setFormData({
            name: targetUser.name,
            email: targetUser.email,
            password: "", // Don't pre-populate password for safety
            role: targetUser.role,
            phone: targetUser.phone || "",
            classroomId: targetUser.classroomId || "",
            active: targetUser.active !== false,
            gender: targetUser.gender || ""
        });
        setIsAddOpen(true);
    };
    const handleDeleteUser = async (id) => {
        if (id === user.id) {
            addToast("Action Blocked", "You cannot delete your own active session user.", "warning");
            return;
        }
        if (window.confirm("Are you sure you want to deactivate and remove this staff/user from FirstCry records?")) {
            try {
                await api.deleteUser(id);
                addToast("Staff Record Cleared", "Successfully deleted staff profile.", "success");
                loadData();
            }
            catch (err) {
                addToast("Action Failed", err.message, "error");
            }
        }
    };
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            addToast("Validation Error", "Name and email are required fields.", "warning");
            return;
        }
        try {
            if (editingUser) {
                // Edit User API
                await api.updateUser(editingUser.id, formData);
                addToast("Staff Member Updated", "Successfully saved staff profile metadata.", "success");
            }
            else {
                // Create User API
                if (!formData.password) {
                    addToast("Validation Error", "Password is required for new accounts.", "warning");
                    return;
                }
                await api.createUser(formData);
                addToast("Staff Profile Created", "New account generated. Credentials dispatched.", "success");
            }
            setIsAddOpen(false);
            loadData();
        }
        catch (err) {
            addToast("Save Failed", err.message, "error");
        }
    };
    // Filter list
    const filteredUsers = users.filter(u => {
        const matchesTab = activeDirectoryTab === "parents" ? u.role === "Parent" : u.role !== "Parent";
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = selectedRole === "all" || u.role === selectedRole;
        return matchesTab && matchesSearch && matchesRole;
    });
    return (<div className="space-y-6 font-sans">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Staff & Users Directory</h1>
          <p className="text-slate-500 text-sm mt-1">Manage school instructors, registered parent guardians, and system permissions.</p>
        </div>
        {(user.role === "Super Admin" || user.role === "Centre Head" || user.role === "Centre Admin") && (<button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md shadow-sm transition-all text-sm self-start sm:self-auto">
            <Plus className="h-4.5 w-4.5"/>
            <span>{activeDirectoryTab === "parents" ? "Add Parent Profile" : "Add Staff Profile"}</span>
          </button>)}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => { setActiveDirectoryTab("staff"); setSelectedRole("all"); }} className={`px-5 py-2.5 border-b-2 text-sm font-semibold transition-all ${activeDirectoryTab === "staff" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          School Staff
        </button>
        <button onClick={() => { setActiveDirectoryTab("parents"); setSelectedRole("all"); }} className={`px-5 py-2.5 border-b-2 text-sm font-semibold transition-all ${activeDirectoryTab === "parents" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          Registered Parents
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-5 w-5"/>
          </div>
          <input type="text" placeholder={activeDirectoryTab === "parents" ? "Search parents by name or email address..." : "Search staff directory by name or email..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-sm"/>
        </div>

        {activeDirectoryTab === "staff" && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 w-full md:w-auto self-start sm:self-auto">
            <Filter className="h-3.5 w-3.5"/>
            <span>Role Filter:</span>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option value="all">All Roles</option>
              {ROLES.filter(r => r !== "Parent").map(r => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
        )}
      </div>

      {/* Directory Cards List */}
      {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (<div key={i} className="h-48 bg-slate-100 rounded-xl"></div>))}
        </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(u => (<div key={u.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="flex gap-4">
                <img src={(u.avatar === "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" && u.gender === "Female") ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" : (u.avatar || (u.gender === "Female" ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"))} alt={u.name} referrerPolicy="no-referrer" className="h-12 w-12 object-cover rounded-xl border border-slate-100"/>
                <div className="min-w-0 flex-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === "Super Admin" ? "bg-red-50 text-red-600 border border-red-100" :
                    u.role === "Centre Head" ? "bg-purple-50 text-purple-600 border border-purple-100" :
                        u.role === "Counsellor" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-blue-50 text-blue-600 border border-blue-100"}`}>
                    {u.role}
                  </span>
                  <h3 className="font-display font-bold text-slate-800 text-sm mt-1.5 truncate">{u.name}</h3>
                  
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 font-medium">
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
                      <span>{u.email}</span>
                    </p>
                    {u.phone && (<p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
                        <span>{u.phone}</span>
                      </p>)}
                    {u.gender && (<p className="flex items-center gap-1.5 text-slate-500">
                        <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Gender:</span>
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">{u.gender}</span>
                      </p>)}
                  </div>
                </div>
              </div>

              {/* Action and status footer */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-1">
                  <UserCheck className={`h-4 w-4 ${u.active !== false ? "text-emerald-500" : "text-slate-400"}`}/>
                  <span className={u.active !== false ? "text-emerald-600 font-bold" : "text-slate-500 font-bold"}>
                    {u.role === "Parent" ? (u.active !== false ? "Active Parent" : "Suspended") : (u.active !== false ? "Active Staff" : "Suspended")}
                  </span>
                </div>

                {(user.role === "Super Admin" || user.role === "Centre Head" || user.role === "Centre Admin") && (<div className="flex gap-1.5">
                    <button onClick={() => handleOpenEdit(u)} className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-md transition-colors">
                      <Edit className="h-4 w-4"/>
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-md transition-colors bg-white">
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  </div>)}
              </div>
            </div>))}

          {filteredUsers.length === 0 && (<div className="col-span-full py-16 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-300 text-5xl mb-4">👥</span>
              <h3 className="font-display font-bold text-slate-700 text-base">No Users Registered</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">No profiles found matching your active filter. Check email or role definitions.</p>
            </div>)}
        </div>)}

      {/* Add / Edit User Modal */}
      <AnimatePresence>
        {isAddOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setIsAddOpen(false)} className="fixed inset-0 bg-black"></motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden z-10 font-sans border border-slate-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="font-display font-bold text-xl text-slate-900">
                  {editingUser ? (activeDirectoryTab === "parents" ? "Edit Parent Profile" : "Edit Staff Member") : (activeDirectoryTab === "parents" ? "Create Parent Account" : "Create Staff Account")}
                </h2>
                <button onClick={() => setIsAddOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-5 w-5"/>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm" placeholder="e.g. Shalini Nair"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Professional Email *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm" placeholder="e.g. shalini@firstcry.com"/>
                </div>

                {/* Password field only shown/required for creation */}
                {!editingUser && (<div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password Credentials *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4"/>
                      </div>
                      <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="block w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm" placeholder="••••••••"/>
                    </div>
                  </div>)}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">System Role *</label>
                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm">
                      {activeDirectoryTab === "parents" ? (
                        <option value="Parent">Parent</option>
                      ) : (
                        ROLES.filter(r => r !== "Parent").map(r => (<option key={r} value={r}>{r}</option>))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm" placeholder="e.g. +91 98765 43212"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Classroom</label>
                    <select value={formData.classroomId} onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })} className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm">
                      <option value="">None / Administrative</option>
                      {classrooms.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm">
                      <option value="">Not Specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input id="user-active" type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="h-4.5 w-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"/>
                  <label htmlFor="user-active" className="text-xs font-semibold text-slate-600">
                    Active Account Status
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5"/>
                    <span>{editingUser ? "Save Changes" : "Create Account"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>)}
      </AnimatePresence>
    </div>);
}
