/**
 * Logger utility for consistent error logging
 */

export const logError = (error, context = 'general') => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR][${timestamp}][${context}]`, error.message);
    if (error.stack) {
        console.error(error.stack);
    }
};

export const logInfo = (message, context = 'general') => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO][${timestamp}][${context}]`, message);
};

export const logWarn = (message, context = 'general') => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN][${timestamp}][${context}]`, message);
};
