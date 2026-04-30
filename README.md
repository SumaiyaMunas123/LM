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
- `POST /api/admin/resources/upload/initiate`
- `POST /api/admin/resources/upload/complete`
- `GET /api/admin/resources?unit_id=...&kind=...&status=...`
- `GET /api/admin/resources/:id`
- `PUT /api/admin/resources/:id`
- `DELETE /api/admin/resources/:id`
- `GET /api/resources/:id/url?expiresIn=3600`
- `GET /api/resources/:id`
- `GET /api/teachers`
- `GET /api/teachers/:id`
- `POST /api/teachers`
- `POST /api/teachers/:teacherId/assign/:moduleId`
- `DELETE /api/teachers/:teacherId/assign/:moduleId`

The upload endpoints support both:

- direct server-side multipart upload (`/api/admin/resources/upload`)
- presigned browser-to-storage upload via initiate/complete endpoints

Resource URLs are served via signed links (1-hour expiry by default) for secure playback/download.

Teachers can be created and assigned to modules by admins.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend API and Supabase auth configuration to be available in its environment.

## Resource Upload Flow

For admin/developer uploads, the backend supports presigned direct upload:

1. Call `POST /api/admin/resources/upload/initiate` with `fileName` and metadata.
2. Receive a signed upload token/URL and storage path.
3. Upload the file directly from frontend to Supabase Storage.
4. Call `POST /api/admin/resources/upload/complete` with the path and metadata.
5. Backend verifies the object exists and creates the `resources` row.

The server-side multipart upload endpoint remains available as a fallback path.

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
