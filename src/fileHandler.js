const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

/**
 * Dynamically determines if a file is binary by inspecting its byte content.
 * @param {string} filePath - Path to the file.
 * @param {number} fileSize - Size of the file in bytes.
 * @returns {Promise<boolean>} True if binary, false if text.
 */
async function checkIsBinary(filePath, fileSize) {
    // Failsafe 1: If it's larger than 100KB, always stream it to protect memory
    if (fileSize > 1024 * 100) return true;

    try {
        const fileHandle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(4096); // Read up to the first 4KB
        const { bytesRead } = await fileHandle.read(buffer, 0, 4096, 0);
        await fileHandle.close();

        // Failsafe 2: Byte-Level Inspection
        // If the file contains a null byte (0x00), it is a compiled/binary/media file.
        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) {
                return true; // It's binary (e.g., .mp3, .gif, .webm, .zip)
            }
        }
        return false; // No null bytes found, it is a text file (e.g., Dockerfile, .env)
    } catch (err) {
        return true; // Default to binary streaming on read errors for maximum safety
    }
}

/**
 * Recursively scans the target directory.
 * @param {string} currentDir - The directory to scan.
 * @param {boolean} isDryRun - Whether dry-run mode is active.
 * @returns {Promise<Array>} List of file information objects.
 */
async function scanDirectory(currentDir, isDryRun = false) {
    if (isDryRun) {
        console.log(`[INFO] (Dry-Run) Would scan directory: ${currentDir}`);
    }

    let results = [];
    try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                // Ignore system and output directories to prevent infinite loops
                if (['.git', 'node_modules', 'received-data'].includes(entry.name)) continue;
                
                const subResults = await scanDirectory(fullPath, isDryRun);
                results = results.concat(subResults);
            } else if (entry.isFile()) {
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.size === 0) {
                        if (isDryRun) console.log(`[INFO] (Dry-Run) Would skip empty file: ${fullPath}`);
                        continue; // Skip empty files
                    }

                    // DYNAMIC BINARY DETECTION (Replaces hardcoded extensions)
                    const isBinary = await checkIsBinary(fullPath, stats.size);

                    if (isDryRun) {
                        console.log(`[INFO] (Dry-Run) Discovered file: ${fullPath} (Binary: ${isBinary})`);
                    }

                    results.push({
                        path: fullPath,
                        name: entry.name,
                        size: stats.size,
                        isBinary: isBinary
                    });
                } catch (statError) {
                    if (statError.code === 'EACCES' || statError.code === 'ENOENT') {
                        console.error(`[ERROR] Skipping file ${fullPath} due to error: ${statError.code}`);
                    } else {
                        console.error(`[ERROR] Unexpected error stating file ${fullPath}: ${statError.message}`);
                    }
                }
            }
        }
    } catch (err) {
        if (err.code === 'EACCES' || err.code === 'ENOENT') {
            console.error(`[ERROR] Cannot access directory ${currentDir}: ${err.code}`);
        } else {
            console.error(`[ERROR] Failed to read directory ${currentDir}:`, err.message);
        }
    }

    return results;
}

/**
 * Reads text file contents safely.
 * @param {string} filePath - Path to read.
 * @param {boolean} isDryRun - Dry-run flag.
 * @returns {Promise<string|null>} File contents or null if error/dry-run.
 */
async function readTextFile(filePath, isDryRun = false) {
    if (isDryRun) {
        console.log(`[INFO] (Dry-Run) Would read text file: ${filePath}`);
        return null;
    }
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
        console.error(`[ERROR] Failed to read text file ${filePath}: ${err.message}`);
        return null;
    }
}

/**
 * Returns a read stream for a file safely.
 * @param {string} filePath - Path to read.
 * @returns {fs.ReadStream|null} The read stream or null.
 */
function getFileStream(filePath) {
    return fsSync.createReadStream(filePath);
}

module.exports = {
    scanDirectory,
    readTextFile,
    getFileStream
};