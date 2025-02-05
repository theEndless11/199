// api/users.js
import { getUsers, getUserById } from '../../utils/db'; // Assuming you have a user model that interacts with your DB

export default async function handler(req, res) {
    const { userId } = req.query; // Get userId from the query string

    try {
        if (userId) {
            // If userId is provided, get both the logged-in user and all users excluding the logged-in user
            const loggedInUser = await getUserById(userId);  // Get logged-in user
            if (!loggedInUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get all users excluding the logged-in user
            const allUsers = await getUsers();
            const otherUsers = allUsers.filter(user => user.id !== userId);

            return res.status(200).json({
                loggedInUser,  // Logged-in user data
                allUsers: otherUsers  // All users excluding the logged-in user
            });
        } else {
            // If no userId is provided, return all users
            const allUsers = await getUsers();
            return res.status(200).json({ allUsers });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
