# Campus Blink - Local Development Setup

## 📋 Project Structure

```
campus_blink_2/
├── frontend/              # React/Vite frontend application
│   ├── src/
│   │   ├── app/          # Main app components
│   │   ├── api/          # Frontend API modules
│   │   ├── components/   # Reusable React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities (Supabase, Cloudinary, etc)
│   │   ├── store/        # State management (Zustand)
│   │   └── styles/       # CSS and Tailwind config
│   ├── .env              # Frontend environment variables
│   └── package.json
├── backend/              # Node.js/Express backend server
│   ├── src/
│   │   ├── config/       # Service configurations
│   │   ├── middleware/   # Auth, rate limiting, etc
│   │   ├── routes/       # API endpoints
│   │   └── index.js      # Express server
│   ├── .env              # Backend environment variables
│   └── package.json
├── scripts/              # Utility .cjs scripts (organized from root)
│   ├── fix_*.cjs
│   ├── format_*.cjs
│   └── ...
├── sql/                  # Database migration files
├── guidelines/           # API and implementation guidelines
└── SETUP.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm installed
- Git (for cloning/version control)
- Two terminal windows

### 1. Install Dependencies

**Terminal 1 - Frontend:**
```bash
cd frontend
npm install
```

**Terminal 2 - Backend:**
```bash
cd backend
npm install
```

### 2. Configure Environment Variables

#### Backend Configuration (`backend/.env`)
Fill in all required credentials:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://campusblink.me
JWT_SECRET=your_jwt_secret_key_for_token_generation
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contactus.mayank@gmail.com
SMTP_PASS=your_app_password
```

#### Frontend Configuration (`frontend/.env`)
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
VITE_BACKEND_URL=http://localhost:3000
VITE_GA_MEASUREMENT_ID=optional_google_analytics_id
```

### 3. Start Development Server

**Terminal 1 - Start Backend (port 3000):**
```bash
cd backend
npm run dev
```

Output should show:
```
Backend server running on port 3000
Environment: development
Development info: http://localhost:3000/dev/info
```

**Terminal 2 - Start Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

Output should show:
```
  VITE v5.x.x  ready in xxxms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 4. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api
- **Backend Health Check:** http://localhost:3000/health
- **Backend Dev Info:** http://localhost:3000/dev/info

## 🔐 Admin Panel

The admin panel is accessible at `http://localhost:5173/admin` after logging in with the admin email:
- **Admin Email:** `contactus.mayank@gmail.com`

### Admin Features (Ctrl+K or Cmd+K)
- **Global Search:** Search users, orders, posts across the platform
- **Live Dashboard:** Real-time platform statistics
- **User Management:** Manage students, professors, canteen owners
- **Orders:** View unified canteen and print orders
- **Community:** Monitor posts and reports
- **Email Center:** Send bulk emails to users
- **Finance:** Track reputation and revenue
- **Audit Log:** View all admin actions

## 📚 Key APIs

### Authentication
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Admin
```
GET    /api/admin/stats          # Platform statistics
GET    /api/admin/users          # List all users
GET    /api/admin/audit-log      # Admin actions log
POST   /api/admin/search         # Global search endpoint
```

### Orders
```
GET    /api/canteen/orders       # Canteen orders
GET    /api/print/orders         # Print shop orders
PATCH  /api/canteen/orders/:id   # Update order status
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is already in use
lsof -i :3000
# Kill the process if needed
kill -9 <PID>
```

### Frontend can't connect to backend
- Verify backend is running on http://localhost:3000
- Check `VITE_BACKEND_URL` in `frontend/.env`
- Check `ALLOWED_ORIGINS` in `backend/.env`
- Check browser console for CORS errors

### Module not found errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Environment variables not loading
- Ensure `.env` file is in the correct directory (same as `package.json`)
- Restart the dev server after changing `.env`
- Don't commit `.env` files with sensitive credentials
- Use `.env.example` as template

## 📦 Utilities in `scripts/` Folder

The `scripts/` folder contains utility scripts for development:
- `fix_*.cjs` - UI and layout fixes
- `format_*.cjs` - Code formatting scripts
- `strip_emojis.cjs` - Remove emoji characters
- `rewrite_*.cjs` - Layout rewriting utilities

These are one-off utility scripts and don't need to run during normal development.

## 🔄 Database Migrations

SQL migration files are in the `sql/` folder. Apply them to your Supabase database:
1. Go to Supabase console
2. Navigate to SQL Editor
3. Open each `.sql` file and run the migrations

## 📝 Development Workflow

1. Make changes in `frontend/src` or `backend/src`
2. Frontend auto-reloads on save (Vite hot reload)
3. Backend auto-reloads on save (nodemon can be configured)
4. Test in browser at http://localhost:5173
5. Check backend logs in terminal for errors

## 🚀 Building for Production

### Frontend Build
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Backend Production
```bash
cd backend
npm run start
```

## 📞 Support

For issues or questions, refer to:
- Backend errors: Check `backend/src/index.js` and route files
- Frontend errors: Check browser console (F12)
- Database issues: Check Supabase console
- API issues: Check `http://localhost:3000/dev/info` for configuration status
