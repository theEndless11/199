// utils/ably.js
const Ably = require('ably');

// Your Ably API key
const ably = new Ably.Realtime('z-PJnQ.-j8d2A:2MPSxeZ_Vfj487pTV11np4OE5yDTAZiln1a5IXWNj34');  // Replace with your API key

// Function to publish to a specific Ably channel
function publishToAbly(event, data) {
  const channel = ably.channels.get('your-channel-name');  // Replace with the dynamic channel name
  return channel.publish(event, data);
}

// Export the function
module.exports = { publishToAbly };

