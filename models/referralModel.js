import mongoose, { Schema } from "mongoose";

const referralSchema = new Schema(
  {
    referredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referredUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    
    // ✅ From your system
    isRewardGiven: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },

    // ✅ From their system (optional in your case)
    commissionPercent: { type: Number, default: 0 }, 
    isCommissionGiven: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Referral = mongoose.model("Referral", referralSchema);
export default Referral;
