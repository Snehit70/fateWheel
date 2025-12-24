/**
 * Validates a password against strength requirements.
 * Requirements: At least 8 characters.
 * @param {string} password 
 * @returns {boolean}
 */
const validatePassword = (password) => {
    // At least 8 characters
    return password && password.length >= 8;
};

module.exports = {
    validatePassword
};
