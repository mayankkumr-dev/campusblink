const nodemailer = require('nodemailer');

// Set up generic Nodemailer transport
// Note: To send real emails, update these empty placeholder strings 
// dynamically via environment variables like SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'contactus.mayank@gmail.com',
    pass: process.env.SMTP_PASS || 'your_app_password', // Create an app password in Gmail if using Gmail
  },
});

const emailService = {
  // Send generic email
  sendEmail: async (to, subject, html) => {
    try {
      const response = await transporter.sendMail({
        from: `"Campus Blink" <${process.env.SMTP_USER || 'contactus.mayank@gmail.com'}>`, // sender address
        to,
        subject,
        html,
      });

      return response;
    } catch (error) {
      console.error('Failed to send email via SMTP:', error);
      // Prevent blocking user flow by resolving true but logging for devs during setup
      // throw new Error(`Failed to send email: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Send professor approval email
  sendProfessorApproval: async (professor) => {
    const html = `
      <h1>Welcome, Professor ${professor.full_name}!</h1>
      <p>Your professor account has been approved on Campus Blink.</p>
      <p>You can now access exclusive features including pay-later orders and professor dashboard.</p>
      <a href="${process.env.FRONTEND_URL}/login">Login to Campus Blink</a>
    `;

    return emailService.sendEmail(
      professor.email,
      'Account Approved - Campus Blink',
      html
    );
  },

  // Send professor rejection email
  sendProfessorRejection: async (professor, reason) => {
    const html = `
      <h1>Application Status - Campus Blink</h1>
      <p>Dear ${professor.full_name},</p>
      <p>Unfortunately, your professor account application could not be approved.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please contact support if you have any questions.</p>
    `;

    return emailService.sendEmail(
      professor.email,
      'Application Status - Campus Blink',
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
