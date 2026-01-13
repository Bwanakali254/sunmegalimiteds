const isDevelopment = process.env.NODE_ENV !== 'production';

// Sanitize error message to remove sensitive data
const sanitizeMessage = (message) => {
    if (typeof message !== 'string') return message;
    
    // Remove common secret patterns
    const secrets = [
        /password['":\s]*[:=]\s*['"]?[^'",\s}]+/gi,
        /token['":\s]*[:=]\s*['"]?[^'",\s}]+/gi,
        /secret['":\s]*[:=]\s*['"]?[^'",\s}]+/gi,
        /api[_-]?key['":\s]*[:=]\s*['"]?[^'",\s}]+/gi,
        /consumer[_-]?secret['":\s]*[:=]\s*['"]?[^'",\s}]+/gi
    ];
    
    let sanitized = message;
    secrets.forEach(pattern => {
        sanitized = sanitized.replace(pattern, (match) => {
            return match.split('=')[0] + '=***REDACTED***';
        });
    });
    
    return sanitized;
};

export const logError = (error, context = '') => {
    const errorInfo = {
        message: error?.message ? sanitizeMessage(String(error.message)) : 'Unknown error',
        context: context,
        timestamp: new Date().toISOString()
    };
    
    // Only include stack trace in development
    if (isDevelopment && error?.stack) {
        errorInfo.stack = sanitizeMessage(error.stack);
    }
    
    console.error(JSON.stringify(errorInfo));
};

export const logInfo = (message, context = '') => {
    if (isDevelopment) {
        // Full logging in development
        const logInfo = {
            message: message,
            context: context,
            timestamp: new Date().toISOString()
        };
        console.log(JSON.stringify(logInfo));
    } else {
        // Minimal output in production (just message, no context/timestamp overhead)
        console.log(message);
    }
};
