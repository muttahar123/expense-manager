import mongoose from 'mongoose';

/**
 * Connect to MongoDB. Reads MONGO_URI from the environment.
 * Falls back to a local instance for convenience in development.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wealth_manager';

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri);
  // eslint-disable-next-line no-console
  console.log(`🗄️  MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

export default connectDB;
