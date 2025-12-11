const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

const createAdmin = async () => {
  try {
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.RAILWAY_ENVIRONMENT_NAME;

    console.log("--- Environment Debug ---");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("RAILWAY_ENVIRONMENT_NAME:", process.env.RAILWAY_ENVIRONMENT_NAME);
    console.log("MONGO_URL Present:", !!process.env.MONGO_URL);
    console.log("MONGODB_URI Present:", !!process.env.MONGODB_URI);
    console.log("DATABASE_URL Present:", !!process.env.DATABASE_URL);
    console.log("All Env Keys:", Object.keys(process.env).join(", "));
    console.log("------------------------");

    let MONGODB_URI =
      process.env.MONGO_URL ||
      process.env.MONGODB_URI ||
      process.env.DATABASE_URL;

    console.log("Resolved MONGODB_URI:", MONGODB_URI ? MONGODB_URI.replace(/:([^:@]{1,})@/, ":****@") : "undefined");

    if (!MONGODB_URI) {
      if (isProduction) {
        console.error(
          "Critical Error: MongoDB connection string not found in environment variables (MONGODB_URI, MONGO_URL, or DATABASE_URL).",
        );
        console.error("This is required for production/Railway deployments.");
        process.exit(1);
      } else {
        console.warn(
          "Warning: MONGODB_URI not found in environment, defaulting to localhost for development.",
        );
        MONGODB_URI = "mongodb://127.0.0.1:27017/roulette";
      }
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    //env vars
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";

    let admin = await User.findOne({ username: adminUsername });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (admin) {
      console.log("Admin already exists. Skipped creation/update.");
      process.exit(0);
    }

    admin = new User({
      username: adminUsername,
      password: hashedPassword,
      role: "admin",
      status: "approved",
      balance: 0, // Admin doesn't need balance for gameplay, only monitoring
    });

    await admin.save();
    console.log("Admin created successfully");
    console.log("Username:", adminUsername);
    console.log("Password:", "Check environment variables or default");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createAdmin();
