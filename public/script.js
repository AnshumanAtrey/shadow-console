async function sendCommand() {
  const commandInput = document.getElementById("command");
  const statusDiv = document.getElementById("status");
  const command = commandInput.value;

  if (!command) {
    showStatus("Please enter a command", false);
    return;
  }

  try {
    const response = await fetch("/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    const data = await response.json();
    showStatus(data.message, true);
    commandInput.value = "";
  } catch (error) {
    showStatus("Error sending command: " + error, false);
  }
}

function showStatus(message, success) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = success ? "success" : "error";
  setTimeout(() => {
    statusDiv.textContent = "";
    statusDiv.className = "";
  }, 3000);
}

// Allow Enter key to submit
document.getElementById("command").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendCommand();
  }
});
