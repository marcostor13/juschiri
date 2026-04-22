require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../db');

const seedAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@juschiri.com' });
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const admin = new User({
      email: 'admin@juschiri.com',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user seeded successfully:');
    console.log('Email: admin@juschiri.com');
    console.log('Pass: admin123');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();
