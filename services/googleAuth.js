import { OAuth2Client } from 'google-auth-library';
import { logError } from '../utils/logger.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and extract user information
 * @param {string} idToken - Google ID token from client
 * @returns {Promise<{email: string, name: string, googleId: string, picture?: string}>}
 * @throws {Error} If token is invalid
 */
export const verifyGoogleToken = async (idToken) => {
    try {
        // Verify the token
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            throw new Error('Invalid token payload');
        }

        // Extract user information
        return {
            email: payload.email,
            name: payload.name || payload.given_name || 'User',
            googleId: payload.sub, // Google's unique user ID
            picture: payload.picture // Optional profile picture
        };
    } catch (error) {
        logError(error, 'verifyGoogleToken');
        throw new Error('Invalid Google token');
    }
};
