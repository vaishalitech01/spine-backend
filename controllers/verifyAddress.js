import AddressVerification from '../models/addressVerificationModel.js';
import User from '../models/userModel.js';
import sendEmail from '../utils/sendMail.js'; // your email utility
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

export const verifyAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Directly save the verified address
    await AddressVerification.findOneAndUpdate(
      { userId },
      { address, isVerified: true, verifiedAt: new Date() },
      { upsert: true }
    );

     await User.findByIdAndUpdate(userId, {
      address: address
    });

    res.status(200).json({
      message: 'Address verified successfully',
      verifiedAddress: process.env.BinanceAddress,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// export const verifyAddress = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { address } = req.body;

//     const user = await User.findById(userId);
//     if (!user || !user.email) {
//       return res.status(404).json({ message: 'User email not found' });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//     await AddressVerification.findOneAndUpdate(
//       { userId },
//       { address, otp, otpExpiresAt: expires, isVerified: false },
//       { upsert: true }
//     );

//     // Send OTP to user email
//   await sendEmail(user.email, 'Address Verification OTP', otp);


//     res.status(200).json({ message: 'OTP sent to your email.' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

export const verifyOtp = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otp } = req.body;

    const record = await AddressVerification.findOne({ userId });

    if (!record) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    if (record.otp !== otp || record.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // ✅ Mark as verified
    record.isVerified = true;
    await record.save();

    // ✅ Save verified address to User model
    await User.findByIdAndUpdate(userId, {
      address: record.address
    });

    res.status(200).json({
      message: 'Address verified successfully',
      verifiedAddress: process.env.BinanceAddress,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
