import mongoose,{Schema} from "mongoose";

const transactionSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    type:{
        type:String,
        enum:["deposit","withdrawal","bonus","SpinPurchase","investment"],
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    transactionType: {
        type: String,
        enum: ["credit", "debit"],
    },
    status:{
        type:String,
        enum:["pending","completed","failed"],
        default:"completed"
    },
    address: { type: String },
},{
    timestamps:true
});

const Transaction = mongoose.model("Transaction",transactionSchema);
export default Transaction;