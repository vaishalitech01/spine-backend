import mongoose,{Schema} from "mongoose";

const spinSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    resultValue:{
        type:Number,
        required:true
    },
    type:{
        type:String,
        enum:["free","bonus","purchased"],
        default: "free"
    },
},{
    timestamps:true
});

const Spin = mongoose.model("Spin",spinSchema);

export default Spin;
