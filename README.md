# LM

LM is a student-first learning management system built with a React frontend, an Express backend, and Supabase for authentication, database, and file storage.

The app is organized around a calm learning flow: students sign in, choose a grade or stream, open modules and units, and view resources such as tutes, papers, and videos. Teachers and admins can manage learning content through the backend and storage layer.

## What’s Included

- Student sign-in and profile flow
- Grade, module, unit, and resource browsing
- Teacher and admin-facing content management paths
- Supabase auth, Postgres schema, and row-level security policies
- Resource uploads into Supabase Storage
- Backend APIs for reading grades, modules, and units

## Project Structure

```text
LM/
├─ frontend/   # React + TypeScript app
├─ backend/    # Express API server
└─ database/   # Supabase SQL schema and storage setup
```

## Technology Stack

- Frontend: React, TypeScript, Vite, React Router, Zustand
- Backend: Node.js, Express, TypeScript
- Auth and data: Supabase Auth + PostgreSQL
- Storage: Supabase Storage
- UI: Lucide React icons and a custom LMS theme

## Database Setup

Run the SQL files in Supabase in this order:

1. `database/schema.sql`
2. `database/storage.sql`
3. `database/seed.sql`

The schema defines the core LMS tables:

- `profiles`
- `grades`
- `modules`
- `units`
- `resources`
- `teacher_modules`
- `enrollments`
- `progress`
- `announcements`

The storage script creates a private bucket for learning materials and enables access policies for teachers and admins.

## Backend Setup

### Requirements

- Node.js 18+
- A Supabase project

### Environment Variables

Create `backend/.env` from `backend/.env.example` and set:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=lms-resources
FRONTEND_ORIGIN=http://localhost:5173
PORT=4000
ADMIN_EMAILS=admin@example.com
```

### Install and Run

```bash
cd backend
npm install
npm run dev
```

The backend serves JSON APIs and a health check endpoint at `GET /health`.

### API Surface

- `GET /api/grades`
- `GET /api/modules?gradeId=...`
- `GET /api/units?moduleId=...`
- `GET /api/units/:unitId/resources`
- `POST /api/admin/resources/upload`

The upload endpoint accepts `multipart/form-data` with a `file` field and stores the file in Supabase Storage before creating a resource record.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend API and Supabase auth configuration to be available in its environment.

## Resource Upload Flow

The current backend supports direct server-side upload for admin users:

1. Admin submits a file using `multipart/form-data`.
2. The backend verifies the bearer token.
3. The file is stored in the Supabase bucket.
4. A `resources` record is created with metadata such as title, type, size, and storage path.

This structure is ready for a future direct-upload or presigned-upload flow if you want browser-to-storage uploads for large videos.

## Notes for Local Development

- Keep the frontend and backend origins aligned with `FRONTEND_ORIGIN`.
- Make sure the Supabase bucket name in `SUPABASE_STORAGE_BUCKET` matches the bucket created by `database/storage.sql`.
- Use an admin email in `ADMIN_EMAILS` when testing the upload route.

## Typical Workflow

1. Create the Supabase schema and storage bucket.
2. Start the backend server.
3. Start the frontend app.
4. Sign in with a Supabase user.
5. Browse grades, modules, units, and resources.
6. Upload learning materials through the admin API.

## License

No license has been specified yet.
