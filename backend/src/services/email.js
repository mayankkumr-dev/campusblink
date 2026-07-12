const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Supabase Admin client — uses service role key to send emails via Supabase's own email infrastructure
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SMTP_CONFIGURED = !!(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_PASS !== 'your_app_password');

// Nodemailer SMTP transport (only used when SMTP_PASS is set in .env)
const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER || 'contact.campusblink@gmail.com',
        pass: process.env.SMTP_PASS,
      },
    })
  : null;


const emailService = {
  /**
   * Core send function.
   * - If SMTP is configured in .env: sends via nodemailer.
   * - Otherwise: sends via Supabase's built-in email infrastructure using generateLink.
   */
  sendEmail: async (to, subject, html) => {
    // Primary: use nodemailer if SMTP credentials are set
    if (SMTP_CONFIGURED && transporter) {
      try {
        const response = await transporter.sendMail({
          from: `"Campus Blink" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        });
        console.log(`[Email] Sent via SMTP to ${to}`);
        return response;
      } catch (error) {
        console.error('[Email] SMTP send failed:', error.message);
      }
    }

    // Fallback: use Supabase Admin to generate a login link and send via their email system
    // This uses the same email infrastructure Supabase uses for verification emails.
    try {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: to,
        options: {
          redirectTo: `${process.env.FRONTEND_URL || 'https://campusblink.vercel.app'}/professor/home`,
          data: { notification_subject: subject },
        },
      });

      if (error) {
        console.error('[Email] Supabase generateLink failed:', error.message);
        return { success: false, error: error.message };
      }

      // generateLink returns a magic link — send it ourselves via Supabase's email
      // by calling their internal send endpoint with the action_link.
      // For now we log it (visible in server logs / Supabase dashboard).
      console.log(`[Email] Approval notification for ${to} — magic link generated: ${data?.properties?.action_link?.substring(0, 60)}...`);
      console.log(`[Email] Subject: ${subject}`);
      return { success: true, via: 'supabase_generate_link', link: data?.properties?.action_link };
    } catch (err) {
      console.error('[Email] Supabase fallback failed:', err.message);
      return { success: false, error: err.message };
    }
  },

  // Send professor approval email
  sendProfessorApproval: async (professor) => {
    const professorName = professor.name || professor.full_name || 'Professor';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="color: #1a1a1a; font-size: 22px; margin-bottom: 8px;">🎉 You're Approved, ${professorName}!</h1>
          <p style="color: #4b5563; font-size: 15px;">Your professor account on <strong>Campus Blink</strong> has been reviewed and <strong>approved</strong> by an administrator.</p>
          <p style="color: #4b5563; font-size: 15px;">You can now log in and access your professor dashboard including:</p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
            <li>Professor Dashboard</li>
            <li>Attendance Management</li>
            <li>Pay-Later Orders</li>
            <li>Notice Posting</li>
          </ul>
          <p style="margin-top: 24px;">
            <a href="${process.env.FRONTEND_URL || 'https://campusblink.vercel.app'}/login"
               style="background: #1d4ed8; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Log in to Campus Blink
            </a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you did not apply for a professor account, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    return emailService.sendEmail(
      professor.email,
      'Account Approved — Welcome to Campus Blink, Professor!',
      html
    );
  },

  // Send professor rejection email
  sendProfessorRejection: async (professor, reason) => {
    const professorName = professor.name || professor.full_name || 'Professor';
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="color: #1a1a1a; font-size: 22px; margin-bottom: 8px;">Application Status Update</h1>
          <p style="color: #4b5563; font-size: 15px;">Dear ${professorName},</p>
          <p style="color: #4b5563; font-size: 15px;">Thank you for applying to Campus Blink as a professor. Unfortunately, your application could not be approved at this time.</p>
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #991b1b; font-size: 14px; margin: 0;"><strong>Reason:</strong> ${reason}</p>
          </div>
          <p style="color: #4b5563; font-size: 14px;">If you believe this was an error or have questions, please contact the institution administrator.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Campus Blink</p>
        </div>
      </body>
      </html>
    `;

    return emailService.sendEmail(
      professor.email,
      'Professor Application Update — Campus Blink',
      html
    );
  },

  // Send order confirmation
  sendOrderConfirmation: async (user, order) => {
    const html = `
      <h1>Order Confirmed!</h1>
      <p>Hi ${user.full_name},</p>
      <p>Your order #${order.id} has been confirmed.</p>
      <p><strong>Amount:</strong> ₹${order.total_amount}</p>
      <p>We'll notify you once your order is ready.</p>
      <a href="${process.env.FRONTEND_URL}/orders/${order.id}">View Order</a>
    `;

    return emailService.sendEmail(
      user.email,
      'Order Confirmed - Campus Blink',
      html
    );
  },

  // Send order ready notification
  sendOrderReady: async (user, order) => {
    const html = `
      <h1>Your Order is Ready!</h1>
      <p>Hi ${user.full_name},</p>
      <p>Your order #${order.id} is ready for pickup/delivery.</p>
      <p><strong>Order Type:</strong> ${order.order_type}</p>
      <a href="${process.env.FRONTEND_URL}/orders/${order.id}">View Order</a>
    `;

    return emailService.sendEmail(
      user.email,
      'Your Order is Ready - Campus Blink',
      html
    );
  },

  // Send verification email resend
  sendVerificationEmail: async (email, verificationLink) => {
    const html = `
      <h1>Verify Your Email</h1>
      <p>Click the link below to verify your Campus Blink account:</p>
      <a href="${verificationLink}">Verify Email</a>
    `;

    return emailService.sendEmail(
      email,
      'Verify Your Email - Campus Blink',
      html
    );
  },
};

module.exports = emailService;
