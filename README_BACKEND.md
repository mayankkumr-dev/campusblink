README - Campus Blink Separated Architecture

## Project Structure

```
campus-blink/
├── frontend/     ← React Vite application
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── .env
│   └── .env.example
│
└── backend/      ← Node.js Express API server
    ├── src/
    │   ├── index.js              # Main server entry
    │   ├── config/               # External service configs
    │   │   ├── supabase.js
    │   │   ├── cashfree.js
    │   │   ├── resend.js
    │   │   └── cloudinary.js
    │   ├── middleware/           # Request handling
    │   │   ├── auth.js
    │   │   ├── adminOnly.js
    │   │   ├── professorOnly.js
    │   │   ├── canteenOwnerOnly.js
    │   │   ├── printShopOnly.js
    │   │   └── rateLimit.js
    │   ├── routes/               # API endpoints
    │   │   ├── auth.js
    │   │   ├── payments.js
    │   │   ├── webhooks.js
    │   │   ├── email.js
    │   │   ├── admin.js
    │   │   ├── professor.js
    │   │   ├── canteen.js
    │   │   ├── print.js
    │   │   └── uploads.js
    │   ├── services/             # Business logic
    │   │   ├── supabase.js
    │   │   ├── payments.js
    │   │   ├── email.js
    │   │   ├── notifications.js
    │   │   └── cloudinary.js
    │   └── utils/                # Helpers
    │       ├── constants.js
    │       ├── helpers.js
    │       └── validators.js
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── Procfile                  # Railway deployment
    ├── package.json
    └── package-lock.json

└── sql/          ← All database migrations
    └── *.sql

```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies (already done):
```bash
npm install
```

3. Create `.env` file with your credentials:
```bash
cp .env.example .env
```

4. Fill in the required environment variables:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
- CASHFREE_CLIENT_ID: Cashfree merchant ID
- CASHFREE_SECRET_KEY: Cashfree API key
- RESEND_API_KEY: Resend email API key
- CLOUDINARY_CLOUD_NAME: Cloudinary cloud name
- CLOUDINARY_API_KEY: Cloudinary API key
- CLOUDINARY_API_SECRET: Cloudinary API secret
- FRONTEND_URL: Your frontend URL
- ALLOWED_ORIGINS: Comma-separated list of allowed origins

5. Start the backend:
```bash
npm start      # Production mode
npm run dev    # Development mode (same currently)
```

The backend will run on `http://localhost:3000` by default.

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd ../frontend
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update VITE_BACKEND_URL if your backend is on a different server.

4. Install dependencies:
```bash
npm install
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

All endpoints require a valid Supabase JWT token in the Authorization header:
```
Authorization: Bearer <supabase_jwt_token>
```

### Auth Routes (`/api/auth`)
- `POST /verify-token` - Verify JWT and return profile
- `POST /complete-profile` - Save additional profile data after OAuth
- `GET /session` - Return current session info

### Payment Routes (`/api/payments`)
- `POST /create-order` - Create Cashfree payment order
- `POST /verify` - Verify payment status
- `POST /professor/pay-later` - Mark order for pay-later
- `GET /professor/pending` - Get pending professor payments
- `POST /professor/pay-pending` - Pay selected pending orders

### Webhook Routes (`/api/webhooks`)
- `POST /cashfree` - Cashfree payment webhook (signature verified)

### Email Routes (`/api/email`)
- `POST /send` - Send custom email (admin only)
- `POST /professor/approve` - Send professor approval email
- `POST /professor/reject` - Send professor rejection email
- `POST /verification` - Resend verification email

### Admin Routes (`/api/admin`)
- `GET /stats` - Platform statistics
- `GET /users` - All users with filters
- `PATCH /users/:id` - Update user status/role
- `DELETE /users/:id` - Delete user
- `GET /professors/pending` - Pending professor requests
- `POST /professors/:id/approve` - Approve professor
- `POST /professors/:id/reject` - Reject professor
- `GET /audit-log` - Admin action logs
- `POST /feature-access` - Enable/disable features

### Professor Routes (`/api/professor`)
- `GET /home-stats` - Dashboard statistics
- `GET /orders` - All professor orders

### Canteen Routes (`/api/canteen`)
- `POST /orders` - Place canteen order
- `PATCH /orders/:id/status` - Update order status (owner only)
- `GET /orders/shop/:shopId` - All orders for a shop (owner only)

### Print Routes (`/api/print`)
- `POST /orders` - Place print order
- `PATCH /orders/:id/status` - Update order status (owner only)
- `GET /orders/shop/:shopId` - All orders for a shop (owner only)

### Upload Routes (`/api/uploads`)
- `POST /image` - Upload image to Cloudinary
- `POST /pdf` - Upload PDF to Cloudinary
- `DELETE /file` - Delete file from Cloudinary

## Frontend API Client

Use the centralized backend client in `frontend/src/lib/backend.js`:

```javascript
import backendAPI from './lib/backend';

// Make API calls with automatic JWT injection
const data = await backendAPI.payments.createOrder(orderId, amount, 'canteen');
const profile = await backendAPI.auth.getSession();
const stats = await backendAPI.admin.getStats();
```

All methods automatically:
- Inject the JWT token from Supabase auth
- Handle errors and return consistent error objects
- Use the VITE_BACKEND_URL environment variable

## Security

✅ **Implemented:**
- All secret keys only in backend `.env`
- Frontend has no access to service role keys
- Every protected route verifies JWT token
- Admin routes require admin role
- Role-specific middlewares (Professor, Canteen Owner, Print Shop)
- Webhook signature verification
- CORS restricted to frontend domain
- Rate limiting (100 req per 15 min)
- Helmet security headers
- No stack traces exposed in production
- Input validation on all routes

## Deployment

### Deploy Backend to Railway.app

1. Push backend to GitHub
2. Connect Railway to your GitHub repository
3. Create new service from repository
4. set Root Directory to `backend/`
5. Add environment variables in Railway dashboard
6. Railway will auto-deploy on each push

### Deploy Frontend to Vercel

1. Push frontend to GitHub
2. Connect Vercel to your GitHub repository
3. Set Root Directory to `frontend/`
4. Add VITE_BACKEND_URL environment variable
5. Deploy

## Migration Notes

- No business logic was changed
- No UI or design was modified
- All database schemas remain the same
- Frontend now calls backend instead of direct Supabase operations
- Payment and email logic moved to backend securely

## Troubleshooting

**Backend won't start:**
- Check all .env variables are filled
- Verify port 3000 is not in use
- Check Node.js version (16+)

**Frontend can't connect to backend:**
- Verify VITE_BACKEND_URL is correct
- Check CORS settings in backend
- Verify JWT token is valid

**Payments not working:**
- Verify Cashfree credentials in backend .env
- Check webhook URL is updated in Cashfree dashboard
- Verify webhook signature verification

**Emails not sending:**
- Verify Resend API key in backend .env
- Check email templates in email service
- Verify sender email is verified in Resend
