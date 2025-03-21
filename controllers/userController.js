const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");

// register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate input
    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user to database
    const user = new User({ name, email, password: hashedPassword, phone });
    await user.save();

    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// login user
const loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
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

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
    res
      .status(200)
      .json({ success: true, message: "Login successful", token, user });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// login with OTO
const loginWithOTP = async (req, res) => {};

const userPasswordChange = async (req, res) => {
  const { newPassword, userId } = req.body;

  try {
    // Hash password
    const user = await User.findById(userId);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save()

    res.status(200).json({message:"Password changed successfully"})
  } catch (error) {
    console.error("Error in changing password:", error);
    res.status(500).json({ message: "Error in changing password", error: error.message });
  }
};

// Add to Cart
const addToCart = async (req, res) => {
  const { userId, itemId } = req.body;

  try {
    if (!userId || !itemId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or itemId" });
    }

    let userData = await User.findById(userId);
    let cartData = userData.cart || {};

    cartData[itemId] = (cartData[itemId] || 0) + 1;

    await User.findByIdAndUpdate(userId, { cart: cartData });
    res.status(200).json({ success: true, message: "Added to cart", cartData });
  } catch (error) {
    console.error("Error during adding to cart:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error during adding to cart" });
  }
};

// Remove from Cart
const removeFromCart = async (req, res) => {
  try {
    const { userId, itemId } = req.body;

    if (!userId || !itemId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or itemId" });
    }

    let userData = await User.findById(userId);
    let cartData = userData.cart || {};

    if (cartData[itemId] > 0) {
      cartData[itemId] -= 1;
      if (cartData[itemId] === 0) delete cartData[itemId];
    }

    await User.findByIdAndUpdate(userId, { cart: cartData });
    res
      .status(200)
      .json({ success: true, message: "Removed from cart", cartData });
  } catch (error) {
    console.error("Error during removing from cart:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during removing from cart",
    });
  }
};

// Remove item from cart with total quantity
const removeItemFromCart = async (req, res) => {
  try {
    const { userId, itemId } = req.body;
    if (!userId || !itemId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or itemId" });
    }

    let userData = await User.findById(userId);
    let cartData = userData.cart || {};

    if (cartData[itemId]) {
      delete cartData[itemId];
      await User.findByIdAndUpdate(userId, { cart: cartData });
      res
        .status(200)
        .json({ success: true, message: "Item Removed from cart", cartData });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Item not found in the cart" });
    }
  } catch (error) {
    console.error("Error during removing from cart:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during removing from cart",
    });
  }
};

// Get total cart data
const getCartData = async (req, res) => {
  try {
    const { userId } = req.body;
    const cartData = await User.findById(userId);
    res.status(200).json({
      success: true,
      message: "Successfully fetched cart data",
      cartData: cartData.cart || {},
    });
  } catch (error) {
    console.error("Error during fetching from cart:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during fetching from cart",
    });
  }
};

//Add address
const addProfileData = async (req, res) => {
  try {
    const { name, phone, address, email } = req.body;
    const { userId } = req.body;
    // Validate input
    if (!name || !email || !phone || !address) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const user = await User.findById(userId);
    user.name = name;
    user.phone = phone;
    user.address = address;
    user.email = email;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Successfully  added profile data",
      user,
    });
  } catch (error) {
    console.error("Error during adding profile data:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during adding to profile data",
    });
  }
};

// get user profile data
const getUserProfile = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    const profile = {
      name: user.name,
      address: user.address,
      email: user.email,
      phone: user.phone,
      image: user.image ? user.image : null,
    };
    res.status(200).json({
      success: true,
      message: "user profile fetched successfully!",
      profile,
    });
  } catch (error) {
    console.error("Error during fetching from profile data:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during fetching from profile",
    });
  }
};

const addProfilePic = async (req, res) => {
  const { userId } = req.body;
  const image_filename = req.file?.filename; // Ensure file exists

  try {
    const user = await User.findById(userId);
    if (image_filename !== undefined) {
      if (user.image) {
        fs.unlink(`uploads/${user.image}`, () => {});
      }
      user.image = image_filename;
    }

    await user.save();
    res.status(200).json({
      success: true,
      message: "profile pic added successfully!",
      image: user.image,
    });
  } catch (error) {
    console.error("Error during adding profile pic:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during add profile pic",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  addToCart,
  removeFromCart,
  removeItemFromCart,
  getCartData,
  addProfileData,
  getUserProfile,
  addProfilePic,
  loginWithOTP,
  userPasswordChange,
};
