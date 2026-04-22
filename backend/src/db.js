const mongoose = require('mongoose');

let cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI2 || process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('DATABASE_ERROR: No MONGODB_URI or MONGODB_URI2 found in environment variables.');
      console.log('Available env keys:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')));
      throw new Error('MONGODB_URI is undefined. Please check Netlify Environment Variables.');
    }

    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
