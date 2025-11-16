const { body, param, validationResult } = require('express-validator');

/**
 * Validate registration input
 */
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('masterPassword')
    .isLength({ min: 12 })
    .withMessage('Master password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Master password must contain uppercase, lowercase, number, and special character'),
  handleValidationErrors
];

/**
 * Validate login input
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('masterPassword')
    .notEmpty()
    .withMessage('Master password is required'),
  handleValidationErrors
];

/**
 * Validate password entry creation/update
 */
const validatePasswordEntry = [
  body('site')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Website URL must be between 3 and 500 characters'),
  body('username')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Username must be between 1 and 100 characters'),
  body('password')
    .isLength({ min: 1, max: 500 })
    .withMessage('Password must be between 1 and 500 characters'),
  body('masterPassword')
    .notEmpty()
    .withMessage('Master password is required for encryption'),
  handleValidationErrors
];

/**
 * Validate password ID parameter
 */
const validatePasswordId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid password ID'),
  handleValidationErrors
];

/**
 * Validate decrypt request
 */
const validateDecrypt = [
  body('passwordId')
    .isMongoId()
    .withMessage('Invalid password ID'),
  body('masterPassword')
    .notEmpty()
    .withMessage('Master password is required'),
  handleValidationErrors
];

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordEntry,
  validatePasswordId,
  validateDecrypt
};