/**
 * Validates a password against strength requirements.
 * Requirements: At least 8 characters, one number, one special character.
 * @param {string} password 
 * @returns {boolean}
 */
const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    return passwordRegex.test(password);
};

module.exports = {
    validatePassword
};
