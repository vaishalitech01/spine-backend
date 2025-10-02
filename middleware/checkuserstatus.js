import User from "../models/userModel.js";

export const checkUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User Is Banned" });
    }

    if (user.status === "banned") {
      return res.status(403).json({ success: false, message: "Your account is banned. Contact admin." });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
