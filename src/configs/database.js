const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    const uri = `${process.env.MONGO_DB}`;

    const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        family: 4,
        // tls: true,
        autoIndex: false,
    };

    try {
        await mongoose.connect(uri, options);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
