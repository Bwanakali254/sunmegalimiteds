import mongoose from "mongoose";
import { logInfo } from '../utils/logger.js';

const connectDB = async () => {

    mongoose.connection.on("connected", () => {
        logInfo("MongoDB connected successfully", 'mongodb');
    })

   await mongoose.connect(process.env.MONGODB_URI, { dbName: 'e-commerce' })

}

export default connectDB;