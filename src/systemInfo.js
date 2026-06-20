const os = require('os');

/**
 * Gathers system information and safely extracts specified environment variables.
 * @returns {Object} System information object.
 */
function getSystemInfo() {
    return {
        os: {
            platform: os.platform(),
            architecture: os.arch(),
            hostname: os.hostname(),
            release: os.release(),
            type: os.type()
        },
        nodeVersion: process.version,
        environment: {
            USER: process.env.USER || process.env.USERNAME || "Not Configured",
            NODE_ENV: process.env.NODE_ENV || "Not Configured"
        }
    };
}

module.exports = {
    getSystemInfo
};
