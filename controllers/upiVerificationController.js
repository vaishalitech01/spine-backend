// controllers/upiVerificationController.js
import UpiVerification from "../models/UpiVerification.js";
import User from "../models/userModel.js";
import crypto from "crypto";
import sendEmail from "../utils/sendMail.js";

export const requestUpiVerification = async (req, res) => {
  try {
    const { upiId } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Binance user not found" });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    await UpiVerification.findOneAndUpdate(
      { user: userId },
      { upiId, otp, otpExpiresAt: new Date(expiry), isVerified: false },
      { upsert: true, new: true }
    );

    await sendEmail(user.email, "Your Binance OTP", `${otp}`);

    return res.status(200).json({ message: "Binance OTP sent to your email" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Binance internal server error" });
  }
};

export const verifyUpiOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user._id;

    const record = await UpiVerification.findOne({ user: userId });

    if (!record) return res.status(404).json({ message: "Binance record not found" });
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid Binance OTP" });
    if (record.otpExpiresAt < Date.now()) return res.status(400).json({ message: "Binance OTP expired" });

    record.isVerified = true;
    await record.save();

    return res.status(200).json({ message: "Binance verification successful" });
  } catch (err) {
    return res.status(500).json({ message: "Binance server error" });
  }
};

