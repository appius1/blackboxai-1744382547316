const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://jhonredway:IVY423RKOU5X4ZRD@ac-emoppvh.nhtowxe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
