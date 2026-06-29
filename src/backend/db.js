import fs from "fs";
import path from "path";
import pg from "pg";
const { Pool } = pg;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export class Database {
  data;
  pgPool = null;
  constructor() {
    this.data = this.getInitialData();
  }
  initPool() {
    if (process.env.DATABASE_URL && !this.pgPool) {
      try {
        this.pgPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        console.log("Database: PostgreSQL pool initialized successfully.");
      } catch (e) {
        console.error("Database: Failed to initialize PostgreSQL pool:", e);
      }
    }
  }
  async init() {
    this.initPool();
    if (this.pgPool) {
      try {
        await this.pgPool.query(`
          CREATE TABLE IF NOT EXISTS json_db_store (
            id INT PRIMARY KEY,
            data JSONB NOT NULL
          )
        `);
        const res = await this.pgPool.query("SELECT data FROM json_db_store WHERE id = 1");
        if (res.rows.length > 0) {
          this.data = res.rows[0].data;
          console.log("Database: Loaded data successfully from PostgreSQL.");
          return;
        } else {
          const initialData = this.getInitialData();
          await this.pgPool.query("INSERT INTO json_db_store (id, data) VALUES (1, $1)", [JSON.stringify(initialData)]);
          this.data = initialData;
          console.log("Database: Seeded initial data successfully into PostgreSQL.");
          return;
        }
      } catch (e) {
        console.error("Database: PostgreSQL query failed, falling back to local file:", e);
      }
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Database file initialization failed, using in-memory store:", e);
    }
  }
  save() {
    if (this.pgPool) {
      this.pgPool.query("UPDATE json_db_store SET data = $1 WHERE id = 1", [JSON.stringify(this.data)])
        .then(() => console.log("Database: Synced state to PostgreSQL."))
        .catch((e) => console.error("Database: Failed to sync state to PostgreSQL:", e));
    }
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      // Silent on EROFS
    }
  }
  // Getters
  getUsers() {
    return this.data.users;
  }
  getChildren() {
    return this.data.children;
  }
  getParents() {
    const parentsMap = /* @__PURE__ */ new Map();
    if (this.data.parents) {
      for (const p of this.data.parents) {
        if (p.email) {
          parentsMap.set(p.email.toLowerCase().trim(), p);
        } else if (p.fullName) {
          parentsMap.set("fallback-" + p.fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, ""), p);
        }
      }
    }
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
  getObservations() {
    return this.data.observations;
  }
  getAIReports() {
    return this.data.aiReports;
  }
  getAttendance() {
    return this.data.attendance;
  }
  getClassrooms() {
    return this.data.classrooms;
  }
  getMilestones() {
    return this.data.milestones;
  }
  getNotifications() {
    return this.data.notifications;
  }
  getActivityLogs() {
    return this.data.activityLogs;
  }
  getSettings() {
    return this.data.settings;
  }
  // Setters/CRUD Operations
  addUser(user) {
    this.data.users.push(user);
    this.save();
    return user;
  }
  updateUser(id, updated) {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updated };
      this.save();
      return this.data.users[idx];
    }
    return null;
  }
  deleteUser(id) {
    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.save();
  }
  addChild(child) {
    this.data.children.push(child);
    this.save();
    return child;
  }
  updateChild(id, updated) {
    const idx = this.data.children.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.data.children[idx] = { ...this.data.children[idx], ...updated };
      this.save();
      return this.data.children[idx];
    }
    return null;
  }
  deleteChild(id) {
    this.data.children = this.data.children.filter((c) => c.id !== id);
    this.data.attendance = this.data.attendance.filter((a) => a.childId !== id);
    this.data.observations = this.data.observations.filter((o) => o.childId !== id);
    this.data.aiReports = this.data.aiReports.filter((r) => r.childId !== id);
    this.save();
  }
  addObservation(obs) {
    this.data.observations.push(obs);
    this.save();
    return obs;
  }
  updateObservation(id, updated) {
    const idx = this.data.observations.findIndex((o) => o.id === id);
    if (idx !== -1) {
      this.data.observations[idx] = { ...this.data.observations[idx], ...updated };
      this.save();
      return this.data.observations[idx];
    }
    return null;
  }
  deleteObservation(id) {
    this.data.observations = this.data.observations.filter((o) => o.id !== id);
    this.data.aiReports = this.data.aiReports.filter((r) => r.observationId !== id);
    this.save();
  }
  addAIReport(report) {
    this.data.aiReports.push(report);
    this.save();
    return report;
  }
  deleteAIReport(id) {
    this.data.aiReports = this.data.aiReports.filter((r) => r.id !== id);
    this.save();
  }
  setAttendance(records) {
    for (const rec of records) {
      const idx = this.data.attendance.findIndex((a) => a.childId === rec.childId && a.date === rec.date);
      if (idx !== -1) {
        this.data.attendance[idx] = rec;
      } else {
        this.data.attendance.push(rec);
      }
    }
    this.save();
  }
  addNotification(notif) {
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 100) {
      this.data.notifications.pop();
    }
    this.save();
    return notif;
  }
  markNotificationAsRead(id) {
    const idx = this.data.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this.data.notifications[idx].isRead = true;
      this.save();
    }
  }
  markAllNotificationsAsRead(userId) {
    this.data.notifications = this.data.notifications.map((n) => n.userId === userId ? { ...n, isRead: true } : n);
    this.save();
  }
  deleteNotification(id, userId, role) {
    const prevLength = this.data.notifications.length;
    this.data.notifications = this.data.notifications.filter((n) => {
      if (n.id === id) {
        if (role === "Super Admin" || role === "Centre Head" || n.userId === userId) {
          return false;
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
  clearAllNotifications(userId, role) {
    this.data.notifications = this.data.notifications.filter((n) => {
      if (role === "Super Admin" || role === "Centre Head" || n.userId === userId) {
        return false;
      }
      return true;
    });
    this.save();
  }
  addActivityLog(log) {
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 200) {
      this.data.activityLogs.pop();
    }
    this.save();
    return log;
  }
  updateSettings(settings) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }
  // Seeding Default High-Quality Data
  getInitialData() {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 1728e5).toISOString().split("T")[0];
    const users = [
      {
        id: "usr-admin",
        email: "admin@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW",
        // plain text 'admin123'
        name: "Shalini Sen",
        role: "Super Admin",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        phone: "+91 98765 43210",
        active: true
      },
      {
        id: "usr-head",
        email: "head@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW",
        // 'admin123'
        name: "Vikram Malhotra",
        role: "Centre Head",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        phone: "+91 98765 43211",
        active: true
      },
      {
        id: "usr-teacher1",
        email: "teacher@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW",
        // 'admin123'
        name: "Priya Nair",
        role: "Teacher",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        phone: "+91 98765 43212",
        classroomId: "cls-toddlers",
        active: true
      },
      {
        id: "usr-teacher2",
        email: "sneha@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW",
        // 'admin123'
        name: "Sneha Rao",
        role: "Teacher",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        phone: "+91 98765 43213",
        classroomId: "cls-nursery",
        active: true
      },
      {
        id: "usr-counsellor",
        email: "counsellor@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW",
        // 'admin123'
        name: "Dr. Anjali Deshmukh",
        role: "Counsellor",
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
        phone: "+91 98765 43214",
        active: true
      },
      {
        id: "usr-parent",
        email: "parent@firstcry.com",
        passwordHash: "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW",
        // 'admin123'
        name: "Rajesh Sharma",
        role: "Parent",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        phone: "+91 98765 43215",
        active: true
      },
      {
        id: "usr-rondateja",
        email: "rondateja@gmail.com",
        passwordHash: "password123",
        name: "Ronda Teja",
        role: "Parent",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        phone: "+91 98765 43219",
        active: true
      },
      {
        id: "usr-tejasree",
        email: "tejasree@gmail.com",
        passwordHash: "password123",
        name: "Teja Sree",
        role: "Parent",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        phone: "+91 98765 43220",
        active: true
      },
      {
        id: "usr-af6b1a4897b9",
        email: "rishi@gmail.com",
        passwordHash: "parent123",
        name: "Harika",
        role: "Parent",
        phone: "7995001537",
        active: true,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
      },
      {
        id: "usr-829af6365aaa",
        email: "akshayakumari612@gmail.com",
        passwordHash: "12345",
        name: "Akshaya kumari",
        role: "Teacher",
        phone: "9182355435",
        classroomId: "cls-prep",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        active: true,
        gender: "Female"
      },
      {
        id: "usr-9fe9cf955f5e",
        email: "Shiva@gmail.com",
        passwordHash: "23456",
        name: "Shiva Ram",
        role: "Teacher",
        phone: "2456789764",
        classroomId: "cls-prep",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        active: true,
        gender: "Male"
      }
    ];
    const classrooms = [
      { id: "cls-toddlers", name: "Toddlers (Playgroup)", capacity: 15, gradeLevel: "Pre-Nursery" },
      { id: "cls-nursery", name: "Nursery", capacity: 20, gradeLevel: "Nursery" },
      { id: "cls-prep", name: "Kindergarten (Prep)", capacity: 25, gradeLevel: "K1-K2" }
    ];
    const children = [
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
        parentId: "usr-parent",
        parent_id: "usr-parent",
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
      },
      {
        id: "ch-teja-jr",
        fullName: "Teja Jr",
        dob: "2022-05-15",
        age: 4,
        gender: "Male",
        bloodGroup: "O+",
        parentName: "Ronda Teja",
        parentPhone: "+91 98765 43219",
        parentEmail: "rondateja@gmail.com",
        parentId: "usr-rondateja",
        parent_id: "usr-rondateja",
        address: "Hyderabad, Telangana",
        allergies: "None",
        medicalNotes: "Healthy active child",
        emergencyContact: "Ronda Teja (Father) - +91 98765 43219",
        classroomId: "cls-prep",
        classroomName: "Kindergarten (Prep)",
        teacherId: "usr-teacher1",
        teacherName: "Priya Nair",
        photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=150"
      },
      {
        id: "ch-sree-jr",
        fullName: "Sree Jr",
        dob: "2023-08-20",
        age: 3,
        gender: "Female",
        bloodGroup: "A+",
        parentName: "Teja Sree",
        parentPhone: "+91 98765 43220",
        parentEmail: "tejasree@gmail.com",
        parentId: "usr-tejasree",
        parent_id: "usr-tejasree",
        address: "Hyderabad, Telangana",
        allergies: "None",
        medicalNotes: "Healthy active child",
        emergencyContact: "Teja Sree (Mother) - +91 98765 43220",
        classroomId: "cls-nursery",
        classroomName: "Nursery",
        teacherId: "usr-teacher2",
        teacherName: "Sneha Rao",
        photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
      },
      {
        id: "ch-b0d34e03637e",
        fullName: "Rishi",
        dob: "2026-06-27",
        age: 3,
        gender: "Male",
        bloodGroup: "O+",
        parentName: "Harika",
        parentPhone: "7995001537",
        parentEmail: "rishi@gmail.com",
        parentId: "usr-af6b1a4897b9",
        parent_id: "usr-af6b1a4897b9",
        address: "chirala, andhrapradesh",
        medicalNotes: "no",
        allergies: "no",
        emergencyContact: "123456789",
        classroomId: "cls-prep",
        classroomName: "Kindergarten (Prep)",
        teacherId: "usr-teacher1",
        teacherName: "Priya Nair",
        photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=150"
      }
    ];
    const parents = [
      { id: "pr-rajesh", fullName: "Rajesh Sharma", email: "parent@firstcry.com", phone: "+91 98765 43215", address: "Flat 402, Sunshine Heights, Koramangala, Bengaluru", relationship: "Father" },
      { id: "pr-karan", fullName: "Karan Patel", email: "karan.patel@gmail.com", phone: "+91 98123 45678", address: "Villa 12, Sobha Green Glen, Bellandur, Bengaluru", relationship: "Father" },
      { id: "pr-vikram", fullName: "Vikram Malhotra", email: "head@firstcry.com", phone: "+91 98765 43211", address: "Penthouse 3, Prestige Lake Ridge, Whitefield, Bengaluru", relationship: "Father" },
      { id: "pr-debashis", fullName: "Debashis Sen", email: "debashis.sen@gmail.com", phone: "+91 99001 22334", address: "Apt 201, Shriram Blue, KR Puram, Bengaluru", relationship: "Father" },
      { id: "pr-rondateja", fullName: "Ronda Teja", email: "rondateja@gmail.com", phone: "+91 98765 43219", address: "Hyderabad, Telangana", relationship: "Father" },
      { id: "pr-tejasree", fullName: "Teja Sree", email: "tejasree@gmail.com", phone: "+91 98765 43220", address: "Hyderabad, Telangana", relationship: "Mother" },
      { id: "pr-harika", fullName: "Harika", email: "rishi@gmail.com", phone: "7995001537", address: "chirala, andhrapradesh", relationship: "Mother" }
    ];
    const observations = [
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
    const aiReports = [
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
    const attendance = [
      { id: "att-1", childId: "ch-riya", childName: "Riya Sharma", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: today, status: "Present" },
      { id: "att-2", childId: "ch-aarav", childName: "Aarav Patel", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: today, status: "Present" },
      { id: "att-3", childId: "ch-ananya", childName: "Ananya Sen", classroomId: "cls-nursery", classroomName: "Nursery", date: today, status: "Late", notes: "Traffic delays" },
      { id: "att-4", childId: "ch-kabir", childName: "Kabir Malhotra", classroomId: "cls-prep", classroomName: "Kindergarten (Prep)", date: today, status: "Absent", notes: "Mild fever" },
      { id: "att-5", childId: "ch-riya", childName: "Riya Sharma", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: yesterday, status: "Present" },
      { id: "att-6", childId: "ch-aarav", childName: "Aarav Patel", classroomId: "cls-toddlers", classroomName: "Toddlers (Playgroup)", date: yesterday, status: "Present" },
      { id: "att-7", childId: "ch-ananya", childName: "Ananya Sen", classroomId: "cls-nursery", classroomName: "Nursery", date: yesterday, status: "Present" },
      { id: "att-8", childId: "ch-kabir", childName: "Kabir Malhotra", classroomId: "cls-prep", classroomName: "Kindergarten (Prep)", date: yesterday, status: "Present" }
    ];
    const milestones = [
      { id: "m-1", title: "Shares toys with peers", description: "Willingly offers play materials to classmates during free play.", category: "Social", targetAgeMonths: 36 },
      { id: "m-2", title: "Expresses needs in words", description: "Uses 3-4 word phrases to request food, water, or help.", category: "Communication", targetAgeMonths: 36 },
      { id: "m-3", title: "Hops on one foot", description: "Balances and hops on one foot at least 3 times consecutively.", category: "Physical", targetAgeMonths: 48 },
      { id: "m-4", title: "Sorts items by color", description: "Identifies and groups plastic blocks or crayons by their prime color.", category: "Learning", targetAgeMonths: 36 }
    ];
    const notifications = [
      {
        id: "not-1",
        userId: "usr-teacher1",
        title: "Observation Logged Successfully",
        message: "You have recorded a social observation note for Riya Sharma.",
        type: "success",
        isRead: false,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "not-2",
        userId: "usr-admin",
        title: "AI Report Generated",
        message: "A new development report is generated for child Riya Sharma.",
        type: "info",
        isRead: false,
        timestamp: new Date(Date.now() - 36e5).toISOString()
      },
      {
        id: "not-3",
        userId: "usr-teacher1",
        title: "Attendance Overdue",
        message: "Please complete today's Toddlers classroom attendance log.",
        type: "warning",
        isRead: true,
        timestamp: new Date(Date.now() - 144e5).toISOString()
      }
    ];
    const activityLogs = [
      {
        id: "log-1",
        userId: "usr-teacher1",
        userName: "Priya Nair",
        action: "Observation Created",
        details: "Logged Social skills observation for Riya Sharma.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "log-2",
        userId: "usr-teacher1",
        userName: "Priya Nair",
        action: "AI Report Generated",
        details: "Triggered Gemini intelligence model for observation obs-1.",
        timestamp: new Date(Date.now() - 1e4).toISOString()
      }
    ];
    const settings = {
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
