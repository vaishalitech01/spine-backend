import mongoose, { Schema } from "mongoose";

const walletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    lockedBalance: {
      type: Number,
      default: 0,
    },
    commission: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
