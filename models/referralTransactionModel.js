// models/referralTransactionModel.js
import mongoose from "mongoose";
const referralTransactionSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInvestment' },
  amount: { type: Number, required: true },
  level: { type: Number },
}, { timestamps: true });
const ReferralTransaction = mongoose.model("ReferralTransaction", referralTransactionSchema);
export default ReferralTransaction;


userId: {
  type:mongoose.Schema.Types.ObjectId
}