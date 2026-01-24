import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import contactRouter from "./routes/contactRoute.js";
import newsletterRouter from "./routes/newsletterRoute.js";
import quoteRouter from "./routes/quoteRoute.js";
import pesapalRouter from "./routes/pesapalRoute.js";

import { logInfo, logError } from "./utils/logger.js";
import { bootstrapSuperAdmin } from "./controllers/userController.js";

// App config
const app = express();
const port = process.env.PORT || 5000;

// Validate required environment variables
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL", "ADMIN_URL"];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

// Trust proxy configuration (must be set before middleware that uses IP)
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// Initialize database and bootstrap super admin
const initializeServer = async () => {
  await connectDB();
  await bootstrapSuperAdmin();
  connectCloudinary();
};

// --------------------
// Security headers (Helmet)
// --------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "https://*.cloudinary.com"],
        fontSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          // allow frontend + admin to call backend
          "https://sunmega.co.ke",
          "https://www.sunmega.co.ke",
          process.env.FRONTEND_URL,
          process.env.ADMIN_URL,
          "https://accounts.google.com",
        ].filter(Boolean),
        frameSrc: ["'self'", "https://accounts.google.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// --------------------
// CORS (THIS is what was blocking you)
// --------------------
const normalizeOrigin = (url) => {
  if (!url || typeof url !== "string") return "";
  return url.replace(/\/$/, ""); // remove trailing slash
};

// Allowlist (Set = fast + avoids duplicates)
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,

    // Hard-code production to avoid env mistakes
    "https://sunmega.co.ke",
    "https://www.sunmega.co.ke",
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server calls (Pesapal, webhooks, Postman)
      if (!origin) return callback(null, true);

      const normalized = normalizeOrigin(origin);

      if (allowedOrigins.has(normalized)) {
        return callback(null, true);
      }

      // Debug log so we can see what's being blocked
      console.log("CORS BLOCKED ORIGIN:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
  })
);

// Handle preflight
app.options("*", cors());

// --------------------
// Body parsing
// --------------------
app.use(express.json());

// --------------------
// Routes
// --------------------
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/contact", contactRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/quote", quoteRouter);
app.use("/api/pesapal", pesapalRouter);

app.get("/", (req, res) => {
  res.send("API is Working");
});

// --------------------
// Central error handler
// --------------------
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  logError(err, "centralErrorHandler");

  res.status(statusCode).json({
    success: false,
    message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server after initialization
initializeServer()
  .then(() => {
    app.listen(port, "0.0.0.0", () =>
      logInfo(`Server is running on port: ${port}`, "server")
    );
  })
  .catch((error) => {
    logError(error, "server-startup");
    process.exit(1);
  });
