require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB, disconnectDB } = require('./config/db');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logger

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const customerRoutes = require('./routes/customer.routes');
const saleRoutes = require('./routes/sale.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const path = require('path');

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dashboard-updated.html'));
});

// Initialize routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/reports', require('./routes/report.routes'));

const { errorHandler, notFound } = require('./middleware/error.middleware');

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    await disconnectDB();
    server.close(() => {
        process.exit(1);
    });
});

// Handle SIGTERM
process.on('SIGTERM', async () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    await disconnectDB();
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});
