import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/error';
import { tenantMiddleware } from './middleware/tenant';
import { setupSwagger } from './utils/swagger';

// Routes
import authRoutes from './routes/auth';
import websiteRoutes from './routes/website';
import productRoutes from './routes/product';
import subscriptionRoutes from './routes/subscription';
import analyticsRoutes from './routes/analytics';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Multi-tenancy middleware
app.use(tenantMiddleware);

// API Documentation
setupSwagger(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/websites', websiteRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

export default app;
