import axios from 'axios';
import 'dotenv/config';
import { logError } from '../utils/logger.js';

const PESAPAL_BASE_URL = process.env.PESAPAL_ENVIRONMENT === 'sandbox' 
    ? 'https://cybqa.pesapal.com/pesapalv3' 
    : 'https://pay.pesapal.com/v3';

let accessToken = null;
let tokenExpiry = null;

// Authenticate and get access token
const authenticate = async () => {
    try {
        // Check if token is still valid
        if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
            return accessToken;
        }

        const response = await axios.post(
            `${PESAPAL_BASE_URL}/api/Auth/RequestToken`,
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        accessToken = response.data.token;
        // Token expires in 3600 seconds (1 hour), set expiry to 55 minutes for safety
        tokenExpiry = Date.now() + (55 * 60 * 1000);
        
        return accessToken;
    } catch (error) {
        logError(error, 'pesapal-authenticate');
        throw new Error('Failed to authenticate with Pesapal');
    }
};

// Register IPN URL
const registerIPN = async (ipnUrl, notificationType = 'GET') => {
    try {
        const token = await authenticate();
        
        const response = await axios.post(
            `${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`,
            {
                url: ipnUrl,
                ipn_notification_type: notificationType
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        logError(error, 'pesapal-registerIPN');
        throw new Error('Failed to register IPN URL');
    }
};

// Submit order
const submitOrder = async (orderDetails) => {
    try {
        const token = await authenticate();
        
        const response = await axios.post(
            `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
            orderDetails,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        logError(error, 'pesapal-submitOrder');
        throw new Error('Failed to submit order to Pesapal');
    }
};

// Get transaction status
const getTransactionStatus = async (orderTrackingId) => {
    try {
        const token = await authenticate();
        
        const response = await axios.get(
            `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        logError(error, 'pesapal-getTransactionStatus');
        throw new Error('Failed to get transaction status');
    }
};

export default {
    authenticate,
    registerIPN,
    submitOrder,
    getTransactionStatus
};
