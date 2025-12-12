require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const supabase = require("./utils/supabase");

const createAdmin = async () => {
  try {
    let MONGO_URL = process.env.MONGO_URL;

    if (!MONGO_URL) {
      MONGO_URL = "mongodb://127.0.0.1:27017/roulette";
      console.warn("Usage: MONGO_URL not found, defaulting to localhost.");
    }

    await mongoose.connect(MONGO_URL, { dbName: 'roulette' });
    console.log("Connected to MongoDB");

    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";
    const adminEmail = `${adminUsername}@roulette.game`;

    console.log(`Checking Admin: ${adminUsername} (${adminEmail})`);

    // Check if admin already exists in MongoDB with correct setup
    const existingAdmin = await User.findOne({ username: adminUsername });

    // Check Supabase for existing user
    console.log("Checking Supabase...");
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const sbUser = users.find(u => u.email === adminEmail);

    // If both exist and are properly synced, skip
    if (existingAdmin && sbUser && existingAdmin.supabaseUid === sbUser.id &&
      existingAdmin.role === 'admin' && existingAdmin.status === 'approved') {
      console.log("Admin already exists and is properly synced. Skipping.");
      await mongoose.disconnect();
      process.exit(0);
    }

    let supabaseUid = null;

    if (!sbUser) {
      // Create in Supabase
      console.log("Creating Admin in Supabase...");
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { username: adminUsername }
      });

      if (createError) throw createError;
      supabaseUid = data.user.id;
      console.log("Supabase Admin Created.");
    } else {
      // Update existing Supabase user
      console.log("Admin exists in Supabase. Ensuring password...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        sbUser.id,
        { password: adminPassword, user_metadata: { username: adminUsername } }
      );
      if (updateError) console.warn("Could not update admin password:", updateError.message);
      supabaseUid = sbUser.id;
    }

    // Sync with MongoDB
    if (existingAdmin) {
      // Update existing admin
      existingAdmin.supabaseUid = supabaseUid;
      existingAdmin.role = 'admin';
      existingAdmin.status = 'approved';
      await existingAdmin.save();
      console.log("MongoDB Admin Updated.");
    } else {
      // Create new admin
      const admin = new User({
        username: adminUsername,
        supabaseUid: supabaseUid,
        role: 'admin',
        status: 'approved',
        balance: 0
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
