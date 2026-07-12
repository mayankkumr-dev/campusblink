const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return true;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_blink';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully to Mongoose database');
    return true;
  } catch (error) {
    console.warn('[MongoDB] Direct MongoDB connection not available. Running in hybrid/fallback mode:', error.message);
    isConnected = false;
    return false;
  }
}

function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  isDBConnected,
};
