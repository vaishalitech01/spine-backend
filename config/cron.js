import cron from "node-cron";
import UserInvestment from "../models/userInvestmentModel.js";
import Wallet from "../models/walletModel.js";
import InvestmentPlan from "../models/investmentPlanModel.js";
import Notification from "../models/notificationModel.js";
import Transaction from "../models/transactionModel.js";

// Runs daily at 12:00 AM and 12:00 PM
cron.schedule("0 0,12 * * *", async () => {
  console.log("🔁 Running Auto Payout Job...");

  try {
    const activeInvestments = await UserInvestment.find({ status: "active" });

    for (let investment of activeInvestments) {
      const plan = await InvestmentPlan.findById(investment.planId);
      const userWallet = await Wallet.findOne({ userId: investment.userId });

      if (!plan || !userWallet) continue;

      const today = new Date();
      const startDate = new Date(investment.startDate);
      const endDate = new Date(investment.endDate);
      const lastPayout = investment.lastPayoutDate || startDate;

      // 1️⃣ Handle autoPayout (daily ROI)
      if (plan.autoPayout) {
        const daysDiff = Math.floor(
          (today - lastPayout) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff >= 1 && today < endDate) {
          const dailyROI = (investment.amount * plan.roiPercent) / 100; // daily %
          const totalROI = dailyROI * daysDiff;

          // Credit wallet
          userWallet.balance += totalROI;
          await userWallet.save();

          // Update investment
          investment.earning += totalROI;
          investment.lastPayoutDate = today;
          await investment.save();
      
          await Transaction.create({
            userId: investment.userId,
            type: "bonus",
            amount: totalROI,
            status: "completed",
          });

          // Notify user
          await Notification.create({
            userId: investment.userId,
            message: `You received daily ROI of $${totalROI.toFixed(
              2
            )} for your investment.`,
          });

          console.log(
            `✅ Credited $${totalROI.toFixed(2)} ROI to user ${
              investment.userId
            }`
          );
        }
      }

      // 2️⃣ Handle investment completion (maturity reached)
      if (today >= endDate) {
        if (plan.autoPayout) {
          // Auto payout → only return principal (ROI already paid daily)
          userWallet.balance += investment.amount;
          userWallet.lockedBalance -= investment.amount;
          await userWallet.save();

          investment.status = "completed";
          investment.lastPayoutDate = today;
          await investment.save();

          console.log(
            `✅ Auto plan completed: Returned principal for user ${investment.userId}`
          );
        } else {
          // Non-auto payout → pay full ROI + principal at maturity
          const finalROI = (investment.amount * plan.roiPercent) / 100;

          userWallet.balance += investment.amount + finalROI;
          userWallet.lockedBalance -= investment.amount;
          await userWallet.save();

          investment.earning += finalROI;
          investment.status = "completed";
          investment.lastPayoutDate = today;
          await investment.save();

          await Transaction.create({
            userId: investment.userId,
            type: "bonus",
            amount: finalROI,
            status: "completed",
          });


          await Notification.create({
            userId: investment.userId,
            message: `Your investment matured. Principal $${
              investment.amount
            } + ROI $${finalROI.toFixed(2)} have been credited.`,
          });

          console.log(
            `✅ Non-auto plan completed: Credited principal + ROI for user ${investment.userId}`
          );
        }
      }
    }

    console.log("✅ Auto payout job finished.");
  } catch (error) {
    console.error("❌ Error in auto payout job:", error.message);
  }
});

// import cron from 'node-cron';
// import UserInvestment from '../models/userInvestmentModel.js';
// import Wallet from '../models/walletModel.js';
// import InvestmentPlan from '../models/investmentPlanModel.js';
// import Notification from '../models/notificationModel.js';

// // Runs every day at midnight
// cron.schedule('*/1 * * * *', async () => {
//   console.log('🔁 Running Auto Payout Job...');

//   try {
//     const activeInvestments = await UserInvestment.find({ status: 'active' });

//     for (let investment of activeInvestments) {
//       const plan = await InvestmentPlan.findById(investment.planId);
//       const userWallet = await Wallet.findOne({ userId: investment.userId });

//       if (!plan || !userWallet) continue;

//       const today = new Date();
//       const endDate = new Date(investment.endDate);

//       if (today >= endDate) {
//        const roiAmount = (investment.amount * plan.roiPercent) / 100;

//         userWallet.balance += roiAmount;
//         userWallet.lockedBalance -= investment.amount;
//         userWallet.balance += investment.amount;
//         await userWallet.save();

//         investment.status = 'completed';
//         investment.lastPayoutDate = today;
//         await investment.save();

//         console.log(`✅ Credited ROI of $${roiAmount} and unlocked funds for user ${investment.userId}`);

//         // ✅ Save notification for this user
//         await Notification.create({
//           userId: investment.userId,
//           message: `Your investment plan has completed. ROI of $${roiAmount} and your locked funds of $${investment.amount} have been credited.`
//         });
//       }
//     }

//     console.log('✅ Auto payout job finished.');
//   } catch (error) {
//     console.error('❌ Error in auto payout job:', error.message);
//   }
// });
