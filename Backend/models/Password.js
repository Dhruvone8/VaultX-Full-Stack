const mongoose = require('mongoose');

const passwordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  site: {
    type: String,
    required: [true, 'Website URL is required'],
    trim: true,
    minlength: [3, 'Website URL must be at least 3 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [1, 'Username must be at least 1 character']
  },
  encryptedPassword: {
    type: String,
    required: [true, 'Password is required']
  },
  iv: {
    type: String,
    required: true // Initialization vector for AES encryption
  },
  authTag: {
    type: String,
    required: true // Authentication tag for AES-GCM
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
passwordSchema.index({ userId: 1, createdAt: -1 });

// Update timestamp on save
passwordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Password', passwordSchema);