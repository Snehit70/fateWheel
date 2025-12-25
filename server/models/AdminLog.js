const mongoose = require("mongoose");

const AdminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ["approve_user", "reject_user", "delete_user", "update_balance", "toggle_reset", "withdraw_profit", "update_credentials"],
    required: true,
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  targetUsername: {
    type: String,
    required: true,
  },
  details: {
    type: String,
  },
  reason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index to auto-expire logs after 90 days
AdminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("AdminLog", AdminLogSchema);
