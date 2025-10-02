// middleware/checkUpiVerified.js
import UpiVerification from "../models/UpiVerification.js";

export const checkUpiVerified = async (req, res, next) => {
  const userId = req.user._id;

  const record = await UpiVerification.findOne({ user: userId });

  if (!record || !record.isVerified) {
    return res.status(403).json({ message: "UPI not verified. Please verify before proceeding." });
  }

  next();
};
