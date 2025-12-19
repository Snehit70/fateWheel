require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const createAdmin = async () => {
  try {
    let MONGO_URL = process.env.MONGO_URL;

    if (!MONGO_URL) {
      MONGO_URL = "mongodb://127.0.0.1:27017/roulette";
      console.warn("Usage: MONGO_URL not found, defaulting to localhost.");
    }

    await mongoose.connect(MONGO_URL, { dbName: "roulette" });
    console.log("Connected to MongoDB");

    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";

    console.log(`Checking Admin: ${adminUsername}`);

    // Check if admin already exists in MongoDB
    const existingAdmin = await User.findOne({ username: adminUsername });

    if (existingAdmin) {
      // Update existing admin
      existingAdmin.role = "admin";
      existingAdmin.status = "approved";
      await existingAdmin.save();
      console.log("Admin user exists. Updated role and status to ensure access.");
    } else {
      // Create new admin
      console.log("Creating new Admin...");

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const admin = new User({
        username: adminUsername,
        password: hashedPassword,
        role: "admin",
        status: "approved",
        balance: 10000,
      });
      await admin.save();
      console.log("MongoDB Admin Created.");
    }

    await mongoose.disconnect();
    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    try {
      await mongoose.disconnect();
    } catch (disconnectErr) {
      // Ignore disconnect errors during error handling
    }
    process.exit(1);
  }
};

createAdmin();
