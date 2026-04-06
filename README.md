# MedLicense Pro
### Medical License Authority System

---

## How to Run (Step by Step)

### Requirements
- [Node.js](https://nodejs.org/) version 14 or higher — download and install if you haven't already.
- VS Code (already installed)

---

### Step 1 — Open the folder in VS Code
Open VS Code → **File → Open Folder** → select the `MedLicensePro` folder.

---

### Step 2 — Open the Terminal in VS Code
Go to **Terminal → New Terminal** (or press `` Ctrl + ` ``).

---

### Step 3 — Install dependencies
In the terminal, type:
```
npm install
```
Wait for it to finish (only needed the first time).

---

### Step 4 — Start the server
```
npm start
```

---

### Step 5 — Open in browser
Open your browser and go to:
```
http://localhost:3000
```

---

## Demo Login Credentials

| Role          | Username    | Password    |
|---------------|-------------|-------------|
| Administrator | admin       | Admin@123   |
| Doctor        | dr.arjun    | Doctor@123  |
| Doctor        | dr.priya    | Doctor@123  |
| Doctor        | dr.ravi     | Doctor@123  |

> **Public Verification** — no login needed, select "Public Verification" role.

---

## Project Structure

```
MedLicensePro/
├── backend/
│   └── server.js         ← Node.js/Express server
├── frontend/
│   ├── index.html        ← Main HTML page
│   ├── css/
│   │   └── style.css     ← All styles
│   └── js/
│       └── app.js        ← All application logic
├── package.json          ← Project config & dependencies
└── README.md             ← This file
```

---

## To Stop the Server
Press `Ctrl + C` in the terminal.
