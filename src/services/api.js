const API_BASE = "/api";
// Get token from localStorage
export function getAuthToken() {
    return localStorage.getItem("fc_token");
}
export function setAuthToken(token) {
    localStorage.setItem("fc_token", token);
}
export function clearAuthToken() {
    localStorage.removeItem("fc_token");
}
// Custom Fetch Wrapper with Token Auth
async function fetchAPI(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    const selectedChildId = localStorage.getItem("fc_selected_child_id");
    if (selectedChildId) {
        headers.set("X-Selected-Child-Id", selectedChildId);
    }
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });
    if (!response.ok) {
        let errMsg = "Something went wrong";
        try {
            const data = await response.json();
            errMsg = data.error || errMsg;
        }
        catch (e) {
            // Failed to parse json
        }
        throw new Error(errMsg);
    }
    return response.json();
}
export const api = {
    // Auth
    login: async (email, password) => {
        const data = await fetchAPI("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        setAuthToken(data.token);
        return data;
    },
    register: async (userData) => {
        const data = await fetchAPI("/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: userData.name,
                email: userData.email,
                password: userData.passwordHash,
                phone: userData.phone,
                gender: userData.gender,
                role: userData.role,
                classroomId: userData.classroomId
            }),
        });
        if (data.token) {
            setAuthToken(data.token);
        }
        return data;
    },
    linkChild: async (childName, dob) => {
        return fetchAPI("/children/link", {
            method: "POST",
            body: JSON.stringify({ childName, dob }),
        });
    },
    getMe: async () => {
        return fetchAPI("/auth/me");
    },
    getCurrentUser: async () => {
        try {
            const data = await fetchAPI("/auth/me");
            return data.user;
        }
        catch (e) {
            return null;
        }
    },
    getProfiles: async () => {
        return fetchAPI("/auth/profiles");
    },
    switchProfile: async (role, profileId) => {
        const data = await fetchAPI("/auth/switch-profile", {
            method: "POST",
            body: JSON.stringify({ role, profileId })
        });
        if (data.token) {
            setAuthToken(data.token);
        }
        return data;
    },
    logout: async () => {
        try {
            await fetchAPI("/auth/logout", { method: "POST" });
        }
        catch (e) {
            // Ignore failures on logout
        }
        clearAuthToken();
    },
    // Notifications
    getNotifications: async () => {
        try {
            return await fetchAPI("/notifications");
        }
        catch (e) {
            return [];
        }
    },
    markNotificationsRead: async () => {
        return fetchAPI("/notifications/read", { method: "POST" });
    },
    clearNotifications: async () => {
        return fetchAPI("/notifications/clear", { method: "POST" });
    },
    deleteNotification: async (id) => {
        return fetchAPI(`/notifications/${id}`, { method: "DELETE" });
    },
    // Children
    getChildren: async () => {
        return fetchAPI("/children");
    },
    createChild: async (child) => {
        return fetchAPI("/children", {
            method: "POST",
            body: JSON.stringify(child),
        });
    },
    updateChild: async (id, child) => {
        return fetchAPI(`/children/${id}`, {
            method: "PUT",
            body: JSON.stringify(child),
        });
    },
    deleteChild: async (id) => {
        return fetchAPI(`/children/${id}`, {
            method: "DELETE",
        });
    },
    // Observations
    getObservations: async () => {
        return fetchAPI("/observations");
    },
    createObservation: async (obs) => {
        return fetchAPI("/observations", {
            method: "POST",
            body: JSON.stringify(obs),
        });
    },
    updateObservation: async (id, obs) => {
        return fetchAPI(`/observations/${id}`, {
            method: "PUT",
            body: JSON.stringify(obs),
        });
    },
    deleteObservation: async (id) => {
        return fetchAPI(`/observations/${id}`, {
            method: "DELETE",
        });
    },
    // AI
    getAIReports: async () => {
        return fetchAPI("/ai/reports");
    },
    generateAIReport: async (observationId) => {
        return fetchAPI("/ai/generate", {
            method: "POST",
            body: JSON.stringify({ observationId }),
        });
    },
    deleteAIReport: async (id) => {
        return fetchAPI(`/ai/reports/${id}`, {
            method: "DELETE",
        });
    },
    // Attendance
    getAttendance: async (date, classroomId) => {
        const url = classroomId ? `/attendance?date=${date}&classroomId=${classroomId}` : `/attendance?date=${date}`;
        return fetchAPI(url);
    },
    saveAttendance: async (date, classroomId, records) => {
        return fetchAPI("/attendance", {
            method: "POST",
            body: JSON.stringify({ date, classroomId, records }),
        });
    },
    // Dashboard
    getDashboardStats: async () => {
        return fetchAPI("/dashboard/stats");
    },
    // Settings
    getSettings: async () => {
        return fetchAPI("/settings");
    },
    updateSettings: async (settings) => {
        return fetchAPI("/settings", {
            method: "PUT",
            body: JSON.stringify(settings),
        });
    },
    // Users Management
    getUsers: async () => {
        return fetchAPI("/users");
    },
    createUser: async (user) => {
        return fetchAPI("/users", {
            method: "POST",
            body: JSON.stringify(user),
        });
    },
    updateUser: async (id, user) => {
        return fetchAPI(`/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(user),
        });
    },
    deleteUser: async (id) => {
        return fetchAPI(`/users/${id}`, {
            method: "DELETE",
        });
    }
};
