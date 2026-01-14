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
import { logInfo } from './utils/logger.js';
import pesapalRouter from "./routes/pesapalRoute.js";


// App config
const app = express();
const port = process.env.PORT || 5000;

// Trust proxy configuration (must be set before middleware that uses IP)
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

connectDB();
connectCloudinary();

// Middlewares
// Define allowed origins for CORS (frontend and admin)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  "https://sunmegalimited.vercel.app",
  "https://sunmegalimitedadmin.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174"
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
                process.env.FRONTEND_URL || 'http://localhost:5173',
                process.env.ADMIN_URL || 'http://localhost:5174',
                "https://accounts.google.com",
                
            ],
            frameSrc: ["'self'", "https://accounts.google.com", ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            upgradeInsecureRequests: []
        }
    }
}));
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, curl) in development only
       if (!origin) {
       return callback(null, true); // allow webhooks, Postman, curl, etc
         }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
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

// Listen
app.listen(port, () => logInfo(`Server is running on port: ${port}`, 'server'));