import { User, Child, Observation, AIReport, Attendance, SystemSettings } from "../types";

const API_BASE = "/api";

// Get token from localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem("fc_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("fc_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("fc_token");
}

// Custom Fetch Wrapper with Token Auth
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    } catch (e) {
      // Failed to parse json
    }
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const data = await fetchAPI<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  register: async (parentData: { name: string; email: string; passwordHash: string; phone?: string; gender?: string }): Promise<{ success: boolean; message: string; user: User; token?: string }> => {
    const data = await fetchAPI<{ success: boolean; message: string; user: User; token?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: parentData.name,
        email: parentData.email,
        password: parentData.passwordHash, // Server endpoint expects "password"
        phone: parentData.phone,
        gender: parentData.gender
      }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },
  
  linkChild: async (childName: string, dob: string): Promise<{ success: boolean; message: string; child: Child }> => {
    return fetchAPI<{ success: boolean; message: string; child: Child }>("/children/link", {
      method: "POST",
      body: JSON.stringify({ childName, dob }),
    });
  },
  
  getMe: async (): Promise<{ user: User }> => {
    return fetchAPI<{ user: User }>("/auth/me");
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const data = await fetchAPI<{ user: User }>("/auth/me");
      return data.user;
    } catch (e) {
      return null;
    }
  },

  getProfiles: async (): Promise<{ teachers: any[]; parents: any[] }> => {
    return fetchAPI<{ teachers: any[]; parents: any[] }>("/auth/profiles");
  },

  switchProfile: async (role: "Teacher" | "Parent", profileId: string): Promise<{ success: boolean; message: string; user: User }> => {
    return fetchAPI<{ success: boolean; message: string; user: User }>("/auth/switch-profile", {
      method: "POST",
      body: JSON.stringify({ role, profileId })
    });
  },
  
  logout: async (): Promise<void> => {
    try {
      await fetchAPI("/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore failures on logout
    }
    clearAuthToken();
  },

  // Notifications
  getNotifications: async (): Promise<any[]> => {
    try {
      return await fetchAPI<any[]>("/notifications");
    } catch (e) {
      return [];
    }
  },

  markNotificationsRead: async (): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>("/notifications/read", { method: "POST" });
  },

  clearNotifications: async (): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>("/notifications/clear", { method: "POST" });
  },

  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" });
  },

  // Children
  getChildren: async (): Promise<Child[]> => {
    return fetchAPI<Child[]>("/children");
  },
  
  createChild: async (child: Omit<Child, "id" | "age" | "classroomName" | "teacherId" | "teacherName">): Promise<Child> => {
    return fetchAPI<Child>("/children", {
      method: "POST",
      body: JSON.stringify(child),
    });
  },
  
  updateChild: async (id: string, child: Partial<Child>): Promise<Child> => {
    return fetchAPI<Child>(`/children/${id}`, {
      method: "PUT",
      body: JSON.stringify(child),
    });
  },
  
  deleteChild: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(`/children/${id}`, {
      method: "DELETE",
    });
  },

  // Observations
  getObservations: async (): Promise<Observation[]> => {
    return fetchAPI<Observation[]>("/observations");
  },
  
  createObservation: async (obs: { childId: string; category: string; note: string; riskLevel: string }): Promise<Observation> => {
    return fetchAPI<Observation>("/observations", {
      method: "POST",
      body: JSON.stringify(obs),
    });
  },
  
  updateObservation: async (id: string, obs: Partial<Observation>): Promise<Observation> => {
    return fetchAPI<Observation>(`/observations/${id}`, {
      method: "PUT",
      body: JSON.stringify(obs),
    });
  },
  
  deleteObservation: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(`/observations/${id}`, {
      method: "DELETE",
    });
  },

  // AI
  getAIReports: async (): Promise<AIReport[]> => {
    return fetchAPI<AIReport[]>("/ai/reports");
  },
  
  generateAIReport: async (observationId: string): Promise<AIReport> => {
    return fetchAPI<AIReport>("/ai/generate", {
      method: "POST",
      body: JSON.stringify({ observationId }),
    });
  },
  
  deleteAIReport: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(`/ai/reports/${id}`, {
      method: "DELETE",
    });
  },

  // Attendance
  getAttendance: async (date: string, classroomId?: string): Promise<Attendance[]> => {
    const url = classroomId ? `/attendance?date=${date}&classroomId=${classroomId}` : `/attendance?date=${date}`;
    return fetchAPI<Attendance[]>(url);
  },
  
  saveAttendance: async (date: string, classroomId: string, records: Array<{ childId: string; status: 'Present' | 'Absent' | 'Late'; notes?: string }>): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>("/attendance", {
      method: "POST",
      body: JSON.stringify({ date, classroomId, records }),
    });
  },

  // Dashboard
  getDashboardStats: async (): Promise<any> => {
    return fetchAPI<any>("/dashboard/stats");
  },

  // Settings
  getSettings: async (): Promise<SystemSettings> => {
    return fetchAPI<SystemSettings>("/settings");
  },
  
  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    return fetchAPI<SystemSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  // Users Management
  getUsers: async (): Promise<User[]> => {
    return fetchAPI<User[]>("/users");
  },
  
  createUser: async (user: Omit<User, "id" | "active"> & { password?: string }): Promise<User> => {
    return fetchAPI<User>("/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },
  
  updateUser: async (id: string, user: Partial<User>): Promise<User> => {
    return fetchAPI<User>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    });
  },
  
  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(`/users/${id}`, {
      method: "DELETE",
    });
  }
};
