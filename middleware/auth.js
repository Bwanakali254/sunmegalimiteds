import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger.js';

const authUser = (req, res, next) => {

  const { token } = req.headers;

    if (!token) {
        return res.json({ success: false, message: 'No token, authorization denied' });
    }

    try {

        const token_decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = token_decoded.id;
        next();

    } catch (error) {
       logError(error, 'authUser');
         return res.json({ success: false, message: error.message });
    }

}

export default authUser;