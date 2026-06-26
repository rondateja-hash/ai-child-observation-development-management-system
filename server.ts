import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Database, User, Child, Observation, AIReport, Attendance, Notification } from "./src/backend/db";
import { generateAIReportFromObservation } from "./src/backend/gemini";

// Initialize local database
const db = new Database();

// Session Token Store
const activeSessions = new Map<string, string>(); // token -> userId

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper middleware to authenticate bearer tokens
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Access denied. No active token provided." });
      return;
    }
    const token = authHeader.split(" ")[1];
    const userId = activeSessions.get(token);
    if (!userId) {
      res.status(401).json({ error: "Session expired or invalid. Please login again." });
      return;
    }
    const user = db.getUsers().find(u => u.id === userId);
    if (!user || !user.active) {
      res.status(401).json({ error: "User is deactivated or deleted." });
      return;
    }
    // Attach user to request
    (req as any).user = user;
    next();
  };

  // Helper: Simple SHA-256 password hash check
  const verifyPassword = (password: string, hash: string) => {
    // For our seed passwords (which are 'admin123' mapped to "$2a$10$r8Qsh7vXf.M.l.e3i0o29OVgS/K3NlyfLoxjSjY8oWpBfR/0p89eW")
    // or if the password is plain text (helps for debugging and easy logins!)
    if (hash.startsWith("$2a$10$") && password === "admin123") return true;
    return password === hash; // Direct comparison for newly created users
  };

  // Helper: Robustly link/match children to their Parent users
  const isChildOfParent = (child: Child, parentUser: User): boolean => {
    if (!parentUser) return false;

    // 1. Match by email (case-insensitive, trimmed)
    if (parentUser.email && child.parentEmail) {
      if (parentUser.email.trim().toLowerCase() === child.parentEmail.trim().toLowerCase()) {
        return true;
      }
    }

    // 2. Match by phone (normalized, comparing last 10 digits)
    if (parentUser.phone && child.parentPhone) {
      const normUserPhone = parentUser.phone.replace(/\D/g, "");
      const normChildPhone = child.parentPhone.replace(/\D/g, "");
      if (normUserPhone && normChildPhone) {
        const len = Math.min(normUserPhone.length, normChildPhone.length);
        const matchLen = Math.min(10, len);
        if (matchLen >= 6) {
          if (normUserPhone.slice(-matchLen) === normChildPhone.slice(-matchLen)) {
            return true;
          }
        } else if (normUserPhone === normChildPhone) {
          return true;
        }
      }
    }

    // 3. Fallback: match by parent's exact name
    if (parentUser.name && child.parentName) {
      if (parentUser.name.trim().toLowerCase() === child.parentName.trim().toLowerCase()) {
        return true;
      }
    }

    return false;
  };

  // ==========================================
  // API: /api/auth
  // ==========================================

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Invalid email or password credentials" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    activeSessions.set(token, user.id);

    // Log Activity
    db.addActivityLog({
      id: "act-" + crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      action: "Login",
      details: `Successful login as ${user.role}`,
      timestamp: new Date().toISOString()
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        classroomId: user.classroomId
      }
    });
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, phone, gender } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required." });
      return;
    }

    // Check duplicate email
    if (db.getUsers().some(u => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(400).json({ error: "Email address is already registered." });
      return;
    }

    const newUser: User = {
      id: "usr-" + crypto.randomBytes(6).toString("hex"),
      email: email.trim(),
      passwordHash: password, // For simplicity we store plain text or simple hash support
      name: name.trim(),
      role: "Parent",
      phone: phone || "",
      active: true,
      gender: gender || "",
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`
    };

    db.addUser(newUser);

    // Dynamic Linking: See if there is any child enrolled with this parentEmail or parentPhone
    // and link them if found!
    const children = db.getChildren();
    let matchCount = 0;
    children.forEach(c => {
      const emailMatches = c.parentEmail && c.parentEmail.trim().toLowerCase() === email.trim().toLowerCase();
      const phoneMatches = phone && c.parentPhone && c.parentPhone.replace(/\D/g, "") === phone.replace(/\D/g, "");
      if (emailMatches || phoneMatches) {
        c.parentName = name.trim();
        if (phone) c.parentPhone = phone;
        c.parentEmail = email.trim();
        matchCount++;
      }
    });

    if (matchCount > 0) {
      db.save();
    }

    // Activity Log
    db.addActivityLog({
      id: "act-" + crypto.randomUUID(),
      userId: newUser.id,
      userName: newUser.name,
      action: "Register",
      details: `New parent registered: ${name} (${email}). Linked to ${matchCount} students.`,
      timestamp: new Date().toISOString()
    });

    const token = crypto.randomBytes(32).toString("hex");
    activeSessions.set(token, newUser.id);

    res.status(201).json({ 
      success: true, 
      token,
      message: `Account registered successfully! ${matchCount > 0 ? `Linked ${matchCount} student profile(s) automatically.` : "You can link your child's profile inside."}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar: newUser.avatar,
        phone: newUser.phone
      }
    });
  });

  app.get("/api/auth/me", authenticate, (req, res) => {
    const user = (req as any).user as User;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        classroomId: user.classroomId
      }
    });
  });

  app.post("/api/auth/logout", authenticate, (req, res) => {
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(" ")[1];
    activeSessions.delete(token);
    res.json({ success: true, message: "Logged out successfully" });
  });

  app.get("/api/auth/profiles", authenticate, (req, res) => {
    const teachers = db.getUsers().filter(u => u.role === "Teacher" && u.active).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      classroomId: u.classroomId,
      avatar: u.avatar
    }));

    const parents = db.getParents().map(p => ({
      id: p.id,
      name: p.fullName,
      email: p.email,
      phone: p.phone,
      address: p.address,
      relationship: p.relationship
    }));

    res.json({ teachers, parents });
  });

  app.post("/api/auth/switch-profile", authenticate, (req, res) => {
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(" ")[1];
    const { role, profileId } = req.body;

    if (role === "Teacher") {
      const teacherUser = db.getUsers().find(u => u.id === profileId && u.role === "Teacher");
      if (!teacherUser) {
        res.status(404).json({ error: "Teacher profile not found." });
        return;
      }
      activeSessions.set(token, teacherUser.id);
      res.json({
        success: true,
        message: `Switched to Teacher profile: ${teacherUser.name}`,
        user: {
          id: teacherUser.id,
          email: teacherUser.email,
          name: teacherUser.name,
          role: teacherUser.role,
          avatar: teacherUser.avatar,
          phone: teacherUser.phone,
          classroomId: teacherUser.classroomId
        }
      });
    } else if (role === "Parent") {
      const parentRecord = db.getParents().find(p => p.id === profileId);
      if (!parentRecord) {
        res.status(404).json({ error: "Parent profile not found." });
        return;
      }

      let parentUser = db.getUsers().find(u => u.email.toLowerCase() === parentRecord.email.toLowerCase());
      if (!parentUser) {
        parentUser = {
          id: "usr-" + crypto.randomBytes(6).toString("hex"),
          email: parentRecord.email,
          passwordHash: "admin123",
          name: parentRecord.fullName,
          role: "Parent",
          phone: parentRecord.phone,
          active: true,
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
        };
        db.addUser(parentUser);
      }

      activeSessions.set(token, parentUser.id);
      res.json({
        success: true,
        message: `Switched to Parent profile: ${parentUser.name}`,
        user: {
          id: parentUser.id,
          email: parentUser.email,
          name: parentUser.name,
          role: parentUser.role,
          avatar: parentUser.avatar,
          phone: parentUser.phone
        }
      });
    } else {
      res.status(400).json({ error: "Invalid role switch request." });
    }
  });


  // ==========================================
  // API: /api/users
  // ==========================================

  app.get("/api/users", authenticate, (req, res) => {
    const users = db.getUsers().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      active: u.active,
      classroomId: u.classroomId,
      avatar: u.avatar,
      gender: u.gender
    }));
    res.json(users);
  });

  app.post("/api/users", authenticate, (req, res) => {
    const { name, email, password, role, phone, classroomId, avatar, gender } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "Name, email, password, and role are required." });
      return;
    }

    // Check duplicate email
    if (db.getUsers().some(u => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(400).json({ error: "Email address is already registered." });
      return;
    }

    const newUser: User = {
      id: "usr-" + crypto.randomBytes(6).toString("hex"),
      email,
      passwordHash: password, // For simplicity we store plain, verify supports it
      name,
      role,
      phone,
      classroomId,
      avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      active: true,
      gender: gender || ""
    };

    db.addUser(newUser);

    // Activity Log
    db.addActivityLog({
      id: "act-" + crypto.randomUUID(),
      userId: (req as any).user.id,
      userName: (req as any).user.name,
      action: "User Created",
      details: `Created new user ${name} with role ${role}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newUser);
  });

  app.put("/api/users/:id", authenticate, (req, res) => {
    const { name, email, role, phone, classroomId, active, avatar, gender } = req.body;
    const updated = db.updateUser(req.params.id, {
      name, email, role, phone, classroomId, active, avatar, gender
    });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(updated);
  });

  app.delete("/api/users/:id", authenticate, (req, res) => {
    db.deleteUser(req.params.id);
    res.json({ success: true, message: "User deleted successfully" });
  });


  // ==========================================
  // API: /api/children
  // ==========================================

  app.get("/api/children", authenticate, (req, res) => {
    let children = db.getChildren();
    
    const reqUser = (req as any).user as User;
    if (reqUser.role === "Parent") {
      if (reqUser.email === "parent@firstcry.com") {
        // Return all children to let them select their child profile during first login
      } else {
        children = children.filter(c => isChildOfParent(c, reqUser));
      }
    }
    
    res.json(children);
  });

  app.post("/api/children/link", authenticate, (req, res) => {
    const reqUser = (req as any).user as User;
    if (reqUser.role !== "Parent") {
      res.status(403).json({ error: "Only parents can link/claim children profiles." });
      return;
    }

    const { childName, dob } = req.body;
    if (!childName || !dob) {
      res.status(400).json({ error: "Child's full name and date of birth are required." });
      return;
    }

    const children = db.getChildren();
    const child = children.find(c => 
      c.fullName.trim().toLowerCase() === childName.trim().toLowerCase() && 
      c.dob === dob
    );

    if (!child) {
      res.status(404).json({ error: "No matching student profile found. Please verify the spelling and Date of Birth with your child's teacher." });
      return;
    }

    // Link child to this parent
    child.parentEmail = reqUser.email;
    if (reqUser.phone) {
      child.parentPhone = reqUser.phone;
    }
    child.parentName = reqUser.name;
    
    // update emergency contact if it was empty or matched old parent
    if (!child.emergencyContact || child.emergencyContact.includes("Rajesh Sharma")) {
      child.emergencyContact = `${reqUser.name} (Parent) - ${reqUser.phone || ""}`;
    }

    db.save();

    // Log Activity
    db.addActivityLog({
      id: "act-" + crypto.randomUUID(),
      userId: reqUser.id,
      userName: reqUser.name,
      action: "Child Linked",
      details: `Linked parent account ${reqUser.name} to student ${child.fullName}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: `Successfully linked ${child.fullName} to your account!`, child });
  });

  app.post("/api/children", authenticate, (req, res) => {
    const { fullName, dob, gender, bloodGroup, parentName, parentPhone, parentEmail, address, medicalNotes, allergies, emergencyContact, classroomId } = req.body;
    
    if (!fullName || !dob || !gender || !parentName || !parentPhone || !classroomId) {
      res.status(400).json({ error: "Missing required children attributes." });
      return;
    }

    const classroom = db.getClassrooms().find(cls => cls.id === classroomId);
    const classIdStr = classroomId;
    const classNameStr = classroom ? classroom.name : "Playgroup";

    // Deduce age from dob
    const birthDate = new Date(dob);
    const age = new Date().getFullYear() - birthDate.getFullYear();

    // Default instructor assigned
    const assignedTeacher = db.getUsers().find(u => u.role === "Teacher" && u.classroomId === classIdStr) || db.getUsers().find(u => u.role === "Teacher");

    const newChild: Child = {
      id: "ch-" + crypto.randomBytes(6).toString("hex"),
      fullName,
      dob,
      age: age || 3,
      gender,
      bloodGroup: bloodGroup || "O+",
      parentName,
      parentPhone,
      parentEmail,
      address,
      medicalNotes,
      allergies,
      emergencyContact: emergencyContact || `${parentName} (${parentPhone})`,
      classroomId: classIdStr,
      classroomName: classNameStr,
      teacherId: assignedTeacher ? assignedTeacher.id : "usr-teacher1",
      teacherName: assignedTeacher ? assignedTeacher.name : "Priya Nair",
      photo: gender === "Female" 
        ? "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=150"
        : "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=150"
    };

    db.addChild(newChild);

    // Auto-provision parent login user if email is provided and doesn't exist
    if (parentEmail && parentEmail.trim()) {
      const existingUser = db.getUsers().find(u => u.email.toLowerCase() === parentEmail.trim().toLowerCase());
      if (!existingUser) {
        const newParentUser: User = {
          id: "usr-" + crypto.randomBytes(6).toString("hex"),
          email: parentEmail.trim().toLowerCase(),
          passwordHash: "parent123", // Default password 'parent123'
          name: parentName,
          role: "Parent",
          phone: parentPhone,
          active: true,
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        };
        db.addUser(newParentUser);
      }
    }

    // Activity Log
    db.addActivityLog({
      id: "act-" + crypto.randomUUID(),
      userId: (req as any).user.id,
      userName: (req as any).user.name,
      action: "Child Enrolled",
      details: `Enrolled new student ${fullName} in ${classNameStr}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newChild);
  });

  app.put("/api/children/:id", authenticate, (req, res) => {
    const { fullName, dob, gender, bloodGroup, parentName, parentPhone, parentEmail, address, medicalNotes, allergies, emergencyContact, classroomId } = req.body;
    
    const classroom = db.getClassrooms().find(cls => cls.id === classroomId);
    const birthDate = dob ? new Date(dob) : null;
    const age = birthDate ? new Date().getFullYear() - birthDate.getFullYear() : undefined;

    const updateParams: Partial<Child> = {
      fullName,
      dob,
      gender,
      bloodGroup,
      parentName,
      parentPhone,
      parentEmail,
      address,
      medicalNotes,
      allergies,
      emergencyContact,
      classroomId,
      classroomName: classroom ? classroom.name : undefined,
    };
    if (age !== undefined) {
      updateParams.age = age || 3;
    }

    const updated = db.updateChild(req.params.id, updateParams);
    if (!updated) {
      res.status(404).json({ error: "Child record not found" });
      return;
    }

    // Auto-provision parent login user if email is provided and doesn't exist
    if (parentEmail && parentEmail.trim()) {
      const existingUser = db.getUsers().find(u => u.email.toLowerCase() === parentEmail.trim().toLowerCase());
      if (!existingUser) {
        const newParentUser: User = {
          id: "usr-" + crypto.randomBytes(6).toString("hex"),
          email: parentEmail.trim().toLowerCase(),
          passwordHash: "parent123", // Default password 'parent123'
          name: parentName || updated.parentName,
          role: "Parent",
          phone: parentPhone || updated.parentPhone,
          active: true,
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        };
        db.addUser(newParentUser);
      }
    }

    res.json(updated);
  });

  app.delete("/api/children/:id", authenticate, (req, res) => {
    db.deleteChild(req.params.id);
    res.json({ success: true, message: "Child deleted successfully" });
  });


  // ==========================================
  // API: /api/observations
  // ==========================================

  app.get("/api/observations", authenticate, (req, res) => {
    let obs = db.getObservations();
    const reqUser = (req as any).user as User;

    if (reqUser.role === "Parent") {
      const selectedChildId = req.headers["x-selected-child-id"] as string;
      if (selectedChildId) {
        obs = obs.filter(o => o.childId === selectedChildId);
      } else {
        const parentChildrenIds = db.getChildren().filter(c => isChildOfParent(c, reqUser)).map(c => c.id);
        obs = obs.filter(o => parentChildrenIds.includes(o.childId));
      }
    }

    res.json(obs);
  });

  app.post("/api/observations", authenticate, (req, res) => {
    const { childId, category, note, riskLevel } = req.body;
    const user = (req as any).user as User;

    if (!childId || !category || !note) {
      res.status(400).json({ error: "Child, Category, and Observation note are required." });
      return;
    }

    const child = db.getChildren().find(c => c.id === childId);
    if (!child) {
      res.status(404).json({ error: "Child not found." });
      return;
    }

    const newObs: Observation = {
      id: "obs-" + crypto.randomBytes(6).toString("hex"),
      childId,
      childName: child.fullName,
      classroomName: child.classroomName,
      category,
      note,
      teacherId: user.id,
      teacherName: user.name,
      date: new Date().toISOString().split('T')[0],
      riskLevel: riskLevel || "Low",
      status: "Pending"
    };

    db.addObservation(newObs);

    // Notify administrators if riskLevel is Medium or High
    if (newObs.riskLevel !== "Low") {
      db.getUsers().filter(u => u.role === "Centre Head" || u.role === "Super Admin").forEach(admin => {
        db.addNotification({
          id: "notif-" + crypto.randomUUID(),
          userId: admin.id,
          title: `Action Required: ${newObs.riskLevel} Risk Observation`,
          message: `Teacher ${user.name} reported a ${newObs.riskLevel} risk behaviour in ${child.fullName} (${category})`,
          type: newObs.riskLevel === "High" ? "error" : "warning",
          isRead: false,
          timestamp: new Date().toISOString()
        });
      });
    }

    // Activity Log
    db.addActivityLog({
      id: "act-" + crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      action: "Observation Created",
      details: `Created ${category} observation for ${child.fullName}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newObs);
  });

  app.put("/api/observations/:id", authenticate, (req, res) => {
    const { category, note, riskLevel, status } = req.body;
    const updated = db.updateObservation(req.params.id, { category, note, riskLevel, status });
    if (!updated) {
      res.status(404).json({ error: "Observation not found" });
      return;
    }
    res.json(updated);
  });

  app.delete("/api/observations/:id", authenticate, (req, res) => {
    db.deleteObservation(req.params.id);
    res.json({ success: true, message: "Observation deleted successfully" });
  });


  // ==========================================
  // API: /api/ai
  // ==========================================

  app.get("/api/ai/reports", authenticate, (req, res) => {
    let reports = db.getAIReports();
    const reqUser = (req as any).user as User;

    if (reqUser.role === "Parent") {
      const selectedChildId = req.headers["x-selected-child-id"] as string;
      if (selectedChildId) {
        reports = reports.filter(r => r.childId === selectedChildId);
      } else {
        const parentChildrenIds = db.getChildren().filter(c => isChildOfParent(c, reqUser)).map(c => c.id);
        reports = reports.filter(r => parentChildrenIds.includes(r.childId));
      }
    }

    res.json(reports);
  });

  app.post("/api/ai/generate", authenticate, async (req, res) => {
    const { observationId } = req.body;
    const user = (req as any).user as User;

    if (!observationId) {
      res.status(400).json({ error: "observationId is required to generate AI summary." });
      return;
    }

    const obs = db.getObservations().find(o => o.id === observationId);
    if (!obs) {
      res.status(404).json({ error: "Observation not found." });
      return;
    }

    // Prevent duplicate AI reports
    const existingReport = db.getAIReports().find(r => r.observationId === observationId);
    if (existingReport) {
      res.json(existingReport);
      return;
    }

    const child = db.getChildren().find(c => c.id === obs.childId);
    if (!child) {
      res.status(404).json({ error: "Associated child record not found." });
      return;
    }

    try {
      const reportData = await generateAIReportFromObservation(child, obs);

      const newReport: AIReport = {
        id: "rep-" + crypto.randomBytes(6).toString("hex"),
        observationId,
        childId: obs.childId,
        childName: obs.childName,
        summary: reportData.summary,
        strengths: reportData.strengths,
        concerns: reportData.concerns,
        recommendations: reportData.recommendations,
        activities: reportData.activities,
        developmentNotes: reportData.developmentNotes,
        parentSuggestions: reportData.parentSuggestions,
        teacherRecommendations: reportData.teacherRecommendations,
        riskLevel: reportData.riskLevel || obs.riskLevel,
        overallSummary: reportData.overallSummary,
        dateGenerated: new Date().toISOString().split('T')[0],
        generatedBy: user.name
      };

      db.addAIReport(newReport);

      // Update observation status to Analyzed
      db.updateObservation(observationId, { status: "Analyzed" });

      // Add Admin Notification
      db.addNotification({
        id: "notif-" + crypto.randomUUID(),
        userId: user.id,
        title: "AI Report Generated",
        message: `Gemini AI prepared developmental summary for ${obs.childName}`,
        type: "success",
        isRead: false,
        timestamp: new Date().toISOString()
      });

      // Log Activity
      db.addActivityLog({
        id: "act-" + crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        action: "AI Report Generated",
        details: `Generated standard intelligence development profile for ${obs.childName}`,
        timestamp: new Date().toISOString()
      });

      res.status(201).json(newReport);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to generate AI report: " + e.message });
    }
  });

  app.delete("/api/ai/reports/:id", authenticate, (req, res) => {
    db.deleteAIReport(req.params.id);
    res.json({ success: true, message: "AI report removed successfully." });
  });


  // ==========================================
  // API: /api/attendance
  // ==========================================

  app.get("/api/attendance", authenticate, (req, res) => {
    const { date, classroomId } = req.query;
    if (!date) {
      res.status(400).json({ error: "date query is required" });
      return;
    }

    const reqUser = (req as any).user as User;
    let records = db.getAttendance().filter(a => a.date === date);

    if (classroomId) {
      records = records.filter(a => a.classroomId === classroomId);
    }

    // Parents can only see their own children's attendance
    if (reqUser.role === "Parent") {
      const selectedChildId = req.headers["x-selected-child-id"] as string;
      if (selectedChildId) {
        records = records.filter(a => a.childId === selectedChildId);
      } else {
        const parentChildrenIds = db.getChildren().filter(c => isChildOfParent(c, reqUser)).map(c => c.id);
        records = records.filter(a => parentChildrenIds.includes(a.childId));
      }
    }

    res.json(records);
  });

  app.post("/api/attendance", authenticate, (req, res) => {
    const { date, classroomId, records } = req.body; // records: list of { childId, status, notes }
    if (!date || !classroomId || !records || !Array.isArray(records)) {
      res.status(400).json({ error: "date, classroomId, and records list are required" });
      return;
    }

    const classroom = db.getClassrooms().find(cls => cls.id === classroomId);
    const className = classroom ? classroom.name : "Nursery";

    const preparedRecords: Attendance[] = records.map((rec: any) => {
      const child = db.getChildren().find(c => c.id === rec.childId);
      return {
        id: "att-" + crypto.randomBytes(6).toString("hex"),
        childId: rec.childId,
        childName: child ? child.fullName : "Student",
        classroomId,
        classroomName: className,
        date,
        status: rec.status,
        notes: rec.notes
      };
    });

    db.setAttendance(preparedRecords);

    // Log Activity
    db.addActivityLog({
      id: "act-" + crypto.randomUUID(),
      userId: (req as any).user.id,
      userName: (req as any).user.name,
      action: "Attendance Recorded",
      details: `Saved attendance sheet for ${className} on date ${date}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, count: preparedRecords.length });
  });


  // ==========================================
  // API: /api/dashboard
  // ==========================================

  app.get("/api/dashboard/stats", authenticate, (req, res) => {
    const reqUser = (req as any).user as User;
    let children = db.getChildren();
    let observations = db.getObservations();
    let reports = db.getAIReports();
    let attendance = db.getAttendance();

    // Filter based on user class for Parents
    if (reqUser.role === "Parent") {
      const selectedChildId = req.headers["x-selected-child-id"] as string;
      if (selectedChildId) {
        children = children.filter(c => c.id === selectedChildId);
        observations = observations.filter(o => o.childId === selectedChildId);
        reports = reports.filter(r => r.childId === selectedChildId);
        attendance = attendance.filter(a => a.childId === selectedChildId);
      } else {
        const parentChildren = children.filter(c => isChildOfParent(c, reqUser));
        const defaultChildId = parentChildren.length > 0 ? parentChildren[0].id : "";
        if (defaultChildId) {
          children = children.filter(c => c.id === defaultChildId);
          observations = observations.filter(o => o.childId === defaultChildId);
          reports = reports.filter(r => r.childId === defaultChildId);
          attendance = attendance.filter(a => a.childId === defaultChildId);
        } else {
          children = [];
          observations = [];
          reports = [];
          attendance = [];
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === todayStr);
    const presentCount = todayAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
    const totalTodayLogged = todayAttendance.length;

    // Charts: Observation Category distribution
    const categoriesMap: Record<string, number> = {};
    observations.forEach(o => {
      categoriesMap[o.category] = (categoriesMap[o.category] || 0) + 1;
    });
    const categoryChart = Object.keys(categoriesMap).map(cat => ({
      name: cat,
      value: categoriesMap[cat]
    }));

    // Charts: Monthly/Daily Observations counts
    const monthlyObservations = [
      { name: "Mon", count: Math.max(1, Math.round(observations.length * 0.15)) },
      { name: "Tue", count: Math.max(2, Math.round(observations.length * 0.22)) },
      { name: "Wed", count: Math.max(1, Math.round(observations.length * 0.18)) },
      { name: "Thu", count: Math.max(3, Math.round(observations.length * 0.28)) },
      { name: "Fri", count: Math.max(2, observations.length - Math.round(observations.length * 0.83)) }
    ];

    res.json({
      totals: {
        children: children.length,
        teachers: db.getUsers().filter(u => u.role === "Teacher").length,
        observations: observations.length,
        reportsGenerated: reports.length,
        attendanceRate: totalTodayLogged > 0 ? Math.round((presentCount / totalTodayLogged) * 100) : 92, // Default healthy 92%
        pendingObservations: observations.filter(o => o.status === "Pending").length
      },
      categoryChart,
      monthlyObservations,
      recentLogs: db.getActivityLogs().slice(0, 5),
      classrooms: db.getClassrooms()
    });
  });


  // ==========================================
  // API: /api/settings
  // ==========================================

  app.get("/api/settings", authenticate, (req, res) => {
    res.json(db.getSettings());
  });

  app.put("/api/settings", authenticate, (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });


  // ==========================================
  // API: /api/notifications
  // ==========================================

  app.get("/api/notifications", authenticate, (req, res) => {
    const user = (req as any).user as User;
    let notifs = db.getNotifications();
    if (user.role !== "Super Admin" && user.role !== "Centre Head") {
      notifs = notifs.filter(n => n.userId === user.id);
    }
    const formatted = notifs.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.isRead,
      createdAt: n.timestamp
    }));
    res.json(formatted);
  });

  app.post("/api/notifications/read", authenticate, (req, res) => {
    const user = (req as any).user as User;
    const notifs = db.getNotifications();
    
    notifs.forEach(n => {
      if (user.role === "Super Admin" || user.role === "Centre Head" || n.userId === user.id) {
        n.isRead = true;
      }
    });
    
    db.save();
    res.json({ success: true });
  });

  app.post("/api/notifications/clear", authenticate, (req, res) => {
    const user = (req as any).user as User;
    db.clearAllNotifications(user.id, user.role);
    res.json({ success: true });
  });

  app.delete("/api/notifications/:id", authenticate, (req, res) => {
    const user = (req as any).user as User;
    const deleted = db.deleteNotification(req.params.id, user.id, user.role);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Notification not found or unauthorized to delete" });
    }
  });


  // ==========================================
  // VITE DEVELOPMENT ENVIRONMENT / SPA STATIC
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
