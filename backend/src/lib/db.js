import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log("MONGO Database is Connected",conn.connection.host);
    } catch (error) {
        console.error("Database Connection failed",error);
        process.exit(1); // 1 code is means that Fails , 0 means Sucess
    }
}