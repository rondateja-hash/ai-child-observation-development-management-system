import React, { useState, useEffect } from "react";
import { getUserAvatar, getChildAvatar } from "./types";
import { api } from "./services/api";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Users, BookOpen, Calendar, Lock, Settings, Bell, LogOut, Menu, X, AlertCircle, CheckCircle2, AlertTriangle, Info, Search, UserCheck } from "lucide-react";
// Views
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import ChildrenView from "./components/ChildrenView";
import ObservationsView from "./components/ObservationsView";
import AIHistoryView from "./components/AIHistoryView";
import AttendanceView from "./components/AttendanceView";
import UsersView from "./components/UsersView";
import SettingsView from "./components/SettingsView";
import ProfileSelectorView from "./components/ProfileSelectorView";
export default function App() {
    const [user, setUser] = useState(null);
    const [selectingProfile, setSelectingProfile] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [loading, setLoading] = useState(true);
    // Parent child-selection states
    const [childrenList, setChildrenList] = useState([]);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState(localStorage.getItem("fc_selected_child_id"));
    const [selectedChild, setSelectedChild] = useState(null);
    const [childSelectorOpen, setChildSelectorOpen] = useState(false);
    const [childSearchQuery, setChildSearchQuery] = useState("");
    // Child Profile Linking States
    const [linkChildName, setLinkChildName] = useState("");
    const [linkChildDob, setLinkChildDob] = useState("");
    const [linkLoading, setLinkLoading] = useState(false);
    const [showLinkSection, setShowLinkSection] = useState(false);
    // Sync state with detail view triggers
    const [selectedReportId, setSelectedReportId] = useState(null);
    // Notification states
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    // Add Toast Utility
    const addToast = React.useCallback((title, message, type = "success") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, title, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);
    useEffect(() => {
        async function initSession() {
            try {
                const currentUser = await api.getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    if ((currentUser.role === "Parent" && currentUser.email === "parent@firstcry.com") ||
                        (currentUser.role === "Teacher" && currentUser.email === "teacher@firstcry.com")) {
                        if (sessionStorage.getItem("fc_profile_selected") !== "true") {
                            setSelectingProfile(true);
                        }
                    }
                    // Load notification metrics
                    const nData = await api.getNotifications();
                    setNotifications(nData);
                }
            }
            catch (err) {
                // Safe to ignore if not logged in
            }
            finally {
                setLoading(false);
            }
        }
        initSession();
    }, []);
    // Sync children list and select child context
    useEffect(() => {
        if (user) {
            setLoadingChildren(true);
            api.getChildren().then((data) => {
                setChildrenList(data);
                if (selectedChildId) {
                    const found = data.find((c) => c.id === selectedChildId);
                    if (found) {
                        setSelectedChild(found);
                    }
                    else {
                        localStorage.removeItem("fc_selected_child_id");
                        setSelectedChildId(null);
                        setSelectedChild(null);
                    }
                }
                else if (user.role === "Parent" && data.length > 0) {
                    // If only 1 child exists for parent, auto-select it! Otherwise prompt selection
                    if (data.length === 1) {
                        handleSelectChild(data[0]);
                    }
                }
            }).catch(() => { })
                .finally(() => {
                setLoadingChildren(false);
            });
        }
        else {
            setChildrenList([]);
            setSelectedChild(null);
        }
    }, [user, selectedChildId]);
    const handleSelectChild = (child) => {
        localStorage.setItem("fc_selected_child_id", child.id);
        setSelectedChildId(child.id);
        setSelectedChild(child);
        setChildSelectorOpen(false);
        addToast("Student Selected", `Switched portal context to ${child.fullName}`, "success");
    };
    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser);
        if ((loggedInUser.role === "Parent" && loggedInUser.email === "parent@firstcry.com") ||
            (loggedInUser.role === "Teacher" && loggedInUser.email === "teacher@firstcry.com")) {
            setSelectingProfile(true);
        }
        else {
            setSelectingProfile(false);
        }
        setActiveTab("dashboard");
        // Fetch notifications
        api.getNotifications().then(setNotifications).catch(() => { });
    };
    const handleLogout = () => {
        api.logout();
        setUser(null);
        setSelectingProfile(false);
        sessionStorage.removeItem("fc_profile_selected");
        localStorage.removeItem("fc_selected_child_id");
        setSelectedChildId(null);
        setSelectedChild(null);
        addToast("Logged Out", "You have been logged out of the portal.", "info");
    };
    const markAllNotificationsRead = async () => {
        try {
            await api.markNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            addToast("Notifications Cleared", "All milestone alerts marked as read.", "success");
        }
        catch (err) {
            addToast("Failed to clear", err.message, "error");
        }
    };
    const handleClearAllNotifications = async () => {
        try {
            await api.clearNotifications();
            setNotifications([]);
            addToast("Notifications Cleared", "All notifications have been removed.", "success");
        }
        catch (err) {
            addToast("Failed to clear notifications", err.message, "error");
        }
    };
    const handleDeleteNotification = async (id) => {
        try {
            await api.deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            addToast("Notification Dismissed", "The notification was removed.", "info");
        }
        catch (err) {
            addToast("Failed to dismiss", err.message, "error");
        }
    };
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-sans text-sm font-semibold animate-pulse">
            Booting Child Observation Summary Portal...
          </p>
        </div>
      </div>);
    }
    if (!user) {
        return (<>
        <LoginView onLoginSuccess={handleLoginSuccess} addToast={addToast}/>
        {/* Render Toast Notifications Layer */}
        <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full no-print">
          <AnimatePresence>
            {toasts.map((toast) => (<motion.div key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg flex gap-3 items-start relative overflow-hidden font-sans">
                {/* Visual Accent bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${toast.type === "success"
                    ? "bg-emerald-500"
                    : toast.type === "error"
                        ? "bg-red-500"
                        : toast.type === "warning"
                            ? "bg-amber-500"
                            : "bg-blue-500"}`}/>

                <div className="shrink-0 mt-0.5">
                  {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500"/>}
                  {toast.type === "error" && <AlertCircle className="h-5 w-5 text-red-500"/>}
                  {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500"/>}
                  {toast.type === "info" && <Info className="h-5 w-5 text-blue-500"/>}
                </div>

                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-900">{toast.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
                </div>

                <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-3.5 w-3.5"/>
                </button>
              </motion.div>))}
          </AnimatePresence>
        </div>
      </>);
    }
    if (user && selectingProfile) {
        return (<>
        <ProfileSelectorView user={user} onProfileSwitched={(updatedUser) => {
                setUser(updatedUser);
                setSelectingProfile(false);
                const freshChildId = localStorage.getItem("fc_selected_child_id");
                if (freshChildId) {
                    setSelectedChildId(freshChildId);
                }
            }} onCancel={() => {
                if (user.email === "parent@firstcry.com" || user.email === "teacher@firstcry.com") {
                    handleLogout();
                }
                else {
                    setSelectingProfile(false);
                }
            }} addToast={addToast}/>
        {/* Render Toast Notifications Layer */}
        <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full no-print">
          <AnimatePresence>
            {toasts.map((toast) => (<motion.div key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg flex gap-3 items-start relative overflow-hidden font-sans">
                {/* Visual Accent bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${toast.type === "success"
                    ? "bg-emerald-500"
                    : toast.type === "error"
                        ? "bg-red-500"
                        : toast.type === "warning"
                            ? "bg-amber-500"
                            : "bg-blue-500"}`}/>
                <div className="flex-1 min-w-0 ml-1.5">
                  <h4 className="text-xs font-bold text-slate-900">{toast.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
                </div>
                <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-3.5 w-3.5"/>
                </button>
              </motion.div>))}
          </AnimatePresence>
        </div>
      </>);
    }
    // Sidebar Menu Entries with Role Restriction Rules
    const MENU_ENTRIES = [
        { id: "dashboard", label: "Dashboard", icon: Sparkles, roles: ["Super Admin", "Centre Head", "Centre Admin", "Teacher", "Counsellor", "Parent"] },
        { id: "children", label: "Students", icon: Users, roles: ["Super Admin", "Centre Head", "Centre Admin", "Teacher", "Counsellor"] },
        { id: "observations", label: "Observations", icon: BookOpen, roles: ["Super Admin", "Centre Head", "Centre Admin", "Teacher", "Counsellor", "Parent"] },
        { id: "reports", label: "AI Reports", icon: Sparkles, roles: ["Super Admin", "Centre Head", "Centre Admin", "Teacher", "Counsellor", "Parent"] },
        { id: "attendance", label: "Attendance", icon: Calendar, roles: ["Super Admin", "Centre Head", "Centre Admin", "Teacher", "Parent"] },
        { id: "users", label: "Staff Directory", icon: Lock, roles: ["Super Admin", "Centre Head", "Centre Admin"] },
        { id: "settings", label: "Configurations", icon: Settings, roles: ["Super Admin", "Centre Head"] }
    ];
    const allowedEntries = MENU_ENTRIES.filter((entry) => entry.roles.includes(user.role));
    const unreadCount = notifications.filter((n) => !n.read).length;
    return (<div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      {/* 1. Left Sidebar Navigation Panel (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 h-screen sticky top-0 no-print">
        <div className="p-6 flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
            <Sparkles className="h-4 w-4"/>
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 truncate">Observation Summary</span>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Main Menu</div>
          {allowedEntries.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (<button key={item.id} onClick={() => {
                    setActiveTab(item.id);
                    setSelectedReportId(null); // Clear active report drilldown
                }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                <Icon className={`h-5 w-5 ${isActive ? "text-slate-900" : "text-slate-400"}`}/>
                <span>{item.label}</span>
              </button>);
        })}
        </nav>

        {/* User Session card */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2">
            <img src={user.avatar || getUserAvatar(user.gender, user.name, user.role)} alt={user.name} referrerPolicy="no-referrer" className="h-10 w-10 object-cover rounded-md bg-slate-200 border border-slate-200 shadow-sm"/>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role}</div>
            </div>
          </div>
          {(user.role === "Parent" || user.role === "Teacher") && (<button onClick={() => setSelectingProfile(true)} className="w-full mt-3 py-1.5 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-blue-600 font-semibold rounded-md text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5">
              <UserCheck className="h-3 w-3"/>
              Switch Profile
            </button>)}
          <button onClick={handleLogout} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold border border-slate-200 rounded-md text-xs transition-colors cursor-pointer">
            <LogOut className="h-4 w-4"/>
            <span>Sign Out Portal</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500">
              <Menu className="h-6 w-6"/>
            </button>
            <span className="font-display font-bold text-slate-900 tracking-tight text-sm">
              AI Child Observation Summary
            </span>
          </div>

          <div className="hidden lg:block">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
              Internal Portal Workspace
            </span>
          </div>

          {/* Active Student Selector for Parent Portal */}
          {user && user.role === "Parent" && (<div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm text-xs select-none mx-2 truncate">
              <span className="font-semibold text-slate-500 hidden sm:inline">Active Student:</span>
              <span className="font-bold text-blue-950 bg-white px-2 py-0.5 rounded border border-blue-200 truncate max-w-[120px]" title={selectedChild ? selectedChild.fullName : "None"}>
                {selectedChild ? selectedChild.fullName : "None Selected"}
              </span>
              <button onClick={() => setChildSelectorOpen(true)} className="text-[10px] font-bold text-blue-600 hover:underline hover:text-blue-800 transition-colors ml-1 border-l border-blue-200 pl-2 cursor-pointer whitespace-nowrap">
                Switch
              </button>
            </div>)}

          <div className="flex items-center gap-4 relative">
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 relative transition-colors cursor-pointer">
                <Bell className="h-4.5 w-4.5"/>
                {unreadCount > 0 && (<span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-600 rounded-full animate-ping"></span>)}
              </button>

              {/* Notification drop-down */}
              <AnimatePresence>
                {notificationsOpen && (<>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden font-sans">
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Sphere Milestones Alerts</span>
                        <div className="flex items-center gap-2">
                          <button onClick={markAllNotificationsRead} className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">
                            Mark Read
                          </button>
                          <span className="text-slate-300 text-[10px] select-none">|</span>
                          <button onClick={handleClearAllNotifications} className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer">
                            Clear All
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-200 max-h-64 overflow-y-auto text-xs">
                        {notifications.map((notif) => (<div key={notif.id} className={`p-3.5 pr-8 flex gap-2.5 items-start transition-colors relative group ${!notif.read ? "bg-slate-50/50" : ""}`}>
                            <span className="text-blue-500 text-sm mt-0.5">🌟</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{notif.title}</p>
                              <p className="text-slate-500 mt-0.5 leading-relaxed break-words">{notif.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <button onClick={() => handleDeleteNotification(notif.id)} className="absolute top-3.5 right-2 h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors cursor-pointer" title="Delete notification">
                              <X className="h-3 w-3"/>
                            </button>
                          </div>))}
                        {notifications.length === 0 && (<div className="p-8 text-center text-slate-400 font-medium">
                            No recent milestone alerts.
                          </div>)}
                      </div>
                    </motion.div>
                  </>)}
              </AnimatePresence>
            </div>

            {/* Profile widget (Desktop) */}
            <div onClick={() => {
            if (user.role === "Parent" || user.role === "Teacher") {
                setSelectingProfile(true);
            }
        }} className="hidden sm:flex items-center gap-2 bg-white hover:bg-slate-50 p-1 pr-3 rounded-md border border-slate-200 shadow-sm transition-colors cursor-pointer select-none">
              <img src={user.avatar || getUserAvatar(user.gender, user.name, user.role)} alt={user.name} referrerPolicy="no-referrer" className="h-6 w-6 object-cover rounded border border-slate-100"/>
              <span className="text-xs font-bold text-slate-700">{user.name}</span>
            </div>
          </div>
        </header>

        {/* Primary Views container */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: "easeOut" }}>
              {activeTab === "dashboard" && (<div key={`dashboard-${selectedChildId || ""}`}>
                  <DashboardView user={user} addToast={addToast} setActiveTab={setActiveTab}/>
                </div>)}
              {activeTab === "children" && (<div key={`children-${selectedChildId || ""}`}>
                  <ChildrenView user={user} addToast={addToast}/>
                </div>)}
              {activeTab === "observations" && (<div key={`observations-${selectedChildId || ""}`}>
                  <ObservationsView user={user} addToast={addToast} setActiveTab={setActiveTab} setSelectedObservationId={setSelectedReportId}/>
                </div>)}
              {activeTab === "reports" && (<div key={`reports-${selectedChildId || ""}`}>
                  <AIHistoryView user={user} addToast={addToast} selectedReportId={selectedReportId} setSelectedReportId={setSelectedReportId}/>
                </div>)}
              {activeTab === "attendance" && (<div key={`attendance-${selectedChildId || ""}`}>
                  <AttendanceView user={user} addToast={addToast}/>
                </div>)}
              {activeTab === "users" && (<div key="users">
                  <UsersView user={user} addToast={addToast}/>
                </div>)}
              {activeTab === "settings" && (<div key="settings">
                  <SettingsView user={user} addToast={addToast}/>
                </div>)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Mobile Navigation Menu Panel Drawer overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (<>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black z-40 lg:hidden"></motion.div>
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col p-6 overflow-y-auto shadow-2xl lg:hidden border-r border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-blue-600"/>
                  <span className="font-display font-bold text-slate-900 tracking-tight text-sm">
                    Observation Summary
                  </span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="h-5 w-5"/>
                </button>
              </div>

              {/* Sidebar Links */}
              <nav className="flex-1 py-6 space-y-1">
                {allowedEntries.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (<button key={item.id} onClick={() => {
                        setActiveTab(item.id);
                        setSelectedReportId(null);
                        setMobileMenuOpen(false);
                    }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all ${isActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:bg-slate-50"}`}>
                      <Icon className="h-5 w-5"/>
                      <span>{item.label}</span>
                    </button>);
            })}
              </nav>

              {/* User logout section */}
              <div className="border-t border-slate-200 pt-5 space-y-3.5">
                <div className="flex items-center gap-3 p-1.5">
                  <img src={user.avatar || getUserAvatar(user.gender, user.name, user.role)} alt={user.name} referrerPolicy="no-referrer" className="h-10 w-10 object-cover rounded-md border border-slate-200"/>
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block truncate">{user.name}</strong>
                    <span className="text-[10px] font-semibold text-blue-600 block mt-0.5 uppercase">
                      {user.role}
                    </span>
                  </div>
                </div>

                {(user.role === "Parent" || user.role === "Teacher") && (<button onClick={() => {
                    setMobileMenuOpen(false);
                    setSelectingProfile(true);
                }} className="w-full py-2 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-blue-600 font-semibold rounded-md text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5">
                    <UserCheck className="h-3 w-3"/>
                    Switch Profile
                  </button>)}

                <button onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
            }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-md text-xs transition-colors cursor-pointer">
                  <LogOut className="h-4 w-4"/>
                  <span>Sign Out Portal</span>
                </button>
              </div>
            </motion.aside>
          </>)}
      </AnimatePresence>

      {/* 4. Parent Student Selection Portal */}
      <AnimatePresence>
        {user && user.role === "Parent" && (!selectedChildId || childSelectorOpen) && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans flex items-center gap-2">
                    <span className="text-blue-600">👶</span> Select Student Profile
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a student profile below to load their milestone logs, reports, and attendance records.
                  </p>
                </div>
                {/* Only allow closing if they already have an active selection */}
                {selectedChildId && (<button onClick={() => setChildSelectorOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" title="Close">
                    <X className="h-5 w-5"/>
                  </button>)}
              </div>

              {/* Search bar */}
              <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                  <input type="text" placeholder="Search student by name, classroom, or guardian..." value={childSearchQuery} onChange={(e) => setChildSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700"/>
                </div>
                {childSearchQuery && (<button onClick={() => setChildSearchQuery("")} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition-all">
                    Clear
                  </button>)}
              </div>

              {/* Grid content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {loadingChildren ? (<div className="text-center py-12">
                    <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm font-semibold">Loading your registered children...</p>
                  </div>) : childrenList.length === 0 ? (<div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-4xl mb-3">🔗</div>
                    <h3 className="text-base font-bold text-slate-800">Link Enrolled Student Profile</h3>
                    <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                      Teachers enroll children in the FirstCry system. To access your child's logs, please enter their exact full name and date of birth to securely link their profile to your account.
                    </p>

                    <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!linkChildName || !linkChildDob)
                        return;
                    setLinkLoading(true);
                    try {
                        const res = await api.linkChild(linkChildName, linkChildDob);
                        addToast("Profile Linked Successfully!", res.message, "success");
                        // Refresh children list
                        const freshChildren = await api.getChildren();
                        setChildrenList(freshChildren);
                        if (freshChildren.length > 0) {
                            // Find the newly linked child and select it!
                            const linked = freshChildren.find(c => c.fullName.toLowerCase() === linkChildName.toLowerCase().trim());
                            if (linked) {
                                handleSelectChild(linked);
                            }
                            else {
                                handleSelectChild(freshChildren[0]);
                            }
                        }
                        setLinkChildName("");
                        setLinkChildDob("");
                    }
                    catch (err) {
                        addToast("Matching Failed", err.message, "error");
                    }
                    finally {
                        setLinkLoading(false);
                    }
                }} className="space-y-4 text-left">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Student's Full Name *</label>
                        <input type="text" required value={linkChildName} onChange={(e) => setLinkChildName(e.target.value)} placeholder="e.g. Riya Sharma" className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 placeholder-slate-400"/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Student's Date of Birth *</label>
                        <input type="date" required value={linkChildDob} onChange={(e) => setLinkChildDob(e.target.value)} className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"/>
                      </div>
                      <button type="submit" disabled={linkLoading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 mt-2 cursor-pointer">
                        {linkLoading ? "Searching records..." : "Securely Link Profile"}
                      </button>
                    </form>
                  </div>) : (<>
                    {/* Render filtered children */}
                    {(() => {
                    const filtered = childrenList.filter((c) => {
                        const q = childSearchQuery.toLowerCase();
                        return (c.fullName.toLowerCase().includes(q) ||
                            (c.classroomName && c.classroomName.toLowerCase().includes(q)) ||
                            c.parentName.toLowerCase().includes(q));
                    });
                    return (<div className="space-y-6">
                          {filtered.length === 0 ? (<div className="text-center py-12 bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                              <span className="text-3xl">🔍</span>
                              <h4 className="text-sm font-bold text-slate-800 mt-3">No student profiles found</h4>
                              <p className="text-xs text-slate-500 mt-1">
                                We couldn't find any students matching "{childSearchQuery}". Please refine your query.
                              </p>
                            </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {filtered.map((child) => {
                                const isCurrent = child.id === selectedChildId;
                                return (<div key={child.id} onClick={() => handleSelectChild(child)} className={`group relative bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer select-none flex flex-col justify-between ${isCurrent
                                        ? "border-blue-500 ring-2 ring-blue-500/20"
                                        : "border-slate-200 hover:border-slate-300"}`}>
                                    {isCurrent && (<span className="absolute top-3 right-3 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        Active Profile
                                      </span>)}
                                    
                                    <div className="flex items-start gap-3">
                                      <img src={child.photo || getChildAvatar(child.gender, child.fullName)} alt={child.fullName} referrerPolicy="no-referrer" className="h-14 w-14 object-cover rounded-xl border border-slate-100 shadow-sm"/>
                                      
                                      <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate text-sm">
                                          {child.fullName}
                                        </h3>
                                        <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1">
                                          {child.classroomName || "Intellitots Nursery"}
                                        </span>
                                        <div className="text-[11px] text-slate-400 mt-2 flex flex-col gap-0.5">
                                          <span>Age: <strong className="text-slate-600">{child.age} yrs</strong></span>
                                          <span>Gender: <strong className="text-slate-600">{child.gender}</strong></span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="border-t border-slate-100 mt-4 pt-3 text-[11px] text-slate-500 bg-slate-50/50 -mx-4 -mb-4 p-3 rounded-b-xl flex flex-col gap-0.5">
                                      <div className="flex justify-between">
                                        <span>Guardian:</span>
                                        <strong className="text-slate-700">{child.parentName}</strong>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Contact:</span>
                                        <strong className="text-slate-700">{child.parentPhone}</strong>
                                      </div>
                                    </div>
                                  </div>);
                            })}
                            </div>)}

                          {/* Link Another Student Drawer Toggle */}
                          <div className="border-t border-slate-200/60 pt-6">
                            {!showLinkSection ? (<div className="flex justify-center">
                                <button type="button" onClick={() => setShowLinkSection(true)} className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2">
                                  <span>🔗</span> Link Another Child's Profile
                                </button>
                              </div>) : (<div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center relative">
                                <button type="button" onClick={() => setShowLinkSection(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                                  <X className="h-4 w-4"/>
                                </button>
                                <h3 className="text-sm font-bold text-slate-800">Link Enrolled Student Profile</h3>
                                <p className="text-[11px] text-slate-500 mt-1 mb-4">
                                  Enter child details exactly as enrolled by the teacher to link another profile.
                                </p>
                                <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!linkChildName || !linkChildDob)
                                    return;
                                setLinkLoading(true);
                                try {
                                    const res = await api.linkChild(linkChildName, linkChildDob);
                                    addToast("Profile Linked Successfully!", res.message, "success");
                                    const freshChildren = await api.getChildren();
                                    setChildrenList(freshChildren);
                                    if (freshChildren.length > 0) {
                                        const linked = freshChildren.find(c => c.fullName.toLowerCase() === linkChildName.toLowerCase().trim());
                                        if (linked) {
                                            handleSelectChild(linked);
                                        }
                                    }
                                    setLinkChildName("");
                                    setLinkChildDob("");
                                    setShowLinkSection(false);
                                }
                                catch (err) {
                                    addToast("Matching Failed", err.message, "error");
                                }
                                finally {
                                    setLinkLoading(false);
                                }
                            }} className="space-y-3.5 text-left">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Student's Full Name *</label>
                                    <input type="text" required value={linkChildName} onChange={(e) => setLinkChildName(e.target.value)} placeholder="e.g. Aarav Patel" className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 placeholder-slate-400"/>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Student's Date of Birth *</label>
                                    <input type="date" required value={linkChildDob} onChange={(e) => setLinkChildDob(e.target.value)} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-750"/>
                                  </div>
                                  <button type="submit" disabled={linkLoading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all disabled:opacity-50 mt-1 cursor-pointer">
                                    {linkLoading ? "Searching records..." : "Securely Link Profile"}
                                  </button>
                                </form>
                              </div>)}
                          </div>
                        </div>);
                })()}
                  </>)}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Child Observation Portal</span>
                {selectedChildId ? (<button onClick={() => setChildSelectorOpen(false)} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-semibold cursor-pointer">
                    Cancel
                  </button>) : (<div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-amber-500 rounded-full animate-ping"></span>
                    <span className="text-amber-600 font-semibold">Please select a student to start</span>
                  </div>)}
              </div>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>

      {/* Render Toast Notifications Layer */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full no-print">
        <AnimatePresence>
          {toasts.map((toast) => (<motion.div key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg flex gap-3 items-start relative overflow-hidden font-sans">
              {/* Visual Accent bar */}
              <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${toast.type === "success"
                ? "bg-emerald-500"
                : toast.type === "error"
                    ? "bg-red-500"
                    : toast.type === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"}`}/>

              <div className="shrink-0 mt-0.5">
                {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500"/>}
                {toast.type === "error" && <AlertCircle className="h-5 w-5 text-red-500"/>}
                {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500"/>}
                {toast.type === "info" && <Info className="h-5 w-5 text-blue-500"/>}
              </div>

              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-900">{toast.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>

              <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-3.5 w-3.5"/>
              </button>
            </motion.div>))}
        </AnimatePresence>
      </div>
    </div>);
}
