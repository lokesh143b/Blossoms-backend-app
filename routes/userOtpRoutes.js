const express = require("express");
const { requestOTP, verifyOTP,requestLoginOTP ,verifyLoginOTP} = require("../controllers/userOtpController");
const {userPasswordChange} = require("../controllers/userController")
const  authMiddileware = require("../config/authMiddleware")

const router = express.Router();

router.post("/request-otp",authMiddileware ,requestOTP); //localhost:4000/auth/request-otp
router.post("/verify-otp/password-change",authMiddileware,verifyOTP,userPasswordChange);   //localhost:4000/auth/verify-otp/password-change
router.post("/request-login-otp" , requestLoginOTP) //localhost:4000/auth/request-login-otp
router.post("/verify-login-otp" , verifyLoginOTP) //localhost:4000/auth/verify-login-otp
module.exports = router;
