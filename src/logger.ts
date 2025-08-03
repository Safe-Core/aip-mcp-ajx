// logger.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Custom logger for MCP that ensures logs work both in normal mode and inspector mode
 */
export class Logger {
  private static instance: Logger;
  private isMcpInspector: boolean;
  private server?: Server;
  
  private constructor() {
    // Check if we're running in MCP Inspector mode
    this.isMcpInspector = process.argv.some(arg => 
      arg.includes('@modelcontextprotocol/inspector')
    );
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  public registerServer(server: Server): void {
    this.server = server;
  }
  
  public log(...args: any[]): void {
    // Always log to console
    console.log(...args);
    
    // When in MCP Inspector mode, send to stdout in a way that doesn't interfere with MCP
    if (this.isMcpInspector && this.server) {
      // This ensures the log doesn't interfere with MCP protocol
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Writing directly to stderr bypasses the MCP protocol
      process.stderr.write(`LOG: ${message}\n`);
    }
  }
  
  public error(...args: any[]): void {
    // Always log to console error
    console.error(...args);
    
    // When in MCP Inspector mode, send to stderr in a way that doesn't interfere with MCP
    if (this.isMcpInspector) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Writing directly to stderr bypasses the MCP protocol
      process.stderr.write(`ERROR: ${message}\n`);
    }
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();
