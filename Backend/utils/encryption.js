const crypto = require('crypto');

/**
 * Derive encryption key from master password and user salt
 * Using PBKDF2 with 100,000 iterations
 */
function deriveEncryptionKey(masterPassword, salt) {
  return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    100000,
    32,
    'sha256'
  );
}

/**
 * Generate a random salt for user
 */
function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt password using AES-256-GCM
 * @param {string} text - Plain text password to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @returns {object} - Contains encrypted text, IV, and auth tag
 */
function encryptPassword(text, key) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedPassword: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
}

/**
 * Decrypt password using AES-256-GCM
 * @param {string} encryptedText - Encrypted password in hex
 * @param {Buffer} key - 32-byte encryption key
 * @param {string} ivHex - Initialization vector in hex
 * @param {string} authTagHex - Authentication tag in hex
 * @returns {string} - Decrypted plain text password
 */
function decryptPassword(encryptedText, key, ivHex, authTagHex) {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: Invalid key or corrupted data');
  }
}

/**
 * Generate a strong random password
 */
function generateStrongPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

module.exports = {
  deriveEncryptionKey,
  generateSalt,
  encryptPassword,
  decryptPassword,
  generateStrongPassword
};