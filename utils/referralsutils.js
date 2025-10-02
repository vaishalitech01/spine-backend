import Referral from "../models/referralModel.js";
import ReferralTransaction from "../models/referralTransactionModel.js";
import RewardWallet from "../models/rewardWalletModel.js";
import Transaction from "../models/transactionModel.js";

export const COMMISSION_LEVELS = [10, 5, 3];

export const distributeReferralCommission = async (userId, investmentAmount, investmentId) => {
  try {
    let currentUserId = userId;
    const visited = new Set(); // prevent circular referrals

    for (let level = 0; level < COMMISSION_LEVELS.length; level++) {
      // 🔎 Find who referred the current user
      const referral = await Referral.findOne({ referredUser: currentUserId });
      if (!referral || !referral.referredBy) break; // no more parents in the chain

      const referrerId = referral.referredBy;

      // 🛑 Prevent infinite loops
      if (visited.has(referrerId.toString())) break;
      visited.add(referrerId.toString());

      const commissionPercent = COMMISSION_LEVELS[level];
      const commissionAmount = (investmentAmount * commissionPercent) / 100;

      // 🔎 Prevent duplicate payout for same investment + referrer
      const alreadyPaid = await ReferralTransaction.findOne({
        referrerId,
        referredUserId: userId,
        investmentId,
        level: level + 1,
      });
      if (alreadyPaid) {
        currentUserId = referrerId;
        continue;
      }

      // ✅ Add commission to RewardWallet with transaction log
      await RewardWallet.findOneAndUpdate(
        { userId: referrerId },
        {
          $inc: { balance: commissionAmount },
          $push: {
            transactions: {
              type: "credit",
              amount: commissionAmount,
              reason: `Referral Level ${level + 1} commission`,
              investmentId,
            },
          },
        },
        { new: true, upsert: true }
      );

      // ✅ Record commission in ReferralTransaction
      await ReferralTransaction.create({
        referrerId,
        referredUserId: userId,
        investmentId,
        amount: commissionAmount,
        level: level + 1,
      });

      await Transaction.create({
        userId: referrerId,
        type: "bonus",
        amount: commissionAmount,
        status: "completed",
      });

      // ✅ Only mark direct referral (level 1) as commission given
      if (level === 0) {
        referral.isCommissionGiven = true;
        await referral.save();
      }

      console.log(
        `Level ${level + 1} → ${referrerId} earned ${commissionAmount} from ${userId}`
      );

      // ⬆️ Move up the referral chain
      currentUserId = referrerId;
    }
  } catch (error) {
    console.error("Referral commission error:", error.message);
  }
};

// Recursive function to build flat array of referrals
export const buildFlatReferralArray = async (userId, level = 1, maxLevel = 3, parentId = null) => {
  if (level > maxLevel) return [];

  const directRefs = await Referral.find({ referredBy: userId }).populate("referredUser", "name username email");
  let flatArray = [];

  for (const ref of directRefs) {
    const tx = await ReferralTransaction.findOne({
      referrerId: userId,
      referredUserId: ref.referredUser._id,
    });

    // Add current referral to array
    flatArray.push({
      _id: ref.referredUser._id,
      name: ref.referredUser.name,
      username: ref.referredUser.username,
      email: ref.referredUser.email,
      level,
      commissionAmount: tx ? tx.amount : 0,
      createdAt: ref.createdAt,
      referredBy: parentId, // who referred this user
    });

    // Add sub-referrals recursively
    const subReferrals = await buildFlatReferralArray(ref.referredUser._id, level + 1, maxLevel, ref.referredUser._id);
    flatArray = flatArray.concat(subReferrals);
  }

  return flatArray;
};