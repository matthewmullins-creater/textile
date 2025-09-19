# 🧵 Textile Facility Management System

An end-to-end digital platform for managing textile manufacturing operations, featuring a modern React-based frontend and a robust Node.js/Express backend with real-time communication, advanced analytics, and production oversight.

## 📦 Tech Stack Overview
Layer	Tech Stack
Frontend	React 19, TypeScript, Vite, Tailwind CSS, Zustand, SWR, Radix UI, Socket.IO
Backend	Node.js, Express, TypeScript, Prisma (PostgreSQL), Socket.IO, Cloudinary
AI	Google Gemini API for analytics insights
Auth	JWT + Refresh Tokens, Role-based Access
DevOps	Prisma Migrations, Environment Configs, WebSocket-based real-time updates
## ✨ Core Features
### 🔐 Authentication & Security
- JWT authentication with refresh tokens
- Role-based access (USER, ADMIN, SUPERADMIN)
- Session management with device tracking
- Google SMTP email support for password resets
- CORS and rate limiting protections
### 👤 User & Worker Management
- Full CRUD for users and workers
- CSV import/export for bulk worker operations
- Profile/avatar support via Cloudinary
- Worker performance tracking and analytics
### 🏭 Production Management
- Manage production lines with capacity and status control
- Assignment system with calendar view and shift conflict detection
- Product catalog with category and image management
### 📈 Performance Analytics & AI Insights
- Real-time metrics and dashboards
- Visualize performance (output, errors, time) per worker/line
- AI-powered analysis via Gemini API for productivity insights
### 💬 Real-Time Chat & Notifications
- Group and direct messaging (Socket.IO)
- File sharing (images, videos, docs)
- Read receipts, online presence indicators
- Push/in-dashboard notifications for events/messages
### 🧩 Frontend UI/UX Features
- Dark/light theme toggle with system preference support
- Responsive, animated UI with Radix UI and Framer Motion
- Advanced forms with Zod + React Hook Form
- Toast notifications and loading states
### 📊 Data Display & Tables
- TanStack Table with filtering, sorting, pagination
- Exportable data reports
- Live search across data views

## 📁 Project Structure
    ```
    textile-management-system/
    ├── backend/               # Express + Prisma + PostgreSQL API
    │   └── src/
    │       ├── routes/
    │       ├── controllers/
    │       └── prisma/
    ├── frontend/              # React + Vite + Tailwind Admin Dashboard
    │   └── src/
    │       ├── components/
    │       ├── pages/
    │       └── hooks/
    └── README.md              # You are here!
    ```

## 🚀 Getting Started
### ✅ Backend Setup
1. Install dependencies
    ```bash
    cd backend
    npm install
    ```
2. Configure .env
    ```bash
    DATABASE_URL=postgres://...
    FRONTEND_URL=http://localhost:3000
    PORT=5000
    NODE_ENV=development
    JWT_SECRET=your_jwt_secret
    JWT_REFRESH_SECRET=your_refresh_secret
    GOOGLE_APP_USER=your_email@gmail.com
    GOOGLE_APP_PASSWORD=your_app_password
    GEMINI_API_KEY=your_gemini_api_key
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```
3. Run Prisma
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init
    ```
4. Start Server
    ```bash
    npm run dev
    ```
### ✅ Frontend Setup
1. Install dependencies
    ```bash
    cd frontend
    npm install
    ```
2. Set up .env
    ```bash
    VITE_API_URL=http://localhost:5000
    ```
3. Run Frontend Dev Server
    ```bash
    npm run dev
    ```
## 🌐 Main API Endpoints
    | Endpoint                 | Description                                   |
    |--------------------------|-----------------------------------------------|
    | `/api/auth`              | Auth flows (login, register, refresh)         |
    | `/api/users`             | User CRUD and status                          |
    | `/api/workers`           | Worker CRUD, CSV import/export                |
    | `/api/production-lines`  | Line creation, capacity tracking              |
    | `/api/assignments`       | Worker/shift assignment with conflict checks  |
    | `/api/products`          | Product CRUD, image/category management       |
    | `/api/performance`       | Track production performance metrics          |
    | `/api/chat`              | Real-time chat, file upload, presence         |
    | `/api/insights`          | AI reports and KPI dashboards                 |
    | `/api/settings/account`  | Profile and password updates                  |
    | `/api/notifications`     | In-dashboard notifications                    |
## 📊 Frontend Highlights
    | Area             | Tech Used               |
    | ---------------- | ----------------------- |
    | Styling          | Tailwind CSS, shadcn/ui |
    | State Management | Zustand, SWR            |
    | Forms            | React Hook Form + Zod   |
    | Charts           | Recharts                |
    | Realtime         | Socket.IO               |
    | UI Animations    | Framer Motion           |
    | Data Tables      | TanStack Table          |
    | Notifications    | Sonner                  |
## 📎 Links
- Frontend Source: /frontend
- Backend Source: /backend
## 🧪 Notes
- All features are modular and extensible.
- AI-driven analytics can be extended to predict productivity and downtime.
- Ensure CORS, authentication headers, and socket URLs match between frontend/backend.