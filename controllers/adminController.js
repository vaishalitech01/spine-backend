import InvestmentPlan from "../models/investmentPlanModel.js";
import User from "../models/userModel.js";
import Wallet from "../models/walletModel.js";
import RewardWallet from "../models/rewardWalletModel.js";
import Referral from "../models/referralModel.js";
import Transaction from "../models/transactionModel.js";
import Spin from "../models/spinModel.js";
import UserInvestment from "../models/userInvestmentModel.js";
import sendEmailBan from "../utils/sendEmailBan.js";

export const createInvestmentPlan = async (req, res) => {
  try {
    const { name, roiPercent, minAmount, durationDays, autoPayout } = req.body;

    // Check if the investment plan already exists
    const existingPlan = await InvestmentPlan.findOne({ name });
    if (existingPlan) {
      return res
        .status(400)
        .json({ success: false, message: "Investment plan already exists" });
    }

    // Create a new investment plan
    const newPlan = await InvestmentPlan.create({
      name,
      roiPercent,
      minAmount,
      durationDays,
      autoPayout: autoPayout || false,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Investment plan created successfully",
        plan: newPlan,
      });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllInvestmentPlans = async (req, res) => {
  try {
    const plans = await InvestmentPlan.find().sort({ createdAt: -1 }); // Sort by latest first
    if (plans.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Investment plan not found" });
    }
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllUserInvestments = async (req, res) => {
  try {
    const investments = await UserInvestment.find()
      .populate("planId", "name roiPercent")
      .sort({ createdAt: -1 });
    if (investments.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: " No user had Investment plan" });
    }
    res.status(200).json({ success: true, investments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).sort({ createdAt: -1 });

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const wallet = await Wallet.findOne({ userId: user._id });
        const rewardWallet = await RewardWallet.findOne({ userId: user._id });
        const transactions = await Transaction.find({ userId: user._id });

        return {
          ...user.toObject(),
          wallet: wallet || {},
          rewardWallet: rewardWallet || {},
          transactions,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: "user" });
    const wallet = await Wallet.findOne({ userId: id });
    if (!user || !wallet) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user, wallet });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // ✅ Total Stats
    const totalUsers = await User.countDocuments();
    const totalReferrals = await Referral.countDocuments();

    // ✅ Total deposits & withdrawals
    const transactions = await Transaction.find();
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "deposit") {
        totalDeposits += transaction.amount;
      } else if (transaction.type === "withdrawal") {
        totalWithdrawals += transaction.amount;
      }
    });

    // ✅ Today's users
    const todayUsers = await User.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // ✅ Today's referrals
    const todayReferrals = await Referral.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // ✅ Today's deposits
    const todayDepositsAgg = await Transaction.aggregate([
      {
        $match: {
          type: "deposit",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayDeposits = todayDepositsAgg[0]?.total || 0;

    // ✅ Today's withdrawals
    const todayWithdrawalsAgg = await Transaction.aggregate([
      {
        $match: {
          type: "withdrawal",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayWithdrawals = todayWithdrawalsAgg[0]?.total || 0;

    // ✅ Final response
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalReferrals,
        totalDeposits,
        totalWithdrawals,
        todayUsers,
        todayReferrals,
        todayDeposits,
        todayWithdrawals,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Ban or activate user
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      user,
    });

    // ✅ Trigger email asynchronously (no await)
    if (status === "banned") {
      sendEmailBan(user.email, user._id)
        .then(() => console.log(`Ban email sent to ${user.email}`))
        .catch((err) => console.error("Error sending ban email:", err));
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// View all Deposits;
export const getAllDeposits = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: "deposit" })
      .populate("userId", "name username email role status")
      .sort({ createdAt: -1 })
      .exec();
    if (!transactions) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// View All withdrawals
export const getAllWithdrawals = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: "withdrawal" })
      .populate("userId", "name username email role status")
      .sort({ createdAt: -1 })
      .exec();
    if (!transactions) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleDepositApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Transaction ID is required" });
    }

    const transaction = await Transaction.findById(id).populate(
      "userId",
      "name email phone createdAt"
    );
    if (!transaction || transaction.type !== "deposit") {
      return res
        .status(404)
        .json({ success: false, message: "Deposit transaction not found" });
    }

    if (transaction.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Transaction already processed" });
    }

    transaction.status = status;
    await transaction.save();

    if (status === "completed") {
      const wallet = await Wallet.findOne({ userId: transaction.userId._id });

      if (!wallet) {
        return res
          .status(404)
          .json({ success: false, message: "User wallet not found" });
      }

      wallet.balance += transaction.amount;
      await wallet.save();

      return res.status(200).json({
        success: true,
        message: "Deposit approved and wallet updated",
        transaction,
        wallet,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Deposit status set to ${status}`,
      transaction,
    });
  } catch (error) {
    console.error("Deposit approval error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const handleWithdrawalApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (id) {
      // Handle single withdrawal toggle
      const trans = await Transaction.findById(id).populate(
        "userId",
        "name email phone createdAt"
      );

      if (!trans) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      }

      if (trans.amount < 50) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Transaction amount must be greater than 50",
          });
      }

      if (trans.type !== "withdrawal" || trans.status !== "pending") {
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid transaction type or already processed",
          });
      }

      if (status === "completed") {
        // ✅ Just mark as completed (no deduction, already done earlier)
        trans.status = "completed";
      } else if (status === "rejected") {
        // ✅ Refund the amount
        const wallet = await Wallet.findOne({ userId: trans.userId._id });
        if (wallet) {
          wallet.balance += trans.amount;
          await wallet.save();
        }
        trans.status = "rejected";
      }
      await trans.save();

      return res.status(200).json({
        success: true,
        message: "Withdrawal status updated successfully",
        transaction: trans,
        user: trans.userId, // Full user info
      });
    } else {
      // Bulk approval of all pending withdrawals
      const transactions = await Transaction.find({
        type: "withdrawal",
        status: "pending",
      }).populate("userId", "name email phone createdAt");

      if (!transactions.length) {
        return res
          .status(404)
          .json({ success: false, message: "No pending withdrawals found" });
      }

      const results = [];

      for (let t of transactions) {
        const wallet = await Wallet.findOne({ userId: t.userId._id });
        if (wallet && wallet.balance >= t.amount) {
          wallet.balance -= t.amount;
          await wallet.save();
          t.status = "completed";
          await t.save();
          results.push({
            transaction: t,
            user: t.userId,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "All valid pending withdrawals approved and wallet updated",
        transactions: results,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

//View All Transactions and reports
export const getAllTransactionReports = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({
      createdAt: -1,
    });
    if (!transactions) {
      return res
        .status(404)
        .json({ success: false, message: "Transactions not there yet" });
    }

    res.status(200).json({
      success: true,
      message: "Transactions fetched",
      transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// update investment plan
export const updateInvestmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roiPercent, minAmount, durationDays, autoPayout } = req.body;

    // Find the plan by ID
    const plan = await InvestmentPlan.findById(id);
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Investment plan not found" });
    }

    // Update fields if provided
    if (name !== undefined) plan.name = name;
    if (roiPercent !== undefined) plan.roiPercent = roiPercent;
    if (minAmount !== undefined) plan.minAmount = minAmount;
    if (durationDays !== undefined) plan.durationDays = durationDays;
    if (autoPayout !== undefined) plan.autoPayout = autoPayout;

    await plan.save();

    res.status(200).json({
      success: true,
      message: "Investment plan updated successfully",
      data: plan,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// View all spins
export const getSpinLogs = async (req, res) => {
  try {
    const spins = await Spin.find()
      .populate("userId", "name username email role status").sort({ createdAt: -1 })
      .exec();
    if (!spins || spins.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No spins found" });
    }

    res.status(200).json({ success: true, spins });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Referral system stats
export const getReferralStats = async (req, res) => {
  try {
    const referrals = await Referral.find()
      .populate("referredBy", "name email")
      .populate("referredUser", "name email")
      .exec();
    res.status(200).json({ success: true, referrals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePlans = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPlan = await InvestmentPlan.findByIdAndDelete(id);

    if (!deletedPlan) {
      return res.json({ message: "Plan not found" });
    }

    res.json({ message: "Plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
