import jwt from 'jsonwebtoken';

// Optional auth middleware - sets userId if token exists, but doesn't fail if token is missing
const optionalAuth = (req, res, next) => {
    const { token } = req.headers;

    if (token) {
        try {
            const token_decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = token_decoded.id;
        } catch (error) {
            // Invalid token - ignore and continue without userId
        }
    }
    
    next();
}

export default optionalAuth;
