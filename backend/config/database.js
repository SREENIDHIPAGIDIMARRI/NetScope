import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/netscope';

  try {
    mongoose.set('strictQuery', false);
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log('MongoDB connected successfully to:', uri.replace(/\/\/[^@]*@/, '//***@'));
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('MongoDB disconnected');
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
  } catch (error) {
    isConnected = false;
    console.error('Initial MongoDB connection failed:', error.message);
    console.warn('Backend will continue running in degraded mode (in-memory caching / retry)');
  }
}

export function getDBStatus() {
  const stateCode = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: states[stateCode] || 'unknown',
    isConnected: stateCode === 1,
    databaseName: mongoose.connection.name || 'netscope',
  };
}
