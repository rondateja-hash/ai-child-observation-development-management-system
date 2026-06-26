export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Super Admin' | 'Centre Head' | 'Centre Admin' | 'Teacher' | 'Counsellor' | 'Parent';
  avatar?: string;
  phone?: string;
  classroomId?: string;
  active?: boolean;
  gender?: 'Male' | 'Female' | 'Other' | '';
}

export interface Child {
  id: string;
  fullName: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address: string;
  medicalNotes?: string;
  allergies?: string;
  emergencyContact: string;
  classroomId: string;
  classroomName: string;
  teacherId: string;
  teacherName: string;
  photo?: string;
}

export interface Observation {
  id: string;
  childId: string;
  childName: string;
  classroomName: string;
  category: 'Communication' | 'Physical' | 'Social' | 'Behaviour' | 'Learning' | 'Motor Skills' | 'Creativity' | 'Emotional' | 'Language' | 'Health';
  note: string;
  teacherId: string;
  teacherName: string;
  date: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Analyzed';
}

export interface AIReport {
  id: string;
  observationId: string;
  childId: string;
  childName: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  activities: string[];
  developmentNotes: {
    socialSkills: string;
    learningProgress: string;
    communicationSkills: string;
    emotionalBehaviour: string;
    confidenceLevel: string;
  };
  parentSuggestions: string[];
  teacherRecommendations: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  overallSummary: string;
  dateGenerated: string;
  generatedBy: string;
}

export interface Attendance {
  id: string;
  childId: string;
  childName: string;
  classroomId: string;
  classroomName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  notes?: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  gradeLevel: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  schoolName: string;
  logoUrl: string;
  theme: 'light' | 'dark';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  backupInterval: string;
}

export function getChildAvatar(gender?: 'Male' | 'Female' | 'Other' | string, name?: string): string {
  if (gender) {
    const g = gender.toLowerCase().trim();
    if (g === 'female' || g === 'girl') {
      return "https://images.unsplash.com/photo-1519689680058-324335c77ebe?w=150";
    }
  }
  if (name) {
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes("sree") ||
      lowerName.includes("priya") ||
      lowerName.includes("sneha") ||
      lowerName.includes("teja") ||
      lowerName.includes("kalavathi") ||
      lowerName.includes("ronda") ||
      lowerName.includes("sheela") ||
      lowerName.includes("anitha")
    ) {
      return "https://images.unsplash.com/photo-1519689680058-324335c77ebe?w=150";
    }
  }
  return "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=150";
}

export function getUserAvatar(gender?: 'Male' | 'Female' | 'Other' | string | '', name?: string, role?: string): string {
  if (gender) {
    const g = gender.toLowerCase().trim();
    if (g === 'female') {
      return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150";
    }
  }
  if (name) {
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes("priya") ||
      lowerName.includes("sneha") ||
      lowerName.includes("teja") ||
      lowerName.includes("kalavathi") ||
      lowerName.includes("ronda") ||
      lowerName.includes("priti") ||
      lowerName.includes("sheela") ||
      lowerName.includes("anitha")
    ) {
      return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150";
    }
  }
  return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
}
