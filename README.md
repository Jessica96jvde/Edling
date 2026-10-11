# EDLING - Counseling Platform

A simple counseling platform where students can book sessions with counselors.

## Project Structure

```
edling_project/
├── frontend/           # All website files (HTML, CSS, JS)
├── backend/           # Server and database files
└── README.md         # This file
```

## Quick Start

### 1. Setup Backend (Server)
```bash
cd backend
npm install
node init-db.js
npm start
```

### 2. Open Website
Go to: `http://localhost:3000`

## Initial Accounts

Before running `node init-db.js`, set `INITIAL_STUDENT_PASSWORD`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_COUNSELOR1_PASSWORD`, and `INITIAL_COUNSELOR2_PASSWORD` in `backend/.env`. Choose strong values and keep `.env` private; all seeded students use the configured student password. Change bootstrap passwords before production use.

The initialization script deletes existing users and sessions before seeding. Only run it against a fresh or disposable database.

## What Each Role Can Do

- **Students**: View and register for counseling sessions, give feedback
- **Counselors**: Manage their sessions and view student feedback
- **Admins**: Oversee all sessions and users

## Tech Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MongoDB

## Need Help?

1. Make sure MongoDB is running
2. Check if all packages are installed (`npm install`)
3. Make sure you're in the `backend` folder when running commands