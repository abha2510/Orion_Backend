const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: String,
  role: { type: String, enum: ["user", "admin"] },
  banned: { type: Boolean, default: false },
});

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
