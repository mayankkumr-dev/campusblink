/**
 * INTEGRATION GUIDE
 * 
 * How to update frontend API calls to use the new backend
 */

// ============================================
// BEFORE (Direct Supabase/Service Calls)
// ============================================

// Example from old canteen.js:
// const { data: order, error } = await supabase
//   .from('orders')
//   .insert({ user_id, items, total_amount, ... })
//   .select()
//   .single();


// ============================================
// AFTER (Using Backend API)
// ============================================

import backendAPI from '@/lib/backend';
import { showToast } from '@/components/Toast'; // or your error toast function

// Place canteen order
const placeCanteenOrder = async (orderData) => {
  try {
    const result = await backendAPI.canteen.placeOrder(orderData);
    showToast('Order placed successfully', 'success');
    return result.order;
  } catch (error) {
    showToast(error.message || 'Failed to place order', 'error');
    throw error;
  }
};


// ============================================
// MIGRATION MAP - What Moves to Backend
// ============================================

// 1. PAYMENT OPERATIONS
// OLD: Direct Cashfree API calls → NOW: backendAPI.payments.*
// OLD: Direct order creation → NOW: backendAPI.payments.createOrder()
// OLD: Payment verification → NOW: backendAPI.payments.verifyPayment()
// OLD: Pay-later logic → NOW: backendAPI.payments.professorPayLater()

// 2. EMAIL OPERATIONS  
// OLD: Resend email calls → NOW: backendAPI.email.*
// OLD: Approval emails → NOW: backendAPI.email.approveProfessor()
// OLD: Rejection emails → NOW: backendAPI.email.rejectProfessor()

// 3. ADMIN OPERATIONS
// OLD: Service role queries → NOW: backendAPI.admin.*
// OLD: User deletion → NOW: backendAPI.admin.deleteUser()
// OLD: Feature access changes → NOW: backendAPI.admin.updateFeatureAccess()

// 4. FILE UPLOADS
// OLD: Direct Cloudinary signed uploads → NOW: backendAPI.uploads.*
// Note: Cloudinary unsigned uploads can still work on frontend


// ============================================
// EXAMPLE REFACTORINGS
// ============================================

// PAYMENT EXAMPLE
// Before:
async function createPaymentOrder(orderId, amount) {
  const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
    // Direct API call with secret key (WRONG - exposed key)
  });
}

// After:
async function createPaymentOrder(orderId, amount) {
  try {
    const result = await backendAPI.payments.createOrder(
      orderId, 
      amount, 
      'canteen'
    );
    return result.sessionId;
  } catch (error) {
    showToast(error.message, 'error');
  }
}


// ADMIN OPERATION EXAMPLE
// Before:
const { data: users } = await supabaseAdmin
  .from('profiles')
  .select('*');  // Using service role key (WRONG - exposed)

// After:
const data = await backendAPI.admin.getUsers();
console.log(data.users);


// EMAIL EXAMPLE
// Before:
const response = await fetch('https://api.resend.com/emails', {
  headers: { Authorization: `Bearer ${RESEND_API_KEY}` }, // WRONG - exposed
});

// After:
await backendAPI.email.approveProfessor(professorId);


// FILE UPLOAD EXAMPLE
// Before:
const response = await cloudinary.uploader.upload(file); // Unsigned upload

// After:
try {
  const result = await backendAPI.uploads.uploadImage(file, 'canteen');
  console.log(result.url);
} catch (error) {
  showToast(error.message, 'error');
}


// ============================================
// FILES THAT NEED UPDATES
// ============================================

// src/api/admin.js
// - Replace all supabaseAdmin operations with backendAPI.admin.*
// - Remove service role key usage

// src/api/payments.js (or wherever payment logic is)
// - Replace Cashfree API calls with backendAPI.payments.*
// - Remove Cashfree secret key usage

// src/api/canteen.js
// - Replace order creation with backendAPI.canteen.placeOrder()
// - Replace order updates with backendAPI.canteen.updateOrderStatus()

// src/api/print.js
// - Replace order creation with backendAPI.print.placeOrder()
// - Replace order updates with backendAPI.print.updateOrderStatus()

// src/api/professor.js
// - Replace admin operations with backendAPI routes
// - Replace Cashfree settlement calls with backendAPI.payments.*

// src/components/* (any components with direct API calls)
// - Replace service calls with backendAPI routes
// - Add error handling


// ============================================
// ERROR HANDLING PATTERN
// ============================================

import backendAPI from '@/lib/backend';
import { showErrorToast } from '@/utils/toast';

try {
  const data = await backendAPI.admin.getUsers();
  // Handle success
  return data;
} catch (error) {
  // Error object structure:
  // {
  //   status: 400,
  //   message: 'Error message',
  //   data: { ... }
  // }
  
  if (error.status === 401) {
    showErrorToast('Unauthorized - Please login again');
    // Redirect to login
  } else if (error.status === 403) {
    showErrorToast('You do not have permission to do this');
  } else if (error.status === 404) {
    showErrorToast('Resource not found');
  } else {
    showErrorToast(error.message || 'An error occurred');
  }
  
  throw error;
}


// ============================================
// CRITICAL: DO NOT EXPOSE IN FRONTEND
// ============================================

// ❌ NEVER put these in frontend .env or code:
// - SUPABASE_SERVICE_ROLE_KEY
// - CASHFREE_SECRET_KEY
// - RESEND_API_KEY
// - CLOUDINARY_API_SECRET
// - DATABASE_URL
// - Any JWT signing keys

// ✅ ONLY these allowed in frontend .env:
// - VITE_SUPABASE_URL
// - VITE_SUPABASE_ANON_KEY
// - VITE_CLOUDINARY_CLOUD_NAME
// - VITE_CLOUDINARY_UPLOAD_PRESET
// - VITE_BACKEND_URL
// - VITE_GA_MEASUREMENT_ID


// ============================================
// TESTING LOCALLY
// ============================================

// 1. Start backend:
//    cd backend && npm run dev

// 2. Start frontend:
//    cd frontend && npm run dev

// 3. Frontend will call http://localhost:3000 by default
//    (Check frontend/.env VITE_BACKEND_URL)

// 4. Test flow:
//    - Login via Supabase on frontend
//    - Frontend sends JWT to backend
//    - Backend verifies with Supabase
//    - Route handlers execute with verified user

// 5. Debug backend by checking console logs
//    - Server logs in terminal running backend
//    - Browser console for frontend errors
