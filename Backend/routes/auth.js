const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateTokens, setTokenCookies, clearTokenCookies } = require('../utils/token');
const { generateSalt } = require('../utils/encryption');
const { protect, refreshAccessToken } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/ratelimiter');
const { validateRegister, validateLogin } = require('../middleware/validator');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerLimiter, validateRegister, async (req, res) => {
  try {
    const { email, masterPassword } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate unique salt for user
    const salt = generateSalt();

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      email,
      masterPasswordHash: masterPassword,
      salt
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt
      },
      accessToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, masterPassword } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(masterPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        lastLogin: user.lastLogin
      },
      accessToken,
      salt: user.salt // Send salt for client-side key derivation
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, async (req, res) => {
  try {
    // Clear refresh token from database
    await User.findByIdAndUpdate(req.userId, {
      refreshToken: null
    });

    // Clear cookies
    clearTokenCookies(res);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', refreshAccessToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-masterPasswordHash -refreshToken');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

/**
 * @route   GET /api/auth/salt
 * @desc    Get user's salt for encryption key derivation
 * @access  Private
 */
router.get('/salt', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('salt');
    
    res.json({
      success: true,
      salt: user.salt
    });
  } catch (error) {
    console.error('Get salt error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salt'
    });
  }
});

module.exports = router;