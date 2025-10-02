import User from "../models/userModel.js";
import Referral from "../models/referralModel.js";
import Wallet from "../models/walletModel.js";
import Spin from "../models/spinModel.js";
import RewardWallet from "../models/rewardWalletModel.js";
import ReferralTransaction from "../models/referralTransactionModel.js";
import UserInvestment from "../models/userInvestmentModel.js";
// import { buildFlatReferralArray } from "../utils/referralsutils.js";

// ✅ Get Own Referral Code & Referral link
export const getReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const referralCode = user.code;
    const referralLink = `https://yourbackend.com/r/${referralCode}`;

    res.status(200).json({
      success: true,
      message: "Referral code fetched",
      code: referralCode,
      referralLink: referralLink
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Referral Tree
export const getReferralTree = async (req, res) => {
  try {
    const userId = req.userId;
    const referralTree = await Referral.find({ referredBy: userId }).populate("referredUser", "name username email mobile role");
    res.status(200).json({ success: true, message: "Referral tree fetched", referralTree });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Referral Summary
export const getReferralSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const referrals = await Referral.find({ referredBy: userId }).populate("referredUser", "name email username createdAt").sort({ createdAt: -1 });

    const totalReferrals = referrals.length;
    const totalCommission = referrals.reduce((sum, ref) =>
      ref.isCommissionGiven ? sum + ref.commissionPercent : sum, 0
    );

    res.status(200).json({
      success: true,
      message: "Referral summary fetched",
      data: {
        totalReferrals,
        totalCommission,
        referrals: referrals.map(ref => ({
          referredUser: ref.referredUser,
          isCommissionGiven: ref.isCommissionGiven,
          createdAt: ref.createdAt,
        }))
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ All Referrals (Admin use)
export const getAllReferral = async (req, res) => {
  try {
    const referrals = await Referral.find({}).populate("referredBy").populate("referredUser");
    res.status(200).json({ success: true, message: "All referrals fetched", referrals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ My Referral Used Info
export const getMyReferralUsedInfo = async (req, res) => {
  try {
    const userId = req.userId;

    const referral = await Referral.findOne({ referredUser: userId })
      .populate("referredBy", "name email username");

    if (!referral) {
      return res.status(404).json({ success: false, message: "No referral used by you" });
    }

    const investment = await UserInvestment.findOne({ userId });

    const rewardAmountGiven = investment ? investment.amount * (referral.commissionPercent / 100) : 0;

    res.status(200).json({
      success: true,
      message: "Your referral usage info fetched",
      data: {
        referrer: referral.referredBy,
        investmentAmount: investment ? investment.amount : 0,
        rewardGivenToReferrer: rewardAmountGiven,
        commissionPercent: referral.commissionPercent,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// Get referral summary (total commissions from all levels)
// export const getReferralSummary = async (req, res) => {
//   try {
//     const userId = req.userId;

//     // ✅ Get all referrals made by this user
//     const referrals = await Referral.find({ referredBy: userId })
//       .populate("referredUser", "name email username");

//     // ✅ Get all transactions by this user
//     const transactions = await ReferralTransaction.find({ referrerId: userId });

//     const totalReferrals = referrals.length;

//     const totalCommission = transactions.reduce((sum, t) => sum + t.amount, 0);

//     // Map referrals with earned commission if available
//     const referralDetails = referrals.map(ref => {
//       // Find if there is a transaction for this referred user
//       const tx = transactions.find(t => t.referredUserId.toString() === ref.referredUser._id.toString());
//       return {
//         referredUser: ref.referredUser,
//         isCommissionGiven: !!tx,
//         commissionAmount: tx ? tx.amount : 0,
//         commissionPercent: tx ? tx.commissionPercent : ref.commissionPercent,
//         createdAt: ref.createdAt,
//       };
//     });

//     res.status(200).json({
//       success: true,
//       data: {
//         totalReferrals,
//         totalCommission,
//         referrals: referralDetails,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };


// API to get all sub-referrals of a specific direct referral (entire chain)
export const getSubReferralsByDirectReferral = async (req, res) => {
  try {
    const { directReferralId } = req.params;

    if (!directReferralId) {
      return res.status(400).json({ success: false, message: "Direct referral ID is required" });
    }

    // Fetch all sub-referrals recursively as a flat array
    const subReferrals = await buildFlatReferralArray(directReferralId, 2, 3, directReferralId);

    res.status(200).json({ success: true, directReferralId, subReferrals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Recursive function to get all sub-referrals
const buildFlatReferralArray = async (userId, level = 1, maxLevel = 3, parentId = null) => {
  if (level > maxLevel) return [];

  const directRefs = await Referral.find({ referredBy: userId }).populate("referredUser", "name username email");
  let flatArray = [];

  for (const ref of directRefs) {
    const tx = await ReferralTransaction.findOne({
      referrerId: userId,
      referredUserId: ref.referredUser._id,
    });

    flatArray.push({
      _id: ref.referredUser._id,
      name: ref.referredUser.name,
      username: ref.referredUser.username,
      email: ref.referredUser.email,
      level,
      commissionAmount: tx ? tx.amount : 0,
      createdAt: ref.createdAt,
      referredBy: parentId, // track which direct referral branch this belongs to
    });

    // Recursively add sub-referrals
    const subReferrals = await buildFlatReferralArray(ref.referredUser._id, level + 1, maxLevel, ref.referredUser._id);
    flatArray = flatArray.concat(subReferrals);
  }

  return flatArray;
};


