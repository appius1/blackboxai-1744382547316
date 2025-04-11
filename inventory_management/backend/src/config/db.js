const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://jhonredway:IVY423RKOU5X4ZRD@ac-emoppvh-shard-00-00.nhtowxe.mongodb.net:27017,ac-emoppvh-shard-00-01.nhtowxe.mongodb.net:27017,ac-emoppvh-shard-00-02.nhtowxe.mongodb.net:27017/?replicaSet=atlas-1456l6-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

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
