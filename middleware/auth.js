import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger.js';

const authUser = (req, res, next) => {

  const { token } = req.headers;

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token, authorization denied', tokenExpired: false });
    }

    try {

        const token_decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = token_decoded.id;
        next();

    } catch (error) {
       logError(error, 'authUser');
       if (error.name === 'TokenExpiredError') {
           return res.status(401).json({ success: false, message: 'Token expired', tokenExpired: true });
       }
       return res.status(401).json({ success: false, message: 'Invalid token', tokenExpired: false });
    }

}

export default authUser;