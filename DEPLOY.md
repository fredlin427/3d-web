# QEH 3D Printing Office — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│  qeh.home (Intranet Server)     │     │  Internal PC (Tiffany/Matthew)   │
│                                 │     │                                  │
│  /userweb/3dprint/intranet/     │     │  qeh-3d-print-portable\          │
│  ├── index.html                 │     │  ├── node.exe (portable)         │
│  ├── apply.html    ───POST──►   │     │  ├── server.js (Next.js)        │
│  └── style.css                  │     │  ├── dev.db (SQLite)             │
│                                 │     │  └── start.bat                   │
│  (static HTML only)             │     │                                  │
│                                 │     │  Runs on: http://10.146.x.x:3000 │
└─────────────────────────────────┘     └──────────────────────────────────┘
```

- **qeh.home** hosts the public apply form (static HTML page)
- **Internal PC** runs the full Next.js backend + admin dashboard
- Apply form submits data via POST to the internal PC's IP
- Admin staff access the dashboard directly on the internal PC or via LAN

---

## Part A: Deploy Backend (Internal PC)

### Prerequisites
- Windows 10/11 (any version)
- No software installation required (Node.js is bundled inside)
- PC must remain powered on and connected to HA LAN
- Recommend: fixed IP or hostname

### Step 1: Get the Package

**Option 1 — Download from GitHub**
```
https://github.com/fredlin427/3d-web/releases/latest
Download: qeh-3d-print-portable.zip
```

**Option 2 — USB Transfer**
Copy `qeh-3d-print-portable.zip` from development computer via USB drive.

### Step 2: Extract and Run
```
1. Extract ZIP to: C:\QEH-3D-Print\  (or any folder)
2. Double-click start.bat
3. Server starts on http://localhost:3000 and LAN IP
```

### Step 3: Get the IP Address
The startup script displays the LAN IP automatically:
```
============================================
  QEH 3D Printing Office
  Local:   http://localhost:3000
  Network: http://10.146.1.75:3000    ← Use this IP
============================================
```

### Step 4: Keep It Running 24/7

**Option A — Just don't close the window**
The command prompt window must stay open. Minimize it, don't close it.

**Option B — Windows Task Scheduler (auto-start on boot)**
```
1. Open Task Scheduler
2. Create Basic Task
   - Name: QEH 3D Print Server
   - Trigger: When the computer starts
   - Action: Start a program
   - Program: C:\QEH-3D-Print\start.bat
   - Check: "Run whether user is logged on or not"
3. Done — server starts automatically after reboot
```

**Option C — Create shortcut in Startup folder**
```
1. Press Win+R, type: shell:startup
2. Create shortcut to: C:\QEH-3D-Print\start.bat
3. Server auto-starts when user logs in
```

### Step 5: Fixed IP (important!)

HA LAN uses DHCP — the IP may change. Ask IT to:
- Assign a fixed IP to this computer, OR
- Register a hostname in DNS (e.g., `qeh-3dprint.ha.local`)

If the IP changes, the apply form will break. Update the IP in `apply.html` and restart.

---

## Part B: Deploy Apply Form (Intranet Server)

### Prerequisites
- Access to `qeh.home` server (likely via network share `\\qeh.home\userweb\3dprint\intranet\`)
- The intranet server only serves static files (HTML, CSS)

### Step 1: Create the Apply Page

Create `apply.html` in `\\qeh.home\userweb\3dprint\intranet\`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QEH 3D Printing — Application Form</title>
  <style>
    /* Paste the compiled CSS from the project here, or link to style.css */
  </style>
</head>
<body>
  <form id="apply-form">
    <!-- Form fields matching the internal apply form -->
    <!-- The form should POST to the backend server IP -->
  </form>
  <script>
    const API = "http://10.146.1.75:3000/api/apply"; // ← UPDATE THIS IP
    document.getElementById("apply-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        alert("Application submitted successfully!");
        e.target.reset();
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Submission failed"));
      }
    });
  </script>
</body>
</html>
```

### Step 2: Alternative — Export from the App

A cleaner approach: the `/apply` page is already built inside the app. You can:

1. Open `http://10.146.1.75:3000/apply` on the internal PC
2. Save the page as HTML (Ctrl+S)
3. Edit the saved HTML — change all `action` URLs from relative to absolute:
   - `/api/apply` → `http://10.146.1.75:3000/api/apply`
   - `/api/settings` → `http://10.146.1.75:3000/api/settings`
4. Upload the modified HTML to the intranet server

### Step 3: Test
1. Open `https://qeh.home/userweb/3dprint/intranet/apply.html` on any HA LAN computer
2. Fill in and submit the form
3. Check `http://10.146.1.75:3000/cases` — the new case should appear

---

## Part C: Update Process

When you need to deploy a new version:

### On the development computer
```batch
# 1. Make code changes
# 2. Run the package builder:
package.bat

# 3. This creates: qeh-3d-print-portable.zip
```

### On the internal PC
```batch
# 1. Stop the server (close the command window or Ctrl+C)
# 2. Delete old files EXCEPT dev.db (keep the database!)
# 3. Extract new ZIP to the same folder
# 4. If dev.db was replaced, restore the backup
# 5. Double-click start.bat
```

### Database Backup (do this regularly!)
```batch
# Copy the database file to a safe location
copy C:\QEH-3D-Print\dev.db  C:\Backups\qeh-db-%date:~-4,4%%date:~-7,2%%date:~-10,2%.db
```

---

## Part D: Troubleshooting

| Problem | Solution |
|---------|----------|
| Server won't start | Check the command window for error messages |
| Port 3000 already in use | Edit `start.bat`, change `PORT=3000` to another port |
| Apply form can't connect | Check the IP in apply.html matches the server IP |
| IP changed after reboot | Ask IT for fixed IP; update apply.html |
| Database corrupted | Restore from backup: copy saved dev.db back to deploy folder |
| "CORS error" in browser console | Server middleware is enabled; make sure you're using the latest build |
| PC rebooted, server stopped | Set up Task Scheduler auto-start (see Part A, Step 4) |

---

## Quick Reference

| Item | Value |
|------|-------|
| GitHub | `https://github.com/fredlin427/3d-web` |
| Release Download | `https://github.com/fredlin427/3d-web/releases/latest` |
| Backend Server | `http://[internal-pc-ip]:3000` |
| Intranet Apply Form | `https://qeh.home/userweb/3dprint/intranet/apply.html` |
| CORS | Enabled (middleware) |
| Database | SQLite (`dev.db` in deploy folder) |
| Node.js | Bundled portable v24.16.0 (no install needed) |
