const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  masterPasswordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  salt: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('masterPasswordHash')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.masterPasswordHash = await bcrypt.hash(this.masterPasswordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.masterPasswordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.masterPasswordHash;
  delete user.refreshToken;
  delete user.salt;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);