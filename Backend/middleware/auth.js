const { verifyAccessToken, verifyRefreshToken, generateAccessToken } = require('../utils/token');
const User = require('../models/User');

/**
 * Protect routes - verify access token
 */
const protect = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies.accessToken;
    
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-masterPasswordHash -refreshToken');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    // If access token expired, try to refresh
    if (error.message === 'Invalid or expired access token') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired',
        needsRefresh: true
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);
    
    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Access token refreshed',
      accessToken: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * Extract and validate master password from request
 * Used for encryption/decryption operations
 */
const validateMasterPassword = async (req, res, next) => {
  try {
    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({
        success: false,
        message: 'Master password required for this operation'
      });
    }

    // Verify master password
    const user = await User.findById(req.userId);
    const isValid = await user.comparePassword(masterPassword);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid master password'
      });
    }

    // Attach master password to request (only in memory, never logged)
    req.masterPassword = masterPassword;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating master password'
    });
  }
};

module.exports = {
  protect,
  refreshAccessToken,
  validateMasterPassword
};