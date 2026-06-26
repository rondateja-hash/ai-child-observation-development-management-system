import fs from 'fs';
import path from 'path';

// Define DB Interfaces
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'Super Admin' | 'Centre Head' | 'Centre Admin' | 'Teacher' | 'Counsellor' | 'Parent';
  avatar?: string;
  phone?: string;
  classroomId?: string;
  active: boolean;
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

export interface Parent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  relationship: 'Father' | 'Mother' | 'Guardian';
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
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Late';
  notes?: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  gradeLevel: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAgeMonths: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isRead: boolean;
  timestamp: string;
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

interface DBData {
  users: User[];
  children: Child[];
  parents: Parent[];
  observations: Observation[];
  aiReports: AIReport[];
  attendance: Attendance[];
  classrooms: Classroom[];
  milestones: Milestone[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  settings: SystemSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export class Database {
  private data: DBData;

  constructor() {
    this.data = this.getInitialData();
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } catch (e) {
        console.error("Failed to parse database file, utilizing default memory data", e);
      }
    } else {
      this.save();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to write to database file", e);
    }
  }

  // Getters
  public getUsers() { return this.data.users; }
  public getChildren() { return this.data.children; }
  public getParents() {
    const parentsMap = new Map<string, Parent>();
    
    // Add existing static parents
    if (this.data.parents) {
      for (const p of this.data.parents) {
        if (p.email) {
          parentsMap.set(p.email.toLowerCase().trim(), p);
        } else if (p.fullName) {
          parentsMap.set("fallback-" + p.fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, ""), p);
        }
      }
    }
    
    // Dynamically build and add parents from any child's parent details
    if (this.data.children) {
      for (const c of this.data.children) {
        if (c.parentName) {
          const parentName = c.parentName.trim();
          if (!parentName) continue;
          
          let emailKey = "";
          if (c.parentEmail && c.parentEmail.trim()) {
            emailKey = c.parentEmail.toLowerCase().trim();
          } else {
            emailKey = parentName.toLowerCase().replace(/[^a-z0-9]/g, "") + "@firstcry.com";
          }
          
          if (!parentsMap.has(emailKey)) {
            const cleanId = "pr-" + Buffer.from(emailKey).toString("hex").slice(0, 12);
            parentsMap.set(emailKey, {
              id: cleanId,
              fullName: parentName,
              email: emailKey,
              phone: c.parentPhone || "",
              address: c.address || "",
              relationship: "Guardian"
            });
          }
        }
      }
    }
    
    return Array.from(parentsMap.values());
  }
  public getObservations() { return this.data.observations; }
  public getAIReports() { return this.data.aiReports; }
  public getAttendance() { return this.data.attendance; }
  public getClassrooms() { return this.data.classrooms; }
  public getMilestones() { return this.data.milestones; }
  public getNotifications() { return this.data.notifications; }
  public getActivityLogs() { return this.data.activityLogs; }
  public getSettings() { return this.data.settings; }

  // Setters/CRUD Operations
  public addUser(user: User) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updated: Partial<User>) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updated };
      this.save();
      return this.data.users[idx];
    }
    return null;
  }

  public deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.save();
  }

  public addChild(child: Child) {
    this.data.children.push(child);
    this.save();
    return child;
  }

  public updateChild(id: string, updated: Partial<Child>) {
    const idx = this.data.children.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.children[idx] = { ...this.data.children[idx], ...updated };
      this.save();
      return this.data.children[idx];
    }
    return null;
  }

  public deleteChild(id: string) {
    this.data.children = this.data.children.filter(c => c.id !== id);
    // Also cleanup child's attendance and observations
    this.data.attendance = this.data.attendance.filter(a => a.childId !== id);
    this.data.observations = this.data.observations.filter(o => o.childId !== id);
    this.data.aiReports = this.data.aiReports.filter(r => r.childId !== id);
    this.save();
  }

  public addObservation(obs: Observation) {
    this.data.observations.push(obs);
    this.save();
    return obs;
  }

  public updateObservation(id: string, updated: Partial<Observation>) {
    const idx = this.data.observations.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.data.observations[idx] = { ...this.data.observations[idx], ...updated };
      this.save();
      return this.data.observations[idx];
    }
    return null;
  }

  public deleteObservation(id: string) {
    this.data.observations = this.data.observations.filter(o => o.id !== id);
    // Also delete any associated AI report
    this.data.aiReports = this.data.aiReports.filter(r => r.observationId !== id);
    this.save();
  }

  public addAIReport(report: AIReport) {
    this.data.aiReports.push(report);
    this.save();
    return report;
  }

  public deleteAIReport(id: string) {
    this.data.aiReports = this.data.aiReports.filter(r => r.id !== id);
    this.save();
  }

  public setAttendance(records: Attendance[]) {
    // Process list, replacing duplicates for same child and date
    for (const rec of records) {
      const idx = this.data.attendance.findIndex(a => a.childId === rec.childId && a.date === rec.date);
      if (idx !== -1) {
        this.data.attendance[idx] = rec;
      } else {
        this.data.attendance.push(rec);
      }
    }
    this.save();
  }

  public addNotification(notif: Notification) {
    this.data.notifications.unshift(notif); // Add to beginning
    if (this.data.notifications.length > 100) {
      this.data.notifications.pop(); // Keep limit of 100
    }
    this.save();
    return notif;
  }

  public markNotificationAsRead(id: string) {
    const idx = this.data.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.data.notifications[idx].isRead = true;
      this.save();
    }
  }

  public markAllNotificationsAsRead(userId: string) {
    this.data.notifications = this.data.notifications.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    this.save();
  }

  public deleteNotification(id: string, userId: string, role: string) {
    const prevLength = this.data.notifications.length;
    this.data.notifications = this.data.notifications.filter(n => {
      if (n.id === id) {
        if (role === "Super Admin" || role === "Centre Head" || n.userId === userId) {
          return false; // delete it
        }
      }
      return true;
    });
    const changed = this.data.notifications.length !== prevLength;
    if (changed) {
      this.save();
    }
    return changed;
  }

  public clearAllNotifications(userId: string, role: string) {
    this.data.notifications = this.data.notifications.filter(n => {
      if (role === "Super Admin" || role === "Centre Head" || n.userId === userId) {
        return false; // delete it
      }
      return true;
    });
    this.save();
  }

  public addActivityLog(log: ActivityLog) {
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 200) {
      this.data.activityLogs.pop();
    }
    this.save();
    return log;
  }

  public updateSettings(settings: Partial<SystemSettings>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }

  // Seeding Default High-Quality Data
  private getInitialData(): DBData {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    const users: User[] = [
      {
        id: "usr-admin",
        email: "admin@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW", // plain text 'admin123'
        name: "Shalini Sen",
        role: "Super Admin",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        phone: "+91 98765 43210",
        active: true,
      },
      {
        id: "usr-head",
        email: "head@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW", // 'admin123'
        name: "Vikram Malhotra",
        role: "Centre Head",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        phone: "+91 98765 43211",
        active: true,
      },
      {
        id: "usr-teacher1",
        email: "teacher@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW", // 'admin123'
        name: "Priya Nair",
        role: "Teacher",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        phone: "+91 98765 43212",
        classroomId: "cls-toddlers",
        active: true,
      },
      {
        id: "usr-teacher2",
        email: "sneha@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW", // 'admin123'
        name: "Sneha Rao",
        role: "Teacher",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        phone: "+91 98765 43213",
        classroomId: "cls-nursery",
        active: true,
      },
      {
        id: "usr-counsellor",
        email: "counsellor@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW", // 'admin123'
        name: "Dr. Anjali Deshmukh",
        role: "Counsellor",
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
        phone: "+91 98765 43214",
        active: true,
      },
      {
        id: "usr-parent",
        email: "parent@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW", // 'admin123'
        name: "Rajesh Sharma",
        role: "Parent",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        phone: "+91 98765 43215",
        active: true,
      }
    ];

    const classrooms: Classroom[] = [
      { id: "cls-toddlers", name: "Toddlers (Playgroup)", capacity: 15, gradeLevel: "Pre-Nursery" },
      { id: "cls-nursery", name: "Nursery", capacity: 20, gradeLevel: "Nursery" },
      { id: "cls-prep", name: "Kindergarten (Prep)", capacity: 25, gradeLevel: "K1-K2" }
    ];

    const children: Child[] = [
      {
        id: "ch-riya",
        fullName: "Riya Sharma",
        dob: "2023-04-12",
        age: 3,
        gender: "Female",
        bloodGroup: "O+",
        parentName: "Rajesh Sharma",
        parentPhone: "+91 98765 43215",
        parentEmail: "parent@firstcry.com",
        address: "Flat 402, Sunshine Heights, Koramangala, Bengaluru",
        allergies: "Peanuts, Dust mites",
        medicalNotes: "Slight asthma under heavy dust exposure. Inhaler kept in teacher locker.",
        emergencyContact: "Rajesh Sharma (Father) - +91 98765 43215",
        classroomId: "cls-toddlers",
        classroomName: "Toddlers (Playgroup)",
        teacherId: "usr-teacher1",
        teacherName: "Priya Nair",
        photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=150"
      },
      {
        id: "ch-aarav",
        fullName: "Aarav Patel",
        dob: "2022-09-25",
        age: 3,
        gender: "Male",
        bloodGroup: "A+",
        parentName: "Karan Patel",
        parentPhone: "+91 98123 45678",
        parentEmail: "karan.patel@gmail.com",
        address: "Villa 12, Sobha Green Glen, Bellandur, Bengaluru",
        allergies: "None",
        medicalNotes: "No history of serious illnesses. Lactose-friendly diets preferred.",
        emergencyContact: "Meera Patel (Mother) - +91 98123 45679",
        classroomId: "cls-toddlers",
        classroomName: "Toddlers (Playgroup)",
        teacherId: "usr-teacher1",
        teacherName: "Priya Nair",
        photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=150"
      },
      {
        id: "ch-kabir",
        fullName: "Kabir Malhotra",
        dob: "2021-02-15",
        age: 5,
        gender: "Male",
        bloodGroup: "B+",
        parentName: "Vikram Malhotra",
        parentPhone: "+91 98765 43211",
        parentEmail: "head@firstcry.com",
        address: "Penthouse 3, Prestige Lake Ridge, Whitefield, Bengaluru",
        allergies: "Gluten sensitivity",
        medicalNotes: "Avoid wheat products. Provide rice or oats-based snacks.",
        emergencyContact: "Vikram Malhotra (Father) - +91 98765 43211",
        classroomId: "cls-prep",
        classroomName: "Kindergarten (Prep)",
        teacherId: "usr-teacher2",
        teacherName: "Sneha Rao",
        photo: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=150"
      },
      {
        id: "ch-ananya",
        fullName: "Ananya Sen",
        dob: "2022-01-30",
        age: 4,
        gender: "Female",
        bloodGroup: "AB+",
        parentName: "Debashis Sen",
        parentPhone: "+91 99001 22334",
        parentEmail: "debashis.sen@gmail.com",
        address: "Apt 201, Shriram Blue, KR Puram, Bengaluru",
        allergies: "Eggs",
        medicalNotes: "Carry EpiPen in medical box.",
        emergencyContact: "Debashis Sen (Father) - +91 99001 22334",
        classroomId: "cls-nursery",
        classroomName: "Nursery",
        teacherId: "usr-teacher2",
        teacherName: "Sneha Rao",
        photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
      }
    ];

    const parents: Parent[] = [
      { id: "pr-rajesh", fullName: "Rajesh Sharma", email: "parent@firstcry.com", phone: "+91 98765 43215", address: "Flat 402, Sunshine Heights, Koramangala, Bengaluru", relationship: "Father" },
      { id: "pr-karan", fullName: "Karan Patel", email: "karan.patel@gmail.com", phone: "+91 98123 45678", address: "Villa 12, Sobha Green Glen, Bellandur, Bengaluru", relationship: "Father" },
      { id: "pr-vikram", fullName: "Vikram Malhotra", email: "head@firstcry.com", phone: "+91 98765 43211", address: "Penthouse 3, Prestige Lake Ridge, Whitefield, Bengaluru", relationship: "Father" },
      { id: "pr-debashis", fullName: "Debashis Sen", email: "debashis.sen@gmail.com", phone: "+91 99001 22334", address: "Apt 201, Shriram Blue, KR Puram, Bengaluru", relationship: "Father" }
    ];

    const observations: Observation[] = [
      {
        id: "obs-1",
        childId: "ch-riya",
        childName: "Riya Sharma",
        classroomName: "Toddlers (Playgroup)",
        category: "Social",
        note: "Riya shared toys with friends and participated actively in group activities.",
        teacherId: "usr-teacher1",
        teacherName: "Priya Nair",
        date: today,
        riskLevel: "Low",
        status: "Analyzed"
      },
      {
        id: "obs-2",
        childId: "ch-riya",
        childName: "Riya Sharma",
        classroomName: "Toddlers (Playgroup)",
        category: "Communication",
        note: "Riya struggled to articulate her request during lunch, resorting to pointing and crying when not immediately understood.",
        teacherId: "usr-teacher1",
        teacherName: "Priya Nair",
        date: yesterday,
        riskLevel: "Medium",
        status: "Analyzed"
      },
      {
        id: "obs-3",
        childId: "ch-aarav",
        childName: "Aarav Patel",
        classroomName: "Toddlers (Playgroup)",
        category: "Behaviour",
        note: "Aarav showed excellent patience during the blocks game. He waited for his turn and helped clean up the space afterward.",
        teacherId: "usr-teacher1",
        teacherName: "Priya Nair",
        date: today,
        riskLevel: "Low",
        status: "Pending"
      },
      {
        id: "obs-4",
        childId: "ch-kabir",
        childName: "Kabir Malhotra",
        classroomName: "Kindergarten (Prep)",
        category: "Learning",
        note: "Kabir showed brilliant interest in our space theme activity, naming multiple planets and asking curious questions about gravity.",
        teacherId: "usr-teacher2",
        teacherName: "Sneha Rao",
        date: yesterday,
        riskLevel: "Low",
        status: "Pending"
      }
    ];

    const aiReports: AIReport[] = [
      {
        id: "rep-1",
        observationId: "obs-1",
        childId: "ch-riya",
        childName: "Riya Sharma",
        summary: "Riya demonstrated positive prosocial behavior by sharing toys and engaging enthusiastically in peer circle group activities.",
        strengths: ["Highly collaborative in group play", "Willingness to share learning aids and toys", "Active participation in nursery rhyme singing"],
        concerns: ["Slightly dependent on teacher validation to sustain play"],
        recommendations: ["Encourage small-group self-directed play to foster independent play skills", "Praise Riya for sharing to reinforce positive reinforcement patterns"],
        activities: ["Two-player building blocks challenge", "Relay race with toys sharing"],
        developmentNotes: {
          socialSkills: "Riya exhibits strong social awareness and values group membership. She shows peer empathy by sharing resource blocks.",
          learningProgress: "Very fast to adapt to group curriculum guidelines and shows eagerness to follow instructions.",
          communicationSkills: "Expresses joy and interactive responses comfortably in comfortable social scenarios.",
          emotionalBehaviour: "Stable, cheerful, and displays highly responsive bonding with peers and instructors.",
          confidenceLevel: "Exhibits excellent trust in her surrounding environment and feels comfortable displaying creativity."
        },
        parentSuggestions: ["Set up sibling or playdate block building exercises at home.", "Acknowledge and appreciate her efforts when she shares her things at home."],
        teacherRecommendations: ["Assign her as group helper next week to build confidence.", "Observe her during transition times to check for self-regulation."],
        riskLevel: "Low",
        overallSummary: "Riya is progressing exceptionally well in her social development milestone. Her natural cooperative habits are a great asset to the class community.",
        dateGenerated: today,
        generatedBy: "Priya Nair"
      },
      {
        id: "rep-2",
        observationId: "obs-2",
        childId: "ch-riya",
        childName: "Riya Sharma",
        summary: "During high-density communication scenarios (lunch period requests), Riya experienced frustration leading to emotional outbursts when struggling to find words.",
        strengths: ["Strong non-verbal cues and emotional display", "Calms down quickly with gentle, supportive teacher redirection"],
        concerns: ["Relatively high frustration response when verbal communication limits are reached", "Resorts to pointing and crying instead of requesting words"],
        recommendations: ["Introduce basic expressive vocabulary cards", "Implement the 'use your words' slow-prompt technique during high-motivation times like lunch"],
        activities: ["Label-the-food matching exercises", "Roleplay buying and selling toy groceries"],
        developmentNotes: {
          socialSkills: "Generally highly interactive, but frustration temporarily impairs social participation.",
          learningProgress: "Exhibits normal cognitive development; expressive speech is the key focused growth area.",
          communicationSkills: "Strong receptive understanding but faces expressive delays in high-stimulus or emotional environments.",
          emotionalBehaviour: "Exhibits intense emotional reactions which can be managed with structured comfort breaks.",
          confidenceLevel: "Confidence fluctuates when verbal requests are not immediately resolved."
        },
        parentSuggestions: ["Encourage her to complete full sentences at home instead of answering for her.", "Read books together and ask her to name objects explicitly."],
        teacherRecommendations: ["Provide visual communication templates next to her seat.", "Practice deep-breathing micro-sessions when she starts crying."],
        riskLevel: "Medium",
        overallSummary: "Riya is demonstrating regular milestone development with an expressive language buffer area. Focused expressive and calming routines will help her bridge this gap.",
        dateGenerated: yesterday,
        generatedBy: "Priya Nair"
      }
    ];

    const attendance: Attendance[] = [
      { id: "att-1", childId: "ch-riya", childName: "Riya Sharma", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: today, status: "Present" },
      { id: "att-2", childId: "ch-aarav", childName: "Aarav Patel", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: today, status: "Present" },
      { id: "att-3", childId: "ch-ananya", childName: "Ananya Sen", classroomId: "cls-nursery", classroomName: "Nursery", date: today, status: "Late", notes: "Traffic delays" },
      { id: "att-4", childId: "ch-kabir", childName: "Kabir Malhotra", classroomId: "cls-prep", classroomName: "Kindergarten (Prep)", date: today, status: "Absent", notes: "Mild fever" },

      { id: "att-5", childId: "ch-riya", childName: "Riya Sharma", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: yesterday, status: "Present" },
      { id: "att-6", childId: "ch-aarav", childName: "Aarav Patel", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: yesterday, status: "Present" },
      { id: "att-7", childId: "ch-ananya", childName: "Ananya Sen", classroomId: "cls-nursery", classroomName: "Nursery", date: yesterday, status: "Present" },
      { id: "att-8", childId: "ch-kabir", childName: "Kabir Malhotra", classroomId: "cls-prep", classroomName: "Kindergarten (Prep)", date: yesterday, status: "Present" }
    ];

    const milestones: Milestone[] = [
      { id: "m-1", title: "Shares toys with peers", description: "Willingly offers play materials to classmates during free play.", category: "Social", targetAgeMonths: 36 },
      { id: "m-2", title: "Expresses needs in words", description: "Uses 3-4 word phrases to request food, water, or help.", category: "Communication", targetAgeMonths: 36 },
      { id: "m-3", title: "Hops on one foot", description: "Balances and hops on one foot at least 3 times consecutively.", category: "Physical", targetAgeMonths: 48 },
      { id: "m-4", title: "Sorts items by color", description: "Identifies and groups plastic blocks or crayons by their prime color.", category: "Learning", targetAgeMonths: 36 }
    ];

    const notifications: Notification[] = [
      {
        id: "not-1",
        userId: "usr-teacher1",
        title: "Observation Logged Successfully",
        message: "You have recorded a social observation note for Riya Sharma.",
        type: "success",
        isRead: false,
        timestamp: new Date().toISOString()
      },
      {
        id: "not-2",
        userId: "usr-admin",
        title: "AI Report Generated",
        message: "A new development report is generated for child Riya Sharma.",
        type: "info",
        isRead: false,
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "not-3",
        userId: "usr-teacher1",
        title: "Attendance Overdue",
        message: "Please complete today's Toddlers classroom attendance log.",
        type: "warning",
        isRead: true,
        timestamp: new Date(Date.now() - 14400000).toISOString()
      }
    ];

    const activityLogs: ActivityLog[] = [
      {
        id: "log-1",
        userId: "usr-teacher1",
        userName: "Priya Nair",
        action: "Observation Created",
        details: "Logged Social skills observation for Riya Sharma.",
        timestamp: new Date().toISOString()
      },
      {
        id: "log-2",
        userId: "usr-teacher1",
        userName: "Priya Nair",
        action: "AI Report Generated",
        details: "Triggered Gemini intelligence model for observation obs-1.",
        timestamp: new Date(Date.now() - 10000).toISOString()
      }
    ];

    const settings: SystemSettings = {
      schoolName: "FirstCry Intellitots, Koramangala",
      logoUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=100",
      theme: "light",
      smtpHost: "smtp.firstcry.com",
      smtpPort: 587,
      smtpUser: "notifications@firstcryintellitots.com",
      backupInterval: "Daily"
    };

    return {
      users,
      children,
      parents,
      observations,
      aiReports,
      attendance,
      classrooms,
      milestones,
      notifications,
      activityLogs,
      settings
    };
  }
}
