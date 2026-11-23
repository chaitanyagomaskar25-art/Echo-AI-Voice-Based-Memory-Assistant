const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/echo_memory_db';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    console.warn('[MongoDB] Ensure mongod is running. (e.g. mongod --port 27018 --dbpath ./data --nounixsocket)');
    // Do not terminate process so server can still serve health and mock APIs if needed
    return null;
  }
};

module.exports = connectDB;
