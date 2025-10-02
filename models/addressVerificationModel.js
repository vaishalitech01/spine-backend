import mongoose from 'mongoose';

const addressVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otpExpiresAt: {
    type: Date,
    required: true,
  },
});

export default mongoose.model('AddressVerification', addressVerificationSchema);
