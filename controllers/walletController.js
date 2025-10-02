import Wallet from "../models/walletModel.js";
import Transaction from "../models/transactionModel.js";
import Referral from "../models/referralModel.js";
import UserInvestment from "../models/userInvestmentModel.js";
import User from "../models/userModel.js";


export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.userId; 
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }
    res.status(200).json({ success: true, wallet });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
    if (!transactions) {
      return res.status(404).json({ success: false, message: "No transactions found" });
    }
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const depositFunds = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, walletAddress } = req.body;

    const user = await User.findById(userId).select("address");

    // Optional: check minimum deposit
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid deposit amount" });
    }

    // Just check if wallet exists, but DO NOT update balance here
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    // Create deposit transaction with status: pending
    const transaction = await Transaction.create({
      userId,
      type: "deposit",
      amount,
      status: "pending",
      address: walletAddress || null
    });

    res.status(200).json({
      success: true,
      message: "Deposit request submitted. Awaiting admin approval.",
      transaction
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


export const withdrawFunds = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, walletAddress } = req.body;

    const user = await User.findById(userId).select("address");

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal amount" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const plan = await UserInvestment.findOne({ userId });

    let availableBalance = wallet.balance;
    if (plan && plan.status === "active") {
      availableBalance -= plan.lockedAmount;
    }

    if (amount < 50) {
      return res.status(400).json({ success: false, message: "Minimum withdrawal is $50" });
    }

    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient withdrawable balance. You can withdraw up to ${availableBalance}`,
      });
    }

     // ✅ Deduct amount from wallet immediately
    wallet.balance -= amount;
    await wallet.save();


    await Transaction.create({
      userId,
      type: "withdrawal",
      amount,
      status: "pending",
      address: walletAddress || null
    });

    res.status(200).json({
      success: true,
      message: "Withdrawal request submitted and pending admin approval.",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// GET /api/reward/referral-income
export const getReferralIncomeDetails = async (req, res) => {
  try {
    const userId = req.userId;

    const referrals = await Referral.find({ referredBy: userId, isCommissionGiven: true })
      .populate("referredUser", "name email username")
      .exec();

    const result = [];

    for (const ref of referrals) {
      const investment = await UserInvestment.findOne({ userId: ref.referredUser._id });
      const rewardAmount = investment ? investment.amount * (ref.commissionPercent / 100) : 0;

      result.push({
        fromUser: ref.referredUser,
        rewardAmount,
        investmentAmount: investment ? investment.amount : 0,
        commissionPercent: ref.commissionPercent,
        date: ref.createdAt,
      });
    }

    res.status(200).json({
      success: true,
      message: "Referral income details fetched",
      data: result,
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
