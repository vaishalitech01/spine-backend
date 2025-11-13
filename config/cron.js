import cron from "node-cron";
import UserInvestment from "../models/userInvestmentModel.js";
import Wallet from "../models/walletModel.js";
import InvestmentPlan from "../models/investmentPlanModel.js";
import Notification from "../models/notificationModel.js";
import Transaction from "../models/transactionModel.js";
import RewardWallet from "../models/rewardWalletModel.js";

// Helper function to ensure RewardWallet exists and add funds
const creditRewardWallet = async (userId, amount, reason, date) => {
  let rewardWallet = await RewardWallet.findOne({ userId });
  
  if (!rewardWallet) {
    rewardWallet = await RewardWallet.create({
      userId,
      balance: amount,
      transactions: [{ type: "credit", amount, reason, date }]
    });
  } else {
    rewardWallet.balance += amount;
    rewardWallet.transactions.push({ type: "credit", amount, reason, date });
    await rewardWallet.save();
  }
  return rewardWallet;
};


// Runs daily at 12:00 AM and 12:00 PM
cron.schedule("0 0,12 * * *", async () => {
  console.log("🔁 Running Auto Payout Job...");

  try {
    const activeInvestments = await UserInvestment.find({ status: "active" });
    const today = new Date(); // Get 'today' once for consistency

    for (let investment of activeInvestments) {
      const plan = await InvestmentPlan.findById(investment.planId);
      const userWallet = await Wallet.findOne({ userId: investment.userId });

      if (!plan || !userWallet) {
        console.warn(`Skipping investment ${investment._id}: Missing plan or wallet.`);
        continue;
      }

      const startDate = new Date(investment.startDate);
      const endDate = new Date(investment.endDate);
      const lastPayout = new Date(investment.lastPayoutDate || startDate);

      // 1️⃣ Handle investment completion (maturity reached)
      // ⭐️ We check this FIRST
      if (today >= endDate) {
        
        if (plan.autoPayout) {
          // =================================================================
          // ⭐️ BESTEST FIX: Pay any final, outstanding ROI before completion
          // =================================================================
          
          // Calculate days owed between last payout and the end date
          const daysDiff = Math.floor(
            (endDate - lastPayout) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff >= 1) {
            const dailyROI = (investment.amount * plan.roiPercent) / 100;
            const finalROI = dailyROI * daysDiff;

            // 1. Credit Reward Wallet with final ROI
            await creditRewardWallet(investment.userId, finalROI, "Final investment reward", today);

            // 2. Create Transaction for final ROI
            await Transaction.create({
              userId: investment.userId,
              type: "investment_roi", // Specific type
              transactionType: "credit",
              amount: finalROI,
              status: "completed",
              // description: "Final ROI on maturity"
            });
            
            investment.earning += finalROI;
            console.log(
              `✅ Credited final $${finalROI.toFixed(2)} ROI to user ${investment.userId} before completion.`
            );
          }

          // 3. Return Principal to Main Wallet
          userWallet.balance += investment.amount;
          userWallet.lockedBalance -= investment.amount;
          await userWallet.save();

          // 4. Create Transaction for Principal (as requested)
          await Transaction.create({
            userId: investment.userId,
            type: "investment_principal", // Specific type
            transactionType: "credit",
            amount: investment.amount,
            status: "completed",
            // description: "Principal returned on maturity"
          });

          // 5. Update Investment Status
          investment.status = "completed";
          investment.lastPayoutDate = today;
          await investment.save();

          await Notification.create({
            userId: investment.userId,
            message: `Your investment matured. Principal $${investment.amount} credited to Main Balance. Final ROI paid to Reward Wallet.`,
          });

          console.log(
            `✅ Auto plan completed: Returned principal for user ${investment.userId}`
          );

        } else {
          // =================================================================
          // Non-auto payout → pay full ROI + principal at maturity
          // =================================================================
          
          const durationDays = Math.max(1, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)));
          const finalROI = (investment.amount * plan.roiPercent * durationDays) / 100;

          // 1. Return Principal to Main Wallet
          userWallet.balance += investment.amount;
          userWallet.lockedBalance -= investment.amount;
          await userWallet.save();

          // 2. Credit Reward Wallet with total ROI
          await creditRewardWallet(investment.userId, finalROI, "Investment reward on maturity", today);

          // 3. Create Transaction for total ROI
          await Transaction.create({
            userId: investment.userId,
            type: "investment_roi",
            transactionType: "credit",
            amount: finalROI,
            status: "completed",
            // description: "Total ROI on maturity"
          });

          // 4. Create Transaction for Principal
          await Transaction.create({
            userId: investment.userId,
            type: "investment_principal",
            transactionType: "credit",
            amount: investment.amount,
            status: "completed",
            // description: "Principal returned on maturity"
          });

          // 5. Update Investment Status
          investment.earning += finalROI;
          investment.status = "completed";
          investment.lastPayoutDate = today;
          await investment.save();

          await Notification.create({
            userId: investment.userId,
            message: `Your investment matured. You Received ROI $${finalROI.toFixed(2)} in Reward Wallet. Principal $${
              investment.amount
            } credited in Main Balance.`,
          });

          console.log(
            `✅ Non-auto plan completed: Credited principal + ROI for user ${investment.userId}`
          );
        }
      } 
      // 2️⃣ Handle autoPayout (daily ROI) for plans NOT yet complete
      else if (plan.autoPayout) {
        
        const daysDiff = Math.floor(
          (today - lastPayout) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff >= 1) {
          const dailyROI = (investment.amount * plan.roiPercent) / 100;
          const totalROI = dailyROI * daysDiff; // Pay for all missed days

          // 1. Credit Reward Wallet
          await creditRewardWallet(investment.userId, totalROI, "Daily investment reward", today);
      
          // 2. Create Transaction for daily ROI
          await Transaction.create({
            userId: investment.userId,
            type: "investment_roi",
            amount: totalROI,
            transactionType: "credit",
            status: "completed",
            // description: "Daily ROI payout"
          });

          // 3. Update Investment
          investment.earning += totalROI;
          investment.lastPayoutDate = today; // Set last payout to now
          await investment.save();

          // 4. Notify user
          await Notification.create({
            userId: investment.userId,
            message: `You received daily ROI of $${totalROI.toFixed(
              2
            )} in your Reward Wallet.`,
          });

          console.log(
            `✅ Credited $${totalROI.toFixed(2)} ROI to user ${
              investment.userId
            }`
          );
        }
      }
    }

    console.log("✅ Auto payout job finished.");
  } catch (error) {
    console.error("❌ Error in auto payout job:", error.message);
  }
});


// import cron from "node-cron";
// import UserInvestment from "../models/userInvestmentModel.js";
// import Wallet from "../models/walletModel.js";
// import InvestmentPlan from "../models/investmentPlanModel.js";
// import Notification from "../models/notificationModel.js";
// import Transaction from "../models/transactionModel.js";
// import RewardWallet from "../models/rewardWalletModel.js";

// // Runs daily at 12:00 AM and 12:00 PM
// cron.schedule("0 0,12 * * *", async () => {
//   console.log("🔁 Running Auto Payout Job...");

//   try {
//     const activeInvestments = await UserInvestment.find({ status: "active" });

//     for (let investment of activeInvestments) {
//       const plan = await InvestmentPlan.findById(investment.planId);
//       const userWallet = await Wallet.findOne({ userId: investment.userId });

//       if (!plan || !userWallet) continue;

//       const today = new Date();
//       const startDate = new Date(investment.startDate);
//       const endDate = new Date(investment.endDate);
//       const lastPayout = investment.lastPayoutDate || startDate;

//       // 1️⃣ Handle autoPayout (daily ROI)
//       if (plan.autoPayout) {
//         const daysDiff = Math.floor(
//           (today - lastPayout) / (1000 * 60 * 60 * 24)
//         );

//         if (daysDiff >= 1 && today < endDate) {
//           const dailyROI = (investment.amount * plan.roiPercent) / 100; // daily %
//           const totalROI = dailyROI * daysDiff;

//           // Credit wallet
//           // userWallet.balance += totalROI;
//           // await userWallet.save();

//           // Update investment
//           investment.earning += totalROI;
//           investment.lastPayoutDate = today;
//           await investment.save();
      
//           await Transaction.create({
//             userId: investment.userId,
//             type: "investment",
//             amount: totalROI,
//             transactionType: "credit",
//             status: "completed",
//           });

//           const rewardWallet = await RewardWallet.findOne({ userId: investment.userId });
//           if (rewardWallet) {
//             rewardWallet.transactions.push({
//               type: "credit",
//               amount: totalROI,
//               reason: "Investment reward",
//               date: today,
//             });
//             rewardWallet.balance += totalROI;
//             await rewardWallet.save();
//           }

//           // Notify user
//           await Notification.create({
//             userId: investment.userId,
//             message: `You received daily ROI of $${totalROI.toFixed(
//               2
//             )} for your investment.`,
//           });

//           console.log(
//             `✅ Credited $${totalROI.toFixed(2)} ROI to user ${
//               investment.userId
//             }`
//           );
//         }
//       }

//       // 2️⃣ Handle investment completion (maturity reached)
//       if (today >= endDate) {
//         if (plan.autoPayout) {
//           // Auto payout → only return principal (ROI already paid daily)
//           userWallet.balance += investment.amount;
//           userWallet.lockedBalance -= investment.amount;
//           await userWallet.save();

//           investment.status = "completed";
//           investment.lastPayoutDate = today;
//           await investment.save();

//           await Notification.create({
//             userId: investment.userId,
//             message: `Your investment matured. Principal amount of $${investment.amount} has been credited back to your Main Balance.`,
//           });

//           console.log(
//             `✅ Auto plan completed: Returned principal for user ${investment.userId}`
//           );
//         } else {
//           // Non-auto payout → pay full ROI + principal at maturity
//           const durationDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
//           const finalROI = (investment.amount * plan.roiPercent * durationDays) / 100;

//           // userWallet.balance += investment.amount + finalROI;
//           userWallet.balance += investment.amount;
//           userWallet.lockedBalance -= investment.amount;
//           await userWallet.save();

//           investment.earning += finalROI;
//           investment.status = "completed";
//           investment.lastPayoutDate = today;
//           await investment.save();

//           await Transaction.create({
//             userId: investment.userId,
//             type: "investment",
//             transactionType: "credit",
//             amount: finalROI,
//             status: "completed",
//           });

//           await Transaction.create({
//             userId: investment.userId,
//             type: "investment",
//             transactionType: "credit",
//             amount: investment.amount,
//             status: "completed",
//           });

//           const rewardWallet = await RewardWallet.findOne({ userId: investment.userId });
//           if (rewardWallet) {
//             rewardWallet.transactions.push({
//               type: "credit",
//               amount: finalROI,
//               reason: "Investment reward",
//               date: today,
//             });
//             rewardWallet.balance += finalROI;
//             await rewardWallet.save();
//           }

//           await Notification.create({
//             userId: investment.userId,
//             message: `Your investment matured. You Received ROI $${finalROI.toFixed(2)}. Principal $${
//               investment.amount
//             } credited in Main Balance.`,
//           });

//           console.log(
//             `✅ Non-auto plan completed: Credited principal + ROI for user ${investment.userId}`
//           );
//         }
//       }
//     }

//     console.log("✅ Auto payout job finished.");
//   } catch (error) {
//     console.error("❌ Error in auto payout job:", error.message);
//   }
// });

