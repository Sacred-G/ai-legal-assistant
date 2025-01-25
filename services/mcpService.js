import { spawn } from 'child_process';

export class MCPService {
  constructor() {
    this.serverProcess = null;
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      try {
        // Start the filesystem server process
        this.serverProcess = spawn('npx', ['-y', '@modelcontextprotocol/server-filesystem@0.6.2', '/Volumes/DevDrive/caselaw/ai-legal-assistant/uploads'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Listen for server ready message
        this.serverProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('[filesystem] stdout:', output);
          if (output.includes('Secure MCP Filesystem Server running')) {
            resolve();
          }
        });

        // Handle errors
        this.serverProcess.stderr.on('data', (data) => {
          console.log('[filesystem] stderr:', data.toString());
        });

        this.serverProcess.on('error', (err) => {
          console.error('Failed to start filesystem server:', err);
          reject(err);
        });

        this.serverProcess.on('exit', (code) => {
          if (code !== 0) {
            const error = new Error(`filesystem server exited with code ${code}`);
            console.error(error);
            reject(error);
          }
        });

        // Set a timeout in case the server doesn't start
        setTimeout(() => {
          reject(new Error('Timeout waiting for filesystem server to start'));
        }, 30000);
      } catch (err) {
        console.error('Error starting filesystem server:', err);
        reject(err);
      }
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Cleaning up MCP servers...');
  const mcpService = new MCPService();
  await mcpService.stopServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Cleaning up MCP servers...');
  const mcpService = new MCPService();
  await mcpService.stopServer();
  process.exit(0);
});

export default new MCPService();
