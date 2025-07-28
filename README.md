# FrimousseAsso

A full-stack web application for a child care association, built with React (Vite), Node.js, Express, Prisma, and PostgreSQL.

## Features
- Secure authentication (access/refresh tokens in HTTP-only cookies)
- Public landing page
- Dashboard with calendar (FullCalendar)
- Children and nannies management
- Modular, maintainable folder structure
- TailwindCSS for responsive design

## Getting Started

### Frontend
1. `npm install`
2. `npm run dev`

### Backend
1. `cd backend`
2. `npm install`
3. Configure your database in `backend/prisma/.env`
4. `npx prisma migrate dev`
5. `npm start` (after creating the server entrypoint)

## Folder Structure
- `components/` - Reusable UI elements
- `pages/` - Route-level components
- `routes/` - Route configuration
- `services/` - API calls and business logic
- `controllers/` - Backend controllers
- `utils/` - Helpers (auth, date formatting, etc.)
- `hooks/` - Custom React hooks

## License
MIT
