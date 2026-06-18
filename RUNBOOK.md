# VMS MVP — Developer Runbook

Local setup, architecture flow, and how to run the system end-to-end.

---

## Project Structure

```
VMS/
├── frontend/               React + Vite + Tailwind (the UI)
│   ├── public/sw.js        Service Worker for push notifications
│   ├── src/
│   │   ├── pages/          One file per screen
│   │   ├── components/     Shared UI pieces
│   │   ├── hooks/          useAuth, useActiveVisitors, useMyVisitors
│   │   ├── lib/
│   │   │   ├── supabase.ts Supabase client
│   │   │   ├── api.ts      Check-in / check-out / badge calls
│   │   │   └── push.ts     Web Push subscription helpers
│   │   └── types/index.ts  Shared TypeScript types
│   └── .env                Frontend environment variables
│
├── backend/                FastAPI (Python) — handles push notifications only
│   ├── main.py             App entry point, CORS, Supabase client
│   ├── models.py           Pydantic request/response models
│   ├── routers/
│   │   ├── push.py         POST /push/subscribe, DELETE /push/subscribe
│   │   └── notify.py       POST /notify/checkin
│   ├── requirements.txt
│   └── .env                Backend environment variables
│
├── supabase/
│   └── schema.sql          Full database schema (run this in Supabase SQL editor)
│
├── VMS_MVP_Plan.md         Product plan and feature scope
└── RUNBOOK.md              This file
```

---

## Architecture Overview

```
                        ┌─────────────────┐
                        │   Supabase      │
                        │  (PostgreSQL)   │
                        │  Auth + Storage │
                        └────────┬────────┘
                                 │ direct SDK calls
                                 │ (check-in, check-out,
                                 │  history, active list)
┌──────────────┐                 │
│   Browser    │─────────────────┘
│  (React App) │
│              │─────── POST /notify/checkin ──────► FastAPI Backend
│              │◄────── Web Push notification ───────     │
└──────────────┘                                          │ pywebpush
                                                          │
                                               Browser Push Service
                                              (Google FCM / Mozilla)
```

**Key principle:** The frontend talks directly to Supabase for all data. FastAPI is only involved for sending push notifications to hosts.

---

## How the System Works (Full Flow)

### 1. Guard Logs In
- Guard opens the app and signs in with email + password
- Supabase Auth handles authentication
- The app reads the user's `role` and `property_id` from the `users` table
- Guards are redirected to `/checkin`, hosts to `/my-visitors`

### 2. Host Logs In (Push Setup)
- When a host signs in, the app requests browser notification permission
- If granted, the browser generates a **push subscription** (endpoint + keys)
- This subscription is saved to `users.push_subscription` via `POST /push/subscribe`
- From this point, the host can receive push notifications even with the tab closed

### 3. Visitor Check-In
1. Guard fills: visitor name, phone, selects host from dropdown, purpose of visit
2. Guard captures a webcam photo (browser `getUserMedia`)
3. Photo is uploaded to **Supabase Storage** (`visitor-photos` bucket)
4. Guard taps **Check In** — visitor record is inserted into the `visitors` table
5. A badge number is auto-generated (format: `VMS-XXXXXX`)
6. The badge print page opens in a new tab automatically
7. Simultaneously, the app calls `POST /notify/checkin` on the FastAPI backend

### 4. Push Notification to Host
1. FastAPI receives the notify request (visitor name + host ID)
2. It fetches the host's `push_subscription` from Supabase (using service role key)
3. `pywebpush` signs and sends the push to the browser's push service (Google/Mozilla)
4. The host's browser receives it and `sw.js` (the Service Worker) displays it as a native OS notification
5. Clicking the notification opens `/my-visitors`
6. If the subscription is expired (410 response), the backend clears it automatically

### 5. Badge Print
- `/badge/:id` fetches visitor data and renders a printable pass
- Guard uses browser `Ctrl+P` / `window.print()` — no PDF library needed
- Pass includes: visitor name, photo, host name, purpose, badge number, check-in time, property name

### 6. Visitor Check-Out
- Guard opens **Active Visitors** (`/active`)
- Real-time list of everyone with no `checked_out_at` timestamp
- Guard taps **Check Out** next to the visitor
- `checked_out_at` is set to current timestamp in Supabase

### 7. History
- `/history` shows all past visits with date filter
- Searchable by visitor name
- Shows in/out times and duration

---

## Environment Variables

### `frontend/.env`
```
VITE_SUPABASE_URL=         # Supabase project URL
VITE_SUPABASE_ANON_KEY=    # Supabase anon/public key
VITE_API_URL=              # FastAPI backend URL (http://localhost:8000 locally)
VITE_VAPID_PUBLIC_KEY=     # VAPID public key (must match backend)
```

### `backend/.env`
```
SUPABASE_URL=              # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Service role key (bypasses RLS — keep secret)
VAPID_PUBLIC_KEY=          # VAPID public key
VAPID_PRIVATE_KEY=         # VAPID private key (base64url encoded PEM)
VAPID_CLAIM_EMAIL=         # mailto:you@example.com
FRONTEND_URL=              # Allowed CORS origin (http://localhost:5173 locally)
```

---

## First-Time Supabase Setup

1. Go to your Supabase project → **SQL Editor**
2. Paste and run the full contents of `supabase/schema.sql`
3. Go to **Storage** → create a bucket named `visitor-photos`
4. Set the bucket to **Public** (so photo URLs are accessible without auth)

---

## Running Locally

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload
# Runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

Both must be running at the same time for the full flow to work.

---

## API Endpoints

| Method | Endpoint | Who calls it | Purpose |
|---|---|---|---|
| `POST` | `/push/subscribe` | Frontend (on host login) | Store host's browser push subscription |
| `DELETE` | `/push/subscribe?user_id=` | Frontend (on host logout) | Remove push subscription |
| `POST` | `/notify/checkin` | Frontend (after check-in) | Send push notification to host |
| `GET` | `/health` | Anyone | Health check |
| `GET` | `/docs` | Developer | Auto-generated API docs (Swagger UI) |

---

## User Roles

| Role | Can do |
|---|---|
| `guard` | Check in visitors, check out visitors, print badge, view active list, view history |
| `host` | View their own visitors (`/my-visitors`), receive push notifications on arrival |
| `admin` | Same as guard + future: manage user accounts |

---

## VAPID Keys (Web Push Identity)

VAPID keys prove to browser push services (Google, Mozilla) that notifications come from your server.

- Generated **once** — regenerating invalidates all existing subscriptions
- **Public key** → stored in frontend `.env` + used when host subscribes
- **Private key** → stored in backend `.env` only, used to sign push requests
- Never commit either key to git (both `.env` files are in `.gitignore`)

---

## Deployment (When Ready)

| Layer | Service | Notes |
|---|---|---|
| Frontend | Vercel | Connect GitHub repo, set env vars in Vercel dashboard |
| Backend | Render or Railway | Point to `backend/` folder, set env vars, start command: `uvicorn main:app --host 0.0.0.0 --port 8000` |
| Database | Supabase | Already hosted |

After deploying:
- Update `VITE_API_URL` in Vercel to point to the live backend URL
- Update `FRONTEND_URL` in backend env to the live Vercel URL
