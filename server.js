import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import  'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import contactRouter from './routes/contactRoute.js';
import newsletterRouter from './routes/newsletterRoute.js';
import quoteRouter from './routes/quoteRoute.js';
import { logInfo, logError } from './utils/logger.js';
import pesapalRouter from "./routes/pesapalRoute.js";
import { bootstrapSuperAdmin } from './controllers/userController.js';


// App config
const app = express();
const port = process.env.PORT || 5000;

// Trust proxy configuration (must be set before middleware that uses IP)
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// Initialize database and bootstrap super admin
const initializeServer = async () => {
    await connectDB();
    await bootstrapSuperAdmin();
    connectCloudinary();
};

// Middlewares
// Define allowed origins for CORS (frontend and admin)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  "https://sunmegalimited.vercel.app",
  "https://sunmegalimitedadmin.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080"
].filter(Boolean);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "https://*.cloudinary.com"],
            fontSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                process.env.FRONTEND_URL || 'https://sunmegalimited.vercel.app',
                process.env.ADMIN_URL || 'https://sunmegalimitedadmin.vercel.app',
                "https://accounts.google.com",
                
            ],
            frameSrc: ["'self'", "https://accounts.google.com", ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            upgradeInsecureRequests: []
        }
    }
}));

// Allow Pesapal IPN without CORS checks
app.use("/api/pesapal/ipn", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use(cors({
origin: function (origin, callback) {
  // Allow server-to-server calls (Pesapal, webhooks, Postman)
  if (!origin) {
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error("Not allowed by CORS"));
},
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token']
}));
app.use(express.json());

// Api endpoints
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order',orderRouter);
app.use('/api/contact', contactRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/quote', quoteRouter);
app.use("/api/pesapal", pesapalRouter);


app.get('/', (req, res) => {
    res.send("API is Working")
})

// Central error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    
    logError(err, 'centralErrorHandler');
    
    res.status(statusCode).json({
        success: false,
        message: message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server after initialization
initializeServer()
    .then(() => {
        app.listen(port, '0.0.0.0', () => logInfo(`Server is running on port: ${port}`, 'server'));
    })
    .catch((error) => {
        logError(error, 'server-startup');
        process.exit(1);
    });