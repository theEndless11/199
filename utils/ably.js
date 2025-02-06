import Ably from 'ably';

const ably = new Ably.Realtime(process.env.ABLY_API_KEY);  // Fetch Ably API key from environment variables
const channel = ably.channels.get('opinions');  // Use the same 'opinions' channel for all communication

/**
 * Publish a message to the Ably channel
 * @param {string} event - The event name, e.g., 'newOpinion', 'editOpinion', or 'deleteOpinion'
 * @param {Object} data - The data to send in the event
 */
export function publishToAbly(event, data) {
    return new Promise((resolve, reject) => {
        // Serialize the data if needed
        const serializedData = {
            ...data,
            timestamp: new Date().toISOString(),  // Add current timestamp
        };

        // Publish the event with the serialized data
        channel.publish(event, serializedData, (err) => {
            if (err) {
                console.error('Error publishing message to Ably:', err);
                reject(err);
            } else {
                console.log(`Published message to Ably channel with event: ${event}`);
                resolve();
            }
        });
    });
}

/**
 * Subscribe to an event on the Ably channel
 * @param {string} event - The event name to subscribe to
 * @param {Function} callback - The callback function to handle the event
 */
export function subscribeToAbly(event, callback) {
    channel.subscribe(event, (message) => {
        console.log(`Received event: ${event}`, message);
        callback(message);
    });
}
