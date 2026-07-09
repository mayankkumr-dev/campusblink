/**
 * @file validatePassword.js
 * @description Express middleware to enforce strict password entropy and prevent ReDoS/Bcrypt DoS vectors.
 */

// Strict Regex enforcing:
// ^               : Start of string
// (?=.*[a-z])     : At least one lowercase ASCII letter
// (?=.*[A-Z])     : At least one uppercase ASCII letter
// (?=.*\d)        : At least one numeric digit (0-9)
// (?=.*[\W_])     : At least one special character (non-alphanumeric or underscore)
// [A-Za-z\d\W_]   : Allowed characters
// {12,72}         : Minimum 12 characters, Maximum 72 characters (Bcrypt truncation limit)
// $               : End of string
const PASSWORD_ENTROPY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{12,72}$/;

/**
 * Express middleware to validate registration password entropy.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
const validatePasswordEntropy = (req, res, next) => {
  const { password } = req.body || {};

  // 1. Ensure payload exists and password is a valid string
  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid Request Payload',
      message: 'The "password" field is required and must be a string.'
    });
  }

  // 2. Perform strict regex evaluation
  if (!PASSWORD_ENTROPY_REGEX.test(password)) {
    const validationErrors = [];

    if (password.length < 12) {
      validationErrors.push('Password must be at least 12 characters long.');
    }
    if (password.length > 72) {
      validationErrors.push('Password cannot exceed 72 characters (cryptographic algorithm limit).');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      validationErrors.push('Password must include at least one lowercase letter (a-z).');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      validationErrors.push('Password must include at least one uppercase letter (A-Z).');
    }
    if (!/(?=.*\d)/.test(password)) {
      validationErrors.push('Password must include at least one numeric digit (0-9).');
    }
    if (!/(?=.*[\W_])/.test(password)) {
      validationErrors.push('Password must include at least one special character (e.g., !@#$%^&*).');
    }

    // Return 400 Bad Request with granular security violation details
    return res.status(400).json({
      success: false,
      error: 'Password Entropy Validation Failed',
      message: 'The submitted password does not meet the minimum security requirements.',
      details: validationErrors
    });
  }

  // 3. Password passed validation; proceed to the controller
  next();
};

module.exports = { validatePasswordEntropy };
