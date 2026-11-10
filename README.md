# Clinic Appointment Booking System

A full-stack, production-ready clinic appointment booking application engineered for high concurrency, zero double-booking guarantees, strict server-side validation, and timezone-accurate scheduling.

---

## 1. Overview & Tech Stack

### Overview
The Clinic Appointment Booking platform provides multi-doctor clinic scheduling with deterministic slot generation, PostgreSQL-backed concurrency controls, atomic rescheduling, doctor leave management, and real-time in-app and background reminders.

### Tech Stack
- **Backend:**
  - **Framework:** FastAPI (Python 3.11+)
  - **ORM & Data Layer:** SQLAlchemy 2.0 (declarative mapped columns)
  - **Migrations:** Alembic
  - **Database Driver:** `psycopg` (version 3) with connection pooling
  - **Database:** PostgreSQL 14+ with `btree_gist` extension for exclusion constraints
  - **Configuration & Validation:** Pydantic v2 & Pydantic-Settings
  - **Authentication:** OAuth2 password flow with JWT bearer tokens (HS256) and passlib / argon2 hashing
- **Frontend:**
  - **Framework & Runtime:** React 19 + Vite
  - **Routing:** React Router v7
  - **Animations & Transitions:** Framer Motion
  - **Icons:** Lucide React
  - **Styling:** Modern CSS custom properties with responsive flex/grid layouts and accessible touch targets

---

## 2. Setup and Run Guide

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 18.x or higher and `npm`
- **PostgreSQL:** 14 or higher (must support the `btree_gist` extension)

---

### Step-by-Step Setup

#### 1. Create PostgreSQL Databases
Connect to PostgreSQL via `psql` or your database manager and create two distinct databases:
```sql
CREATE DATABASE clinic_db;
CREATE DATABASE clinic_test_db;
```

#### 2. Copy Environment Files
From the project root:
```bash
# Copy root backend configuration
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Configure your database credentials inside `.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/clinic_db
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/clinic_test_db
JWT_SECRET=your-random-32-plus-character-secret-key-goes-here
ENVIRONMENT=development
CLINIC_TIMEZONE=Asia/Kolkata
```

#### 3. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Run Alembic migrations to create tables and GiST exclusion constraints
cd backend
alembic upgrade head

# Seed the database with demo doctors, patients, rules, and appointments
python -m app.seed

# Start the FastAPI backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- API Health Status: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

#### 4. Frontend Setup
In a separate terminal:
```bash
cd frontend

# Copy frontend environment variables
cp .env.example .env

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The client application will start at [http://localhost:5173](http://localhost:5173).

---

## 3. Demo Logins Table

All demo accounts use the standard password: `DemoPassword123!`

### Doctors (12 Specialities)
| Name | Email | Speciality | Slot Length | Weekly Working Windows |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Arvind Sharma** | `dr.sharma@clinic.com` | General Physician | 15 min | Mon–Sat: 09:00–12:30, 16:30–19:30 |
| **Dr. Priya Nair** | `dr.nair@clinic.com` | Dermatologist | 30 min | Mon–Sat: 10:00–13:00, 17:00–20:00 |
| **Dr. Rajesh Kothari** | `dr.kothari@clinic.com` | Cardiologist | 30 min | Mon–Sat: 10:30–13:30, 18:00–21:00 |
| **Dr. Meera Desai** | `dr.desai@clinic.com` | Pediatrician | 15 min | Tue–Sun: 09:30–13:00, 16:00–19:00 |
| **Dr. Rohan Mukherjee** | `dr.mukherjee@clinic.com` | Orthopedic Surgeon | 30 min | Mon–Fri: 10:00–13:30, 16:00–19:00 |
| **Dr. Sunita Reddy** | `dr.reddy@clinic.com` | Gynecologist | 30 min | Mon–Sat: 09:00–13:00, 17:00–19:30 |
| **Dr. Vikram Singhania** | `dr.singhania@clinic.com` | Neurologist | 30 min | Mon–Fri: 11:00–14:00, 17:30–20:30 |
| **Dr. Ananya Sengupta** | `dr.sengupta@clinic.com` | Psychiatrist | 30 min | Tue–Sat: 10:00–13:00, 15:30–19:00 |
| **Dr. Farhan Qureshi** | `dr.qureshi@clinic.com` | ENT Specialist | 15 min | Mon–Sat: 09:30–13:00, 16:30–19:30 |
| **Dr. Kavita Joshi** | `dr.joshi@clinic.com` | Ophthalmologist | 15 min | Mon–Sat: 10:00–13:30, 17:00–20:00 |
| **Dr. Amitav Banerjee** | `dr.banerjee@clinic.com` | Gastroenterologist | 30 min | Mon–Fri: 10:00–14:00, 18:00–21:00 |
| **Dr. Neha Kapoor** | `dr.kapoor@clinic.com` | Pulmonologist | 30 min | Mon–Sat: 09:00–12:30, 16:00–19:00 |

### Patients
| Name | Email | Notes |
| :--- | :--- | :--- |
| **Rohan Verma** | `rohan.patient@example.com` | Patient with upcoming and past appointments |
| **Ananya Iyer** | `ananya.patient@example.com` | Patient with active appointments |
| **Vikram Patel** | `vikram.patient@example.com` | Patient with active appointments |

*(New patients can also register dynamically from the web frontend).*

---

## 4. Running Tests

The test suite runs against a real PostgreSQL database to rigorously test GiST exclusion locks, concurrent booking requests, time zone boundaries, and atomic database rollbacks.

### Safety Verification
To prevent accidental data loss, the test runner enforces that `TEST_DATABASE_URL` is set and strictly distinct from `DATABASE_URL` and `DEV_DATABASE_URL`. If they match or if `TEST_DATABASE_URL` is not set, pytest will abort immediately.

### Execute Pytest
Ensure your test database exists (`createdb clinic_test_db`), then run:
```bash
# From project root:
pytest backend/tests -v

# Or on Windows using venv:
.\venv\Scripts\pytest backend\tests -v
```

---

## 5. Data Model

```mermaid
erDiagram
    users ||--o| doctor_profiles : "1:1 profile"
    users ||--o{ availability_rules : "defines weekly windows"
    users ||--o{ doctor_leaves : "blocks calendar days"
    users ||--o{ appointments : "participates (patient/doctor)"
    users ||--o{ reminders : "receives"
    appointments ||--o{ reminders : "linked to"

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

### Key Relations & Constraints
1. **`users`:** Central identity table containing authentication credentials, personal contact info, and roles (`patient` or `doctor`).
2. **`doctor_profiles`:** One-to-one extension of `users` for doctors, defining slot duration (`15` or `30` minutes), consultation fee, and professional credentials.
3. **`availability_rules`:** Foreign key to `users(id)`. Defines recurring weekly operational windows per doctor by integer weekday (`0` = Monday to `6` = Sunday) and local times `[start_time, end_time)`.
4. **`doctor_leaves`:** Foreign key to `users(id)`. Doctor-specific full-day leaves that completely suppress slot generation on specified calendar dates.
5. **`appointments`:** Links `patient_id` and `doctor_id` with UTC `start_at` and `end_at` timestamps. Enforces dual PostgreSQL exclusion constraints on `(doctor_id, tstzrange)` and `(patient_id, tstzrange)` across active statuses (`booked`, `completed`, `no_show`).
6. **`reminders`:** In-app notification records linking recipients (`user_id`) to `appointments(id)` with delivery (`remind_at`) and acknowledgement (`read_at`) timestamps.

---

## 6. Design Decisions

### 1. UTC Timestamps & Clinic Timezone Math
- **Storage:** All appointment start and end times are stored in UTC (`timestamptz`).
- **Slot Math:** Weekday matching (`0` = Monday to `6` = Sunday), slot generation, and calendar day grouping are computed strictly within the clinic reference timezone (`Asia/Kolkata`) using Python 3.9+ `zoneinfo.ZoneInfo`. This eliminates day-shift bugs across UTC midnight boundaries.

### 2. Dual PostgreSQL GiST Exclusion Constraints
- Double-booking guarantees are enforced at the database storage engine layer using PostgreSQL `btree_gist` exclusion constraints:
  - `exclude_doctor_overlapping_appointments`: Guarantees a doctor cannot have overlapping active appointments.
  - `exclude_patient_overlapping_appointments`: Guarantees a patient cannot hold two concurrent appointments across different doctors.
- Active appointment statuses (`booked`, `completed`, `no_show`) are protected; `cancelled` appointments release their time range instantly.
- The service layer re-validates requested slots and cleanly maps database `IntegrityError` (and concurrent GiST lock resolutions) to HTTP `409 Conflict` with `SLOT_ALREADY_TAKEN`.

### 3. Atomic Reschedule in a Single Transaction
- Rescheduling cancels the current appointment and creates the new booking inside one atomic transaction.
- Row-level locks (`SELECT ... FOR UPDATE`) protect against concurrent modifications.
- If the new slot fails (e.g. taken concurrently or invalid), the entire transaction rolls back and the patient's existing appointment remains intact.

### 4. 2-Hour Cancellation & Reschedule Cutoff
- Server-side validation strictly prevents patients from cancelling or rescheduling an appointment within 2 hours of its start time (`CANCEL_CUTOFF_HOURS=2`).
- The frontend surfaces countdown badges and disables action triggers with explanatory tooltips when the cutoff window has passed.

### 5. On-Demand In-App Reminders
- The in-app notification center evaluates upcoming appointments due within 1 hour dynamically via `/api/v1/reminders`.
- Users receive real-time unread count badges and can mark alerts as read without background worker dependencies.

### 6. Structured Error Architecture
- The API standardizes all errors into structured JSON payloads:
  ```json
  {
    "error": {
      "code": "SLOT_ALREADY_TAKEN",
      "message": "That slot was just taken. Please pick another.",
      "status_code": 409
    }
  }
  ```
- Validation errors and business rule violations return predictable, human-readable explanations that the frontend directly handles.

---

## 7. Project Status & Roadmap

### What is Finished
- Full patient workflow: doctor browsing, filtering by speciality, live slot availability, booking, rescheduling, and cancellation.
- Full doctor workflow: today's schedule view in chronological order, appointment status transitions (`completed`, `no_show`), weekly recurring availability rule editor, and single-day leave management.
- Guarded schedule updates: modifying doctor availability checks future booked appointments and rejects changes with `409 Conflict` if existing bookings would be orphaned or misaligned.
- Zero double-booking concurrency protection verified with multi-threaded tests.
- Full responsive design supporting viewports down to 375px.

### What is Not Included
- **Third-Party SMS/WhatsApp Delivery:** Notification delivery is supported via in-app alerts and SMTP email; direct SMS/WhatsApp API gateways (e.g. Twilio) are not integrated.
- **Payment Processing Gateway:** Profile fees are displayed and recorded, but digital payment checkout (Stripe/Razorpay) is omitted.

### What I Would Do With More Time
- **WebSockets / Server-Sent Events (SSE):** Push instant slot state updates to all active client browsers viewing the same doctor's calendar.
- **Calendar Subscriptions (iCal / Google Calendar):** One-click calendar synchronization for patients and doctors.
- **Bi-Weekly / Custom Shift Rotations:** Flexible scheduling patterns such as alternating weekend shifts.

---

## 8. Stretch Features

1. **Doctor Leave Days:**
   - Doctors can block full calendar days off via `/api/v1/doctor/leaves`.
   - The slot generator automatically suppresses all time slots on blocked leave dates.
   - Guarded rejection: doctors cannot block a leave day if appointments are already booked on that date unless those bookings are resolved first.

2. **In-App Reminders (1 Hour Prior):**
   - Active appointments starting within the next 60 minutes trigger in-app notification alerts.
   - Bell notification menu displays unread badge counts and provides one-click mark-as-read functionality.

3. **Optional Email Reminders CLI (`python -m app.send_reminders`):**
   - Background worker designed for scheduled cron or task execution.
   - Scans for appointments starting within `[now, now + 1h]` that have not yet received an email reminder.
   - Sends email reminders when `EMAIL_REMINDERS_ENABLED=true` via configured SMTP settings; defaults to `false` and exits cleanly with exit code 0 when disabled.

---

## 9. AI Tools Used

<FILL IN: tools used and what for>

---

## 10. Live Demo Link

<optional: add deployed URL>

---

## 11. Responsive Design Note
The web client is fully responsive and optimized for mobile devices down to 375px viewport widths:
- Fluid layouts with zero horizontal scrollbars on mobile viewports.
- Minimum 44px touch targets on buttons and interactive controls.
- Modal dialogs fitted dynamically within viewport height with internal scroll.
- Responsive mobile navigation with accessible dropdown menus and wrapping action button rows.
