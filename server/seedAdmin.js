const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

const createAdmin = async () => {
  try {
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.RAILWAY_ENVIRONMENT_NAME;

    let MONGO_URL = process.env.MONGO_URL;

    if (!MONGO_URL) {
      if (isProduction) {
        console.error(
          "Critical Error: MONGO_URL not found in environment variables.",
        );
        process.exit(1);
      } else {
        console.warn(
          "Warning: MONGO_URL not found, defaulting to localhost.",
        );
        MONGO_URL = "mongodb://127.0.0.1:27017/roulette";
      }
    }

    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB for admin seeding");

    //env vars
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";

    let admin = await User.findOne({ username: adminUsername });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (admin) {
      console.log("Admin account already exists.");
      process.exit(0);
    }

    admin = new User({
      username: adminUsername,
      password: hashedPassword,
      role: "admin",
      status: "approved",
      balance: 0,
    });

    await admin.save();
    console.log(`Admin account '${adminUsername}' created successfully.`);

    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err.message);
    process.exit(1);
  }
};

createAdmin();
