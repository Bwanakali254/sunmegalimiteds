import mongoose from 'mongoose'

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunmega', {
      dbName: 'sunmega'
    })
    console.log(`MongoDB Connected: ${conn.connection.host} | Database: ${conn.connection.name}`)
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`)
    console.log('Continuing without database connection...')
    // Don't exit - let server start for testing
  }
}
