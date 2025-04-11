const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Atlas connection string with URL-encoded credentials
const username = encodeURIComponent('jhonredway');
const password = encodeURIComponent('ZtA9kwvm5FsYMt9V');
const MONGODB_URI = 'mongodb://jhonredway:ZtA9kwvm5FsYMt9V@ac-emoppvh-shard-00-00.nhtowxe.mongodb.net:27017,ac-emoppvh-shard-00-01.nhtowxe.mongodb.net:27017,ac-emoppvh-shard-00-02.nhtowxe.mongodb.net:27017/?replicaSet=atlas-1456l6-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

// MongoDB connection options
const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    ssl: true,
    authSource: 'admin',
    replicaSet: 'atlas-1456l6-shard-0'
};

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        
        // Remove existing listeners to prevent duplicates
        mongoose.connection.removeAllListeners();

        // Set up MongoDB connection event handlers
        mongoose.connection.on('connecting', () => {
            console.log('Establishing connection to MongoDB Atlas...');
        });

        mongoose.connection.on('connected', () => {
            console.log('Successfully connected to MongoDB Atlas');
            console.log('Connection Details:', {
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                name: mongoose.connection.name,
                readyState: mongoose.connection.readyState
            });
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB Connection Error:', {
                name: err.name,
                message: err.message,
                code: err.code,
                codeName: err.codeName
            });
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Disconnected from MongoDB Atlas');
        });

        // Connect to MongoDB Atlas
        const conn = await mongoose.connect(MONGODB_URI, options);
        console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);

        return conn;
    } catch (error) {
        console.error('MongoDB Connection Error:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        process.exit(1);
    }
};

// Graceful shutdown
const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed gracefully');
    } catch (error) {
        console.error('Error while closing MongoDB connection:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        process.exit(1);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Received SIGINT signal');
    await disconnectDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal');
    await disconnectDB();
    process.exit(0);
});

module.exports = { connectDB, disconnectDB };
