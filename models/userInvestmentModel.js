import mongoose, { Schema } from "mongoose";

const userInvestmentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    planId: {
        type: Schema.Types.ObjectId,
        ref: "InvestmentPlan",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["active", "completed", "cancelled"],
        default: "active"
    },
    lastPayoutDate: {
        type: Date,
        default: null
    },
    earning: {
        type: Number,
        default: 0
    },
}, {
    timestamps: true
});

const UserInvestment = mongoose.model("UserInvestment", userInvestmentSchema);

export default UserInvestment;
