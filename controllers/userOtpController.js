const User = require("../models/userModel");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");


dotenv.config();

// Twilio Setup
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Configure Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP (6-digit)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP via Email
const sendOTPEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // Ensure this email matches your SMTP settings
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP for verification is: ${otp}. It is valid for 10 minutes.`,
    });
    
  } catch (error) {
    console.error("Error sending OTP via email:", error.message);
  }
};

// Send OTP via SMS using Twilio
const sendOTPSMS = async (phone, otp) => {
  try {
    await twilioClient.messages.create({
      body: `Your OTP for verification is: ${otp}. It is valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER, 
      to: `+91${phone}`, 
    });
    
  } catch (error) {
    console.error("Error sending OTP via SMS:", error.message);
  }
};

// Request OTP for Password Reset (Supports Email & Phone)
exports.requestOTP = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Store expiry as Date object
    await user.save();

    // Send OTP via both Email and SMS
    const emailPromise = user.email ? sendOTPEmail(user.email, otp) : Promise.resolve();
    const smsPromise = user.phone ? sendOTPSMS(user.phone, otp) : Promise.resolve();

    await Promise.allSettled([emailPromise, smsPromise]);

    res.status(200).json({ message: "OTP sent to email and phone" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};

// Request OTP for login 
exports.requestLoginOTP = async (req, res) => {
  const { emailOrPhone } = req.body;

  try {
    const cleanedInput = emailOrPhone.trim()
    
    let user;
    if (/^\d{10}$/.test(cleanedInput)) {
      // If input is a 10-digit number, treat it as a phone number
      user = await User.findOne({ phone: cleanedInput });
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedInput)) {
      // If input matches an email format, treat it as an email
      user = await User.findOne({ email: cleanedInput });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or phone format" });
    }
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Store expiry as Date object
    await user.save();

    // Send OTP via both Email and SMS
    const emailPromise = user.email ? sendOTPEmail(user.email, otp) : Promise.resolve();
    const smsPromise = user.phone ? sendOTPSMS(user.phone, otp) : Promise.resolve();

    await Promise.allSettled([emailPromise, smsPromise]);

    res.status(200).json({ message: "OTP sent to email and phone" });
    
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
  
};

// Verify OTP
exports.verifyOTP = async (req, res , next) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Validate OTP and Expiry
    if (user.otp !== otp || new Date(user.otpExpires) < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    next()
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Error in OTP verification", error: error.message });
  }
};


exports.verifyLoginOTP =async (req , res) =>{
  const {emailOrPhone , otp} = req.body 
  const cleanedInput = emailOrPhone.trim()
  
  try {
    let user;
    if (/^\d{10}$/.test(cleanedInput)) {
      // If input is a 10-digit number, treat it as a phone number
      user = await User.findOne({ phone: cleanedInput });
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedInput)) {
      // If input matches an email format, treat it as an email
      user = await User.findOne({ email: cleanedInput });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or phone format" });
    }
    if (!user) return res.status(404).json({ message: "User not found" });
    // Validate OTP and Expiry
    if (user.otp !== otp || new Date(user.otpExpires) < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
    res
      .status(200)
      .json({ success: true, message: "Login successful", token, user });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Error in OTP verification", error: error.message });
  }
}