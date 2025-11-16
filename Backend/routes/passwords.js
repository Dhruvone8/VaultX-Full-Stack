const express = require('express');
const router = express.Router();
const Password = require('../models/Password');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { passwordLimiter } = require('../middleware/ratelimiter');
const { validatePasswordEntry, validatePasswordId, validateDecrypt } = require('../middleware/validator');
const { deriveEncryptionKey, encryptPassword, decryptPassword } = require('../utils/encryption');

// Apply auth protection to all routes
router.use(protect);
router.use(passwordLimiter);

/**
 * @route   POST /api/passwords
 * @desc    Create new password entry
 * @access  Private
 */
router.post('/', validatePasswordEntry, async (req, res) => {
  try {
    const { site, username, password, masterPassword } = req.body;

    // Get user's salt
    const user = await User.findById(req.userId).select('salt');
    
    // Derive encryption key from master password
    const encryptionKey = deriveEncryptionKey(masterPassword, user.salt);

    // Encrypt the password
    const { encryptedPassword, iv, authTag } = encryptPassword(password, encryptionKey);

    // Create password entry
    const passwordEntry = await Password.create({
      userId: req.userId,
      site,
      username,
      encryptedPassword,
      iv,
      authTag
    });

    res.status(201).json({
      success: true,
      message: 'Password saved successfully',
      password: {
        id: passwordEntry._id,
        site: passwordEntry.site,
        username: passwordEntry.username,
        createdAt: passwordEntry.createdAt
      }
    });
  } catch (error) {
    console.error('Create password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving password',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/passwords
 * @desc    Get all password entries for user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const passwords = await Password.find({ userId: req.userId })
      .select('-encryptedPassword -iv -authTag')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: passwords.length,
      passwords: passwords.map(pwd => ({
        id: pwd._id,
        site: pwd.site,
        username: pwd.username,
        createdAt: pwd.createdAt,
        updatedAt: pwd.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get passwords error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching passwords'
    });
  }
});

/**
 * @route   POST /api/passwords/decrypt
 * @desc    Decrypt a specific password
 * @access  Private
 */
router.post('/decrypt', validateDecrypt, async (req, res) => {
  try {
    const { passwordId, masterPassword } = req.body;

    const passwordEntry = await Password.findOne({
      _id: passwordId,
      userId: req.userId
    });

    if (!passwordEntry) {
      return res.status(404).json({
        success: false,
        message: 'Password not found'
      });
    }

    const user = await User.findById(req.userId).select('salt masterPasswordHash');
    
    const isValid = await user.comparePassword(masterPassword);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid master password'
      });
    }

    const encryptionKey = deriveEncryptionKey(masterPassword, user.salt);

    const decryptedPassword = decryptPassword(
      passwordEntry.encryptedPassword,
      encryptionKey,
      passwordEntry.iv,
      passwordEntry.authTag
    );

    res.json({
      success: true,
      password: decryptedPassword
    });
  } catch (error) {
    console.error('Decrypt password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error decrypting password',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/passwords/:id
 * @desc    Update password entry
 * @access  Private
 */
router.put('/:id', validatePasswordId, validatePasswordEntry, async (req, res) => {
  try {
    const { site, username, password, masterPassword } = req.body;

    const passwordEntry = await Password.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!passwordEntry) {
      return res.status(404).json({
        success: false,
        message: 'Password not found'
      });
    }

    const user = await User.findById(req.userId).select('salt');
    const encryptionKey = deriveEncryptionKey(masterPassword, user.salt);
    const { encryptedPassword, iv, authTag } = encryptPassword(password, encryptionKey);

    passwordEntry.site = site;
    passwordEntry.username = username;
    passwordEntry.encryptedPassword = encryptedPassword;
    passwordEntry.iv = iv;
    passwordEntry.authTag = authTag;
    passwordEntry.updatedAt = Date.now();

    await passwordEntry.save();

    res.json({
      success: true,
      message: 'Password updated successfully',
      password: {
        id: passwordEntry._id,
        site: passwordEntry.site,
        username: passwordEntry.username,
        updatedAt: passwordEntry.updatedAt
      }
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/passwords/:id
 * @desc    Delete password entry
 * @access  Private
 */
router.delete('/:id', validatePasswordId, async (req, res) => {
  try {
    const passwordEntry = await Password.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!passwordEntry) {
      return res.status(404).json({
        success: false,
        message: 'Password not found'
      });
    }

    res.json({
      success: true,
      message: 'Password deleted successfully'
    });
  } catch (error) {
    console.error('Delete password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting password'
    });
  }
});

module.exports = router;