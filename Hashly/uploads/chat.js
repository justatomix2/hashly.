const ws = new WebSocket("ws://localhost:3000");

ws.onmessage = e => {
  const div = document.createElement("div");
  div.textContent = e.data;
  messages.append(div);
};

chatForm.onsubmit = e => {
  e.preventDefault();
  ws.send(chatInput.value);
  chatInput.value = "";
};
