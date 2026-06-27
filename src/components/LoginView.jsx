import React, { useState } from "react";
import { api } from "../services/api";
import { motion } from "motion/react";
import { KeyRound, Mail, Sparkles, AlertCircle, User, Phone } from "lucide-react";

export default function LoginView({ onLoginSuccess, addToast }) {
    const [activeTab, setActiveTab] = useState("login");
    
    // Sign In States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    
    // Sign Up States
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regPhone, setRegPhone] = useState("");
    const [regGender, setRegGender] = useState("Female");
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please fill in all credentials");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = await api.login(email, password);
            addToast("Welcome Back!", `Successfully logged in as ${data.user.name} (${data.user.role})`, "success");
            onLoginSuccess(data.user);
        }
        catch (err) {
            setError(err.message || "Failed to log in. Please check credentials.");
            addToast("Login Failed", err.message || "Invalid credentials", "error");
        }
        finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!regName || !regEmail || !regPassword) {
            setError("Please fill in all required fields");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = await api.register({
                name: regName,
                email: regEmail,
                passwordHash: regPassword,
                phone: regPhone,
                gender: regGender
            });
            addToast("Account Created!", `Successfully registered and logged in as ${data.user.name}`, "success");
            onLoginSuccess(data.user);
        }
        catch (err) {
            setError(err.message || "Failed to register account.");
            addToast("Registration Failed", err.message || "Unable to create account.", "error");
        }
        finally {
            setLoading(false);
        }
    };

    const fillCredentials = (roleEmail, rolePass) => {
        setEmail(roleEmail);
        setPassword(rolePass);
        setActiveTab("login");
        setError("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden font-sans">
            {/* Background blobs */}
            <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-10 right-4 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6, ease: "easeOut" }} 
                className="max-w-md w-full space-y-6 bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-100 shadow-xl relative z-10"
            >
                <div className="text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4">
                        <Sparkles className="h-8 w-8"/>
                    </div>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        AI Child Observation Summary
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 font-sans">
                        AI Child Observation & Development Management System
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-slate-100 mb-6">
                    <button
                        type="button"
                        onClick={() => { setActiveTab("login"); setError(""); }}
                        className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                            activeTab === "login"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab("register"); setError(""); }}
                        className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                            activeTab === "register"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        Create Account
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100">
                        <AlertCircle className="h-5 w-5 shrink-0"/>
                        <span>{error}</span>
                    </div>
                )}

                {activeTab === "login" ? (
                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                    Login Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <Mail className="h-5 w-5"/>
                                    </div>
                                    <input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        autoComplete="username" 
                                        required 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-sans" 
                                        placeholder="name@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <KeyRound className="h-5 w-5"/>
                                    </div>
                                    <input 
                                        id="password" 
                                        name="password" 
                                        type="password" 
                                        autoComplete="current-password" 
                                        required 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-sans" 
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs sm:text-sm pt-2">
                            <div className="flex items-center">
                                <input 
                                    id="remember-me" 
                                    name="remember-me" 
                                    type="checkbox" 
                                    defaultChecked 
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-slate-600">
                                    Remember my login
                                </label>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => addToast("Support Requested", "Please contact Super Admin to reset password.", "info")} 
                                className="font-medium text-blue-600 hover:text-blue-500 transition-colors cursor-pointer"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-300 shadow-md shadow-blue-500/20 cursor-pointer"
                            >
                                {loading ? (<div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : ("Sign In to Dashboard")}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="space-y-4" onSubmit={handleRegister}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="reg-name" className="block text-sm font-medium text-slate-700 mb-1">
                                    Full Name *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <User className="h-5 w-5"/>
                                    </div>
                                    <input 
                                        id="reg-name" 
                                        type="text" 
                                        required 
                                        value={regName} 
                                        onChange={(e) => setRegName(e.target.value)} 
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-sans" 
                                        placeholder="e.g. Debashis Sen"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">
                                    Email Address *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <Mail className="h-5 w-5"/>
                                    </div>
                                    <input 
                                        id="reg-email" 
                                        type="email" 
                                        required 
                                        value={regEmail} 
                                        onChange={(e) => setRegEmail(e.target.value)} 
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-sans" 
                                        placeholder="e.g. debashis.sen@gmail.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1">
                                    Password *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <KeyRound className="h-5 w-5"/>
                                    </div>
                                    <input 
                                        id="reg-password" 
                                        type="password" 
                                        required 
                                        value={regPassword} 
                                        onChange={(e) => setRegPassword(e.target.value)} 
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-sans" 
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-600 mb-1">
                                        Contact Phone
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <Phone className="h-3.5 w-3.5"/>
                                        </div>
                                        <input 
                                            id="reg-phone" 
                                            type="tel" 
                                            value={regPhone} 
                                            onChange={(e) => setRegPhone(e.target.value)} 
                                            className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-sans" 
                                            placeholder="Contact phone"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="reg-gender" className="block text-xs font-semibold text-slate-600 mb-1">
                                        Gender
                                    </label>
                                    <select 
                                        id="reg-gender" 
                                        value={regGender} 
                                        onChange={(e) => setRegGender(e.target.value)} 
                                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-sans cursor-pointer"
                                    >
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-300 shadow-md shadow-blue-500/20 cursor-pointer"
                            >
                                {loading ? (<div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : ("Create Account & Enter Portal")}
                            </button>
                        </div>
                    </form>
                )}

                {/* Demo Roles Credentials Preset */}
                <div className="pt-6 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
                        Demo Portal Presets
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button onClick={() => fillCredentials("admin@firstcry.com", "admin123")} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow">
                            Super Admin
                        </button>
                        <button onClick={() => fillCredentials("teacher@firstcry.com", "admin123")} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow">
                            Teacher
                        </button>
                        <button onClick={() => fillCredentials("head@firstcry.com", "admin123")} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow">
                            Centre Head
                        </button>
                        <button onClick={() => fillCredentials("parent@firstcry.com", "admin123")} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow">
                            Parent
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
