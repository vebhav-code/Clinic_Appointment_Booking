# PulseClinic — Precision Clinic Appointment Booking System

A production-grade full-stack clinic appointment booking platform engineered from scratch for high concurrency, zero double-booking guarantees, strict server-side validation, and instant responsive feedback.

---

## 🌟 Live Demo & Quick Links
- **Frontend Web App (Local):** [http://localhost:5173](http://localhost:5173) *(or Vercel deployment)*
- **Interactive OpenAPI Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health Check Endpoint:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 🔑 Demo Logins Table

The database seed command (`python -m app.seed`) pre-populates 4 doctors across diverse medical specialities and 3 patients with relative appointments and scheduled leaves:

| Role | Name | Email | Speciality & Weekly Schedule | Demo Password |
| :--- | :--- | :--- | :--- | :--- |
| **DOCTOR** | Dr. Arvind Sharma | `dr.sharma@clinic.com` | General Physician (15-min slots, Mon–Fri 09:00–13:00) | `DemoPassword123!` |
| **DOCTOR** | Dr. Priya Nair | `dr.nair@clinic.com` | Dermatologist (30-min slots, Mon–Sat 10:00–13:00 + 17:00–20:00, Future Leave) | `DemoPassword123!` |
| **DOCTOR** | Dr. Rajesh Kothari | `dr.kothari@clinic.com` | Cardiologist (30-min slots, Tue/Thu/Sat 14:00–18:00) | `DemoPassword123!` |
| **DOCTOR** | Dr. Meera Desai | `dr.desai@clinic.com` | Pediatrician (30-min slots, Mon–Fri 09:30–12:30 + 16:00–18:30) | `DemoPassword123!` |
| **PATIENT** | Rohan Verma | `rohan.patient@example.com` | Patient with upcoming & past visits | `DemoPassword123!` |
| **PATIENT** | Ananya Iyer | `ananya.patient@example.com` | Patient with upcoming visit | `DemoPassword123!` |
| **PATIENT** | Vikram Patel | `vikram.patient@example.com` | New patient account | `DemoPassword123!` |

*(Patients can also self-register at any time from the web application's Register screen).*

---

## 📐 Data Model & Architecture Decisions

```mermaid
erDiagram
    users ||--o| doctor_profiles : "1:1 profile"
    users ||--o{ availability_rules : "has recurring windows"
    users ||--o{ doctor_leaves : "blocks dates"
    users ||--o{ appointments : "participates (patient/doctor)"
    users ||--o{ reminders : "receives"
    appointments ||--o{ reminders : "triggers"

    users {
        int id PK
        string email UK
        string password_hash
        string full_name
        string role "patient | doctor"
        string phone
        timestamptz created_at
    }

    doctor_profiles {
        int user_id PK, FK
        string speciality
        text bio
        string qualifications
        int years_of_experience
        json languages
        int slot_minutes "15 | 30"
        numeric consultation_fee
        boolean is_active
    }

    availability_rules {
        int id PK
        int doctor_id FK
        int weekday "0=Mon .. 6=Sun"
        time start_time
        time end_time
    }

    doctor_leaves {
        int id PK
        int doctor_id FK
        date date
        text reason
    }

    appointments {
        int id PK
        int patient_id FK
        int doctor_id FK
        timestamptz start_at
        timestamptz end_at
        string status "booked | completed | no_show | cancelled"
        text reason
        timestamptz created_at
        timestamptz cancelled_at
        int cancelled_by FK
        timestamptz email_reminder_sent_at
    }

    reminders {
        int id PK
        int user_id FK
        int appointment_id FK
        timestamptz remind_at
        timestamptz read_at
    }
```

### 1. Dual PostgreSQL EXCLUDE Constraints (Zero Double-Booking)
- **Doctor Overlap Guard:** We enable the PostgreSQL `btree_gist` extension and enforce an exclusion constraint on `(doctor_id, tstzrange(start_at, end_at))` for active statuses (`booked`, `completed`, `no_show`).
  ```sql
  ALTER TABLE appointments
  ADD CONSTRAINT exclude_doctor_overlapping_appointments
  EXCLUDE USING gist (
      doctor_id WITH =,
      tstzrange(start_at, end_at) WITH &&
  )
  WHERE (status IN ('booked', 'completed', 'no_show'));
  ```
- **Patient Overlap Guard:** To prevent a patient from accidentally or maliciously holding two overlapping consultations across different doctors simultaneously:
  ```sql
  ALTER TABLE appointments
  ADD CONSTRAINT exclude_patient_overlapping_appointments
  EXCLUDE USING gist (
      patient_id WITH =,
      tstzrange(start_at, end_at) WITH &&
  )
  WHERE (status IN ('booked', 'completed', 'no_show'));
  ```
- **Half-Open Intervals:** `tstzrange` treats intervals as `[start, end)`. Back-to-back slots (e.g. `10:00–10:30` and `10:30–11:00`) do not overlap, but concurrent requests for the identical slot raise an immediate Postgres `ExclusionViolation`.
- **Integrity Handling:** The API catches SQLAlchemy `IntegrityError` and returns `409 Conflict` with `SLOT_ALREADY_TAKEN`. The frontend catches this code, automatically refreshes available slots, and alerts the patient.

### 2. Clinic Timezone vs. UTC Storage
- Timestamps in the database and JSON responses are strictly stored in UTC (`timestamptz`).
- Weekdays (`0` = Monday to `6` = Sunday), slot slicing, and "today" calculations are performed in `CLINIC_TIMEZONE` (default `Asia/Kolkata`) using Python 3.9+ `zoneinfo.ZoneInfo`. This eliminates day-shift bugs across UTC midnight boundaries.
- The frontend uses `Intl.DateTimeFormat` with `timeZone: 'Asia/Kolkata'` in `src/utils/dateUtils.js` and strictly avoids `toISOString().split('T')[0]`.

### 3. Pure On-The-Fly Slot Generator
- Slots are generated on the fly by a pure function:
  `generate_slots_for_date(date, windows, slot_minutes, booked_intervals, is_on_leave, now_utc, buffer_minutes)`
- Partial trailing slots (e.g. 10:00–10:40 with 30m slots -> only 10:00–10:30) are dropped.
- Slots with `start_at <= now` are never returned.
- Blocked leave days return zero slots.
- Cancelled appointments automatically free their slot for booking.
- On booking, the server re-validates that the requested `start_at` matches an exact free slot generated on the fly (never trusting client parameters).

### 4. Atomic Rescheduling & State Transitions
- Rescheduling cancels the old appointment and books the new slot in a **single database transaction** with `SELECT ... FOR UPDATE` row locks. If the new slot fails (e.g. taken concurrently), the transaction rolls back cleanly, keeping the old appointment intact.
- Both cancellation and rescheduling are blocked within 2 hours of the appointment start (`CANCEL_CUTOFF_HOURS=2`).
- Doctor status transitions (`completed`, `no_show`) are restricted to the appointment's doctor, require `status == 'booked'`, and can only be invoked after the appointment start time has passed.

### 5. In-App Notifications & Background Reminders
- **In-App Bell:** The `/api/v1/reminders` endpoint calculates due reminders within 1 hour on-demand. The frontend polls this endpoint every 60 seconds with an unread badge and mark-as-read action.
- **Idempotent CLI Reminders:** `python -m app.send_reminders` can be run periodically via Windows Task Scheduler or cron. It queries appointments starting in `[now, now + 1h]` where `email_reminder_sent_at IS NULL`, delivers email via SMTP when `EMAIL_REMINDERS_ENABLED=true`, records the sent timestamp in the database, and exits with code 0 without crashing if SMTP is disabled or unconfigured.

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 14+ (or Render PostgreSQL internal/external URL)

---

### Step 1: Clone & Configure Environment

1. Copy `.env.example` to `.env` at the project root:
   ```powershell
   # Windows (PowerShell)
   Copy-Item .env.example .env
   ```
   ```bash
   # macOS / Linux
   cp .env.example .env
   ```

2. Note on Database URL:
   - For Render internal links: they resolve inside Render's internal network. For local development outside Render, set `DEV_DATABASE_URL` and `TEST_DATABASE_URL` pointing to your local PostgreSQL instance (with `btree_gist` extension available).
   - Backend auto-normalizes connection strings to `postgresql+psycopg://`.

---

### Step 2: Backend Setup (Windows PowerShell & macOS/Linux)

#### Windows (PowerShell):
```powershell
# 1. Activate the existing root virtual environment
.\venv\Scripts\Activate.ps1

# 2. Install pinned dependencies
pip install -r backend\requirements.txt

# 3. Run database migrations to the latest revision
cd backend
alembic upgrade head

# 4. Seed the database (idempotent, safe)
python -m app.seed

# 5. Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### macOS / Linux:
```bash
# 1. Activate root virtual environment
source venv/bin/activate

# 2. Install pinned dependencies
pip install -r backend/requirements.txt

# 3. Run database migrations
cd backend
alembic upgrade head

# 4. Seed the database
python -m app.seed

# 5. Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API server will run at `http://127.0.0.1:8000`. Swagger documentation is available at `http://127.0.0.1:8000/docs`.

---

### Step 3: Frontend Setup

Open a second terminal:

#### Windows (PowerShell):
```powershell
cd frontend
npm install
npm run dev
```

#### macOS / Linux:
```bash
cd frontend
npm install
npm run dev
```

The web application is live at `http://localhost:5173`.

---

### Step 4: Run Tests

The test suite runs **strictly against `TEST_DATABASE_URL`** (refusing execution if it equals the production `DATABASE_URL` to protect live data). It tests real PostgreSQL exclusion constraints, concurrent threads, time travel, and role access:

#### Windows (PowerShell):
```powershell
# From project root:
.\venv\Scripts\pytest backend\tests -v
```

#### macOS / Linux:
```bash
source venv/bin/activate
pytest backend/tests -v
```

All 27 test cases pass with 100% clean assertions.

---

### Step 5: Send Reminders Script (CLI)

To test the background reminder dispatch command:
```powershell
# Windows (PowerShell)
cd backend
..\venv\Scripts\python.exe -m app.send_reminders
```
```bash
# macOS / Linux
cd backend
python -m app.send_reminders
```

---

## 📡 API Overview Summary Table

All endpoints are versioned under `/api/v1`:

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Health check & timezone status |
| `POST` | `/api/v1/auth/register` | Public | Patient registration with rate limiting |
| `POST` | `/api/v1/auth/login` | Public | JWT login with rate limiting |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current user profile & role |
| `GET` | `/api/v1/doctors` | Public / Auth | List doctors (search, speciality, next available slot) |
| `GET` | `/api/v1/doctors/{id}` | Public / Auth | Doctor profile, weekly rules & consultation fee |
| `GET` | `/api/v1/doctors/{id}/slots` | Public / Auth | Free on-the-fly generated slots on `?date=YYYY-MM-DD` |
| `POST` | `/api/v1/appointments` | Patient | Book appointment (re-validates slot on the fly) |
| `GET` | `/api/v1/appointments?scope=upcoming\|past` | Patient | Patient's consultations with badges & cutoff flags |
| `POST` | `/api/v1/appointments/{id}/cancel` | Patient | Cancel appointment (rejected within 2 hours) |
| `POST` | `/api/v1/appointments/{id}/reschedule` | Patient | Atomic reschedule (old kept intact if new slot fails) |
| `GET` | `/api/v1/doctor/availability` | Doctor | Doctor's recurring weekly availability windows |
| `PUT` | `/api/v1/doctor/availability` | Doctor | Update weekly windows & slot length (15/30 min) |
| `GET` | `/api/v1/doctor/leaves` | Doctor | List doctor's blocked leave dates |
| `POST` | `/api/v1/doctor/leaves` | Doctor | Block single day off (rejected with 409 if booked appts exist) |
| `DELETE` | `/api/v1/doctor/leaves/{id}` | Doctor | Unblock day off and restore availability |
| `GET` | `/api/v1/doctor/appointments/today` | Doctor | Today's appointments in time order |
| `GET` | `/api/v1/doctor/appointments?date=` | Doctor | Schedule for a specific date |
| `PATCH` | `/api/v1/doctor/appointments/{id}/status` | Doctor | Mark appointment as `completed` or `no_show` |
| `GET` | `/api/v1/reminders` | Authenticated | In-app reminders due within 1 hour |
| `POST` | `/api/v1/reminders/{id}/read` | Authenticated | Mark reminder notification as read |

---

## 🎨 Design & Aesthetic Features

- **Palette:** Modern clinical aesthetic with calm teal primary (`#0d9488`), dark teal accents (`#115e59`), neutral slate backgrounds (`#f8fafc`), and WCAG AA contrast.
- **Typography:** Modern Google Fonts Inter paired with monospace indicators for IDs, dates, and badges.
- **Responsive Navigation:** Desktop navbar with animated Framer Motion layout pill transitions; sticky mobile bottom navigation for viewports `< 640px` with touch targets $\ge 44\text{px}$.
- **Smart Date Math:** Fully timezone-aware date pickers and day offsets formatted through `Intl.DateTimeFormat`.
- **User Experience:** Instant skeleton loading states, toasts for API errors, explicit 2-hour cutoff indicators with disabled buttons and tooltip explanations, and split morning/afternoon/evening slot cards.

---

## 📋 What is Finished, What is Not, and Future Improvements

### ✅ What is Finished & Verified (100% Requirements)
1. **Zero Double Booking:** PostgreSQL `EXCLUDE USING gist` constraints on both `doctor_id` and `patient_id` with `tstzrange(start_at, end_at)` for active statuses.
2. **Pure Slot Generator:** Deterministic slot slicing with dropped partial slots, past slot suppression, 60-day booking window, and leave day masking.
3. **Atomic Reschedule:** Old appointment cancelled and new appointment booked in a single database transaction with `FOR UPDATE` row locks.
4. **2-Hour Cutoff Rule:** Server-side block on cancellation and rescheduling within 2 hours (`CANCEL_CUTOFF_HOURS=2`).
5. **Doctor Workflow:** Today's schedule in time order, status transitions (`completed`, `no_show`) only after start time, weekly availability editor (15/30 min, multiple windows, overlap rejection), and single day leave blocks.
6. **Reminders:** Dual system featuring on-demand in-app reminder polling (`/api/v1/reminders`) and idempotent CLI runner (`python -m app.send_reminders`).
7. **27 Passing Pytest Tests:** Concurrency threads, patient overlaps, freeze time boundaries, leave day slot elimination, 15 vs 30 min slicing, atomic reschedule, role security, and reminder boundaries.
8. **Security & Secrets:** Root `.env` protected, `.gitignore` strictly enforced, passwords and real URLs excluded from repo and commits, ruff clean.

### ⏳ What is Not Included
- **Third-Party SMS/WhatsApp Notifications:** In-app notifications and SMTP email delivery are fully supported; external SMS gateways (e.g. Twilio) were not part of the initial specification.
- **Online Payment Gateway:** Consultation fees are tracked in profiles, but credit card gateway checkout (Stripe/Razorpay) was not required.

### 🔮 What I Would Do With More Time
- **WebSockets / Server-Sent Events:** Live broadcast of newly booked slots to other active browsers looking at the same calendar date.
- **Bi-weekly / Alternating Schedules:** Support alternating week schedules (e.g. 1st and 3rd Saturdays off).
- **Calendar Synchronization:** Direct sync with Google Calendar and Apple Calendar via WebCal feeds.

---

## 🤖 AI Disclosure & Usage

- **AI Tools Used:** Google Gemini via Antigravity IDE assistant.
- **What AI Assisted With:**
  - Synthesizing PostgreSQL `btree_gist` exclusion constraints with Alembic migrations.
  - Multi-threaded concurrency test harness design using Python's `concurrent.futures`.
  - Frontend scaffolding with Vite, React Router, and Framer Motion micro-interactions.
- **What Was Human-Engineered & Verified:**
  - Verification of timezone conversions between UTC storage and `Asia/Kolkata` clinic calendar days.
  - Deterministic slot slicing algorithm edge cases (partial slot truncation, boundary tests).
  - Strict security audits ensuring zero credential leakage in logs or tracked files.
