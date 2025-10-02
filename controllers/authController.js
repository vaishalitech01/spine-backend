import User from "../models/userModel.js";
import Wallet from "../models/walletModel.js";
import RewardWallet from "../models/rewardWalletModel.js";
import Referral from "../models/referralModel.js";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";
import Transaction from "../models/transactionModel.js";

// 🔐 Token Generator
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// SIGNUP
export const signup = async (req, res) => {
  try {
    const { name, username, email, password, mobile, role, referralCode } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // allow only one admin
    if (role === "admin") {
      const existingAdmin = await User.findOne({ role: "admin" });
      if (existingAdmin) {
        return res.status(400).json({ error: "An admin already exists. Only one admin is allowed." });
      }
    }

    // create user
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = await User.create({
      name,
      username,
      email,
      password,
      mobile,
      role: role || "user",
      code,
    });

    // create wallets
    await Wallet.create({ userId: newUser._id });
    await RewardWallet.create({ userId: newUser._id });

    // referral system
    if (referralCode) {
      const referrer = await User.findOne({ code: referralCode });
      if (referrer) {
        Referral.create({
          referredBy: referrer._id,
          referredUser: newUser._id,
          commissionPercent: 10,
          isCommissionGiven: false,
        }).catch((err) => console.error("Referral creation error:", err.message));

        // Transaction.create({
        //   userId: referrer._id,
        //   type: "credit",
        //   amount: 10, // Referral bonus amount
        //   reason: `Referral bonus for referring ${newUser.username}`,
        // }).catch((err) => console.error("Referral bonus transaction error:", err.message));
      }
    }

    // ✅ Respond immediately (fast)
    res.status(201).json({
      success: true,
      message: "Signup successful",
      token: generateToken(newUser._id),
    });

    // 📩 Send email in background (non-blocking)
    // 📩 Send welcome email using Brevo API (non-blocking)
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail({
      sender: { email: process.env.SENDER_EMAIL, name: "Spin App" },
      to: [{ email }],
      subject: "🎉 Welcome to Spin App!",
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #0d1117; padding: 40px; color: #f0f0f0;">
          <div style="max-width: 600px; margin: auto; background-color: #161b22; border: 2px solid #ffd700; border-radius: 12px; padding: 30px; text-align: center; box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);">
            <h1 style="color: #ffd700; font-size: 28px; margin-bottom: 10px;">🎉 Welcome to Spin & Win!</h1>
            <p style="font-size: 16px; color: #dcdcdc;">
              Hello <strong>${name || "Investor"}</strong>,
            </p>
            <p style="font-size: 15px; margin-top: 20px; line-height: 1.8;">
              🌀 You’ve just entered the world of <strong>luck, strategy, and wealth!</strong><br/>
              🎯 Spin the wheel to earn rewards<br/>
              💼 Invest your winnings to grow your empire<br/>
              🏆 Climb the leaderboard and become a 💸 <strong>Money Master</strong>
            </p>
            <div style="margin: 30px 0;">
              <img src="https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif" alt="Spin & Win" style="width: 180px; border-radius: 10px;" />
            </div>
            <p style="font-size: 14px; color: #aaaaaa;">
              This isn’t just a game — it’s your path to virtual riches.<br/>
              Spin daily, invest smartly, and watch your coins multiply. 🔄💹
            </p>
            <p style="font-size: 13px; color: #555; margin-top: 40px;">
              🔒 Tip: Luck favors the bold. But wisdom builds the kingdom. Choose wisely.
            </p>
          </div>
          <p style="text-align: center; font-size: 11px; color: #999; margin-top: 25px;">
            © ${new Date().getFullYear()} Spin & Earn Inc. • All spins are fair. All dreams are welcome.
          </p>
        </div>
      `,
    });

    apiInstance.sendTransacEmail(sendSmtpEmail)
      .then((response) => console.log("✅ Welcome email sent:", response))
      .catch((err) => console.error("❌ Welcome email failed:", err));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({  success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ success: false, message: "Account is not active" });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: generateToken(user._id),
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 👤 GET USER
export const getUser = async (req, res) => {
  try {
    const userId = req.userId;

    const [user, wallet] = await Promise.all([
      User.findOne({ _id: userId, role: "user" }).select("-password -__v"),
      Wallet.findOne({ userId }).select("-__v"),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    return res.status(200).json({
      success: true,
      data: { user, wallet },
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};