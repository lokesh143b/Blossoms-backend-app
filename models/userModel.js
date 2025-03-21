const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // User's name
    email: { type: String, required: true, unique: true }, // User's email
    password: { type: String, required: true }, // User's password,
    phone: { type: String, unique: true , required:true }, // Phone
    address: { type: String }, //User's address
    image: { type: String, default: "" }, //User's profile pic
    createdAt: { type: Date, default: Date.now }, // User creation timestamp
    cart: { type: Object, default: {} },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // List of orders associated with the user
    otp: { type: String, default: "" },
    otpExpires: { type: Date, default: "" },
  },
  { minimize: false, timestamps: true } // Automatically manage createdAt and updatedAt
);

module.exports = mongoose.model("User", userSchema);
