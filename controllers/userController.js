import mongoose from "mongoose";
import User from "../models/userModel.js";
import Wallet from "../models/walletModel.js";
import RewardWallet from "../models/rewardWalletModel.js";
import ReferralTransaction from "../models/referralTransactionModel.js";
import Transaction from "../models/transactionModel.js";
import transporter from "../config/nodemailer.js";


// 🟢 Get Reward Wallet Transactions
export const getRewardWalletTransactions = async (req, res) => {
  try {
    const rewardWallet = await RewardWallet.findOne({ userId: req.userId });
    if (!rewardWallet) {
      return res.status(404).json({ message: "Reward wallet not found" });
    }

    res.status(200).json({
      success: true,
      transactions: rewardWallet.transactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🟢 Withdraw from Wallet
export const withdrawFromWallet = async (req, res) => {
  try {
    const { amount, from } = req.body;
    const userId = req.userId;

    if (!["main", "reward"].includes(from)) {
      return res.status(400).json({ message: "Invalid wallet type" });
    }

    if (from === "main") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < amount) {
        return res.status(400).json({ message: "Insufficient main wallet balance" });
      }
      wallet.balance -= amount;
      await wallet.save();
    } else {
      const rewardWallet = await RewardWallet.findOne({ userId });
      if (!rewardWallet || rewardWallet.balance < amount) {
        return res.status(400).json({ message: "Insufficient reward wallet balance" });
      }
      rewardWallet.balance -= amount;
      rewardWallet.transactions.push({
        type: "debit",
        amount,
        reason: "User withdrawal",
      });
      await rewardWallet.save();
    }

    res.status(200).json({ message: "Withdrawal successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🟢 Get Employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const user = await User.findById(employeeId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const wallet = await Wallet.findOne({ userId: employeeId });
    if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

    const { password, ...userDetails } = user._doc;
    const { balance, ...walletDetails } = wallet._doc;

    const userWithWallet = {
      ...userDetails,
      wallet: {
        ...walletDetails,
        balance: balance.toFixed(2),
      },
    };

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user: userWithWallet,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🟢 Update User
export const updateUser = async (req, res) => {
  try {
    const userId = req.userId;
    const updateData = {};

    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.mobile) updateData.mobile = req.body.mobile;

    if (req.userRole === "admin") {
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.status) updateData.status = req.body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No valid update fields provided" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { password, ...userDetails } = updatedUser._doc;

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: userDetails,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🟢 Upload Avatar
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.userId;
    const { avatarUrl } = req.body;

    if (!userId || !avatarUrl) {
      return res.status(400).json({ success: false, message: "userId and avatarUrl are required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { avatarUrl },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🟢 Get Reward History
export const getRewardHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const transactions = await ReferralTransaction.find({ referrerId: userId })
      .populate("referredUserId", "name email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      message: "Reward history fetched",
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

//User summary dashboard todays earning , balanced & frozen amount 

export const getUserDashboardSummary = async (req, res) => {
  try {
    const userId = req.userId;

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const spinEarnings = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: "bonus",
          createdAt: { $gte: todayStart, $lte: todayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const referralEarnings = await ReferralTransaction.aggregate([
      {
        $match: {
          referrerId: userId,
          createdAt: { $gte: todayStart, $lte: todayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const todaysEarnings = 
      (spinEarnings[0]?.total || 0) + 
      (referralEarnings[0]?.total || 0);

    // ✅ Fetch latest 5 transactions
    const latestTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 }) // sort by newest
      .limit(5)
      .select("-__v"); // optionally exclude __v

    res.status(200).json({
      success: true,
      data: {
        todaysEarnings: Number(todaysEarnings.toFixed(2)),
        balance: Number(wallet.balance.toFixed(2)),
        frozenAmount: Number(wallet.lockedBalance.toFixed(2)),
        recentTransactions: latestTransactions
      }
    });
  } catch (error) {
    console.error("Error in getUserDashboardSummary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// sentOtp in Email

export const sendOtp = async(req,res)=>{
   

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if(!user){
      return res.json({success:false,message:"User not found"})
    }
     const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.otp = otp;
   user.otpExprieAt= Date.now() + 15 * 60 * 1000;

   await user.save();

    const OptionMail =  {
    from: process.env.SENDER_EMAIL,
    to: user.email,
    subject: "🔐 Your OTP Code for Verification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="text-align: center; color: #333;">Verification Code</h2>
        <p>Hi <strong>${user.name || "User"}</strong>,</p>
        <p>We received a request to verify your email. Please use the OTP below to complete the process:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; letter-spacing: 8px; background: #fff; padding: 10px 20px; border: 2px dashed #007BFF; border-radius: 6px; color: #007BFF;">
            ${otp}
          </span>
        </div>
        <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p style="margin-top: 40px;">Thanks & Regards,<br/>The Team</p>
        <hr style="margin-top: 30px;" />
        <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
      </div>
    `
};
  await transporter.sendMail(OptionMail)

    res.json({
      success:true,
      message:"Code has ben sent successfully",
      otp
    })

  } catch (error) {
    
  }
}

// resetPassword
export const resetPassword = async (req, res) => {
  const { email, otpp, newpassword } = req.body;
  try {
    const user = await User.findOne({ email });
      
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
   
    // Check if OTP is missing or incorrect
    if (!otpp || otpp !== user.otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // Check if OTP is expired
    if (Date.now() > user.otpExprieAt) {
      return res.json({ success: false, message: "OTP has expired" });
    }
   user.password = newpassword;
    user.otp = "";
    user.otpExprieAt = 0;

    await user.save();

    res.json({ success: true, message: "Password has been changed successfully", });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getTodayEarnings = async (req, res) => {
  try {
    const userId = req.userId;

    // Full day range: 12:00 AM to 11:59:59 PM
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayEarningAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          type: { $in: ["bonus"] },
          status: "completed",
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalEarning: { $sum: "$amount" },
        },
      },
    ]);

    const todayEarnings = todayEarningAgg[0]?.totalEarning || 0;

    res.status(200).json({
      todayEarnings
    });
  } catch (error) {
    console.error("Error in getTodayEarnings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "All transactions fetched",
      data: transactions,
    });
  } catch (error) {
    console.error("Error in getAllTransactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


