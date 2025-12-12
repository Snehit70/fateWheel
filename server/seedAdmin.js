require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const supabase = require("./utils/supabase");

const createAdmin = async () => {
  try {
    const isProduction = process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT_NAME;
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

    console.log(`Seeding Admin: ${adminUsername} (${adminEmail})`);

    // 1. Create/Get Admin in Supabase
    let supabaseUid = null;

    console.log("Checking Supabase...");
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let sbUser = users.find(u => u.email === adminEmail);

    if (!sbUser) {
      console.log("Creating Admin in Supabase...");
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { username: adminUsername }
      });

      if (createError) throw createError;
      sbUser = data.user;
      console.log("Supabase Admin Created.");
    } else {
      console.log("Admin exists in Supabase. Ensuring password...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        sbUser.id,
        { password: adminPassword, user_metadata: { username: adminUsername } }
      );
      if (updateError) console.warn("Could not update admin password:", updateError.message);
    }

    supabaseUid = sbUser.id;

    // 2. Sync with MongoDB
    let admin = await User.findOne({ username: adminUsername });

    if (admin) {
      admin.supabaseUid = supabaseUid;
      admin.role = 'admin';
      admin.status = 'approved';
      await admin.save();
      console.log("MongoDB Admin Updated.");
    } else {
      admin = new User({
        username: adminUsername,
        supabaseUid: supabaseUid,
        role: 'admin',
        status: 'approved',
        balance: 0
      });
      await admin.save();
      console.log("MongoDB Admin Created.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
};

createAdmin();
