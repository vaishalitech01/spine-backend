import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  message: {
    type: String,
    required: true
  },
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
