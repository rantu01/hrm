# HRM SaaS - HR & Payroll Management

A comprehensive HRM/HR and Payroll management system built with the **MERN stack** (MongoDB, Express.js, React.js, Node.js) and **Next.js 16**.

This project migrates the frontend design and backend functionality from the original Laravel + Inertia.js project into a modern Next.js + Express + MongoDB architecture.

## Features

- **Dashboard** — KPI cards, charts (attendance, payroll, employee growth), today's birthdays & leave
- **HR Management** — Branches, departments, designations, employees, awards, promotions
- **Recruitment** — Job postings, candidates, interviews, offers, onboarding
- **Leave Management** — Leave types, policies, applications, balances
- **Attendance** — Records, policies, regularizations, shifts
- **Payroll** — Salary components, payroll runs, payslips
- **Meetings** — Meeting rooms, minutes, attendees, action items
- **Authentication** — Login, register, forgot password with JWT

## Tech Stack

### Frontend
- **Next.js 16.4** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS 4** (CSS-first configuration)
- **shadcn/ui** components (Radix UI primitives)
- **Lucide React** icons
- **Recharts** for charts

### Backend
- **Express.js 5**
- **MongoDB** + **Mongoose 9**
- **JWT** authentication (jsonwebtoken)
- **bcryptjs** password hashing

## Project Structure

```
newcrm/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated app (sidebar layout)
│   │   ├── layout.jsx      # App shell with sidebar
│   │   └── dashboard/      # Dashboard page
│   ├── login/              # Login page
│   ├── register/           # Register page
│   ├── forgot-password/    # Forgot password page
│   ├── layout.js           # Root layout (Inter font)
│   ├── globals.css         # Design system (CSS variables, theme)
│   └── page.js             # Redirects to /dashboard
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives (button, card, etc.)
│   ├── app-shell.jsx       # App shell wrapper
│   ├── app-sidebar.jsx     # Sidebar + navigation
│   ├── app-content.jsx     # Content area
│   ├── nav-main.jsx        # Main navigation
│   ├── nav-user.jsx        # User menu
│   └── auth-layout.jsx     # Auth pages layout
├── server/                 # Express.js backend
│   ├── index.js            # Server entry point
│   ├── config/db.js        # MongoDB connection
│   ├── middleware/auth.js  # JWT middleware
│   ├── models/             # Mongoose models
│   └── routes/             # API routes
├── lib/utils.js            # cn() utility
└── .env.example            # Environment variables template
```

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (or set `MONGODB_URI`)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env and set JWT_SECRET and MONGODB_URI
```

### Running

```bash
# Run both frontend and backend concurrently
npm run dev:all

# Or run separately
npm run dev        # Next.js on http://localhost:3000
npm run server     # Express on http://localhost:5000
```

### Build

```bash
npm run build      # Production build
npm start          # Start production server
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/employees` | List employees |
| GET | `/api/employees/:id` | Get employee |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| GET | `/api/dashboard` | Dashboard stats |

## Design System

The design replicates the original project's pixel-perfect frontend:
- **Primary color**: `#3b82f6` (blue)
- **Typography**: Inter font family
- **Dark mode**: Full support via `.dark` class
- **CSS variables**: oklch color space for theme tokens
- **Layout**: Sidebar + content area with collapsible navigation

## Migration Notes

- The original project used **Laravel + Inertia.js + React + Tailwind CSS 4**
- Inertia.js routing was replaced with **Next.js App Router**
- Laravel backend was rebuilt with **Express.js + MongoDB**
- All UI components were migrated from **shadcn/ui** (TypeScript → JavaScript)
- The design, colors, typography, and layout are preserved exactly
