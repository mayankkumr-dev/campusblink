## Quick Start Guide - Campus Blink Backend

### Prerequisites
- Node.js 16+ installed
- `.env` file configured with credentials

### Local Development

#### 1. Backend Setup
```bash
cd backend
npm install  # Already done
npm run dev
```

The backend will start on `http://localhost:3000`

**Check if it's running:**
```bash
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"2026-04-04T..."}
```

**Development info endpoint:**
```bash
curl http://localhost:3000/dev/info
```

#### 2. Frontend Setup (in parallel terminal)
```bash
cd frontend
npm install  # Already done
npm run dev
```

Frontend will start on `http://localhost:5173`

### Environment Variables to Fill In

**For Backend (.../backend/.env):**
```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Cashfree Payments
CASHFREE_CLIENT_ID=your_cashfree_id
CASHFREE_SECRET_KEY=your_cashfree_secret

# Resend Email
RESEND_API_KEY=re_xxxx...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Other
FRONTEND_URL=http://localhost:5173  # For dev
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**For Frontend (.../frontend/.env):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
VITE_GA_MEASUREMENT_ID=
VITE_BACKEND_URL=http://localhost:3000
```

### Available API Endpoints

**Health Check:**
- `GET /health` - Server status

**Authentication:**
- `POST /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/complete-profile` - Complete profile after signup
- `GET /api/auth/session` - Get current session

**Payments:**
- `POST /api/payments/create-order` - Create Cashfree order
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/professor/pay-later` - Mark order as pay-later
- `POST /api/payments/professor/pay-pending` - Pay pending orders
- `GET /api/payments/professor/pending` - Get pending payments

**Admin:**
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - All users
- `GET /api/admin/professors/pending` - Pending professors
- `POST /api/admin/professors/:id/approve` - Approve professor
- `POST /api/admin/professors/:id/reject` - Reject professor

**Orders:**
- `POST /api/canteen/orders` - Place canteen order
- `POST /api/print/orders` - Place print order
- `GET /api/canteen/orders/shop/:shopId` - Shop orders

**Uploads:**
- `POST /api/uploads/image` - Upload image
- `POST /api/uploads/pdf` - Upload PDF

### Testing with Curl

```bash
# Check health
curl http://localhost:3000/health

# Get development info
curl http://localhost:3000/dev/info

# Test with JWT token (requires valid token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/auth/session
```

### Common Issues

**Backend won't start:**
- Check NODE_ENV is "development" in .env
- Verify all required packages installed: `npm install`
- Check port 3000 is not in use

**Frontend can't reach backend:**
- Ensure VITE_BACKEND_URL=http://localhost:3000 in frontend/.env
- Check backend is running on port 3000
- Verify CORS settings allow localhost:5173

**JWT errors:**
- Make sure you're logged in on the frontend
- JWT token is sent in Authorization header
- Token must be valid Supabase auth token

### Deployment

**To Railway:**
1. Push backend to GitHub
2. Connect Railway to your repo
3. Set root directory to `backend/`
4. Add environment variables
5. Deploy

**To Vercel (Frontend):**
1. Push frontend to GitHub
2. Connect Vercel to your repo
3. Set root directory to `frontend/`
4. Add VITE_BACKEND_URL pointing to Railway URL
5. Deploy

### Next Steps

1. Fill in all required .env variables
2. Start getting JWT tokens from Supabase auth
3. Use the frontend API client (`frontend/src/lib/backend.js`) to make requests
4. Test end-to-end flows locally before deployment
