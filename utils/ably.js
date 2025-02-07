// Assuming you have Ably setup like this:
const Ably = require('ably');
const ably = new Ably.Realtime('z-PJnQ.-j8d2A:2MPSxeZ_Vfj487pTV11np4OE5yDTAZiln1a5IXWNj34');

// Subscribe to the 'newMessage' channel to get real-time updates
const channel = ably.channels.get('chat');

channel.subscribe('newMessage', (messageData) => {
  console.log('New message received:', messageData);
  // Update the chat UI dynamically (add to message list, etc.)
  addMessageToChat(messageData);
});

function sendMessage() {
  const userId = 'user1';  // Example userId
  const chatWith = 'user2'; // Example chat with user
  const message = document.getElementById('messageInput').value;

  // Send message to the backend
  fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, chatWith, message }),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Message sent:', data);
    // Optionally, you could also add the message to the chat immediately
    addMessageToChat(data.data); // Add the message from the response to the chat UI
  })
  .catch(error => {
    console.error('Error sending message:', error);
  });
}

function addMessageToChat(messageData) {
  // Dynamically add the message to the chat interface
  const chatBox = document.getElementById('chatBox');
  const messageElement = document.createElement('div');
  messageElement.textContent = `${messageData.userId}: ${messageData.message}`;
  chatBox.appendChild(messageElement);
}

