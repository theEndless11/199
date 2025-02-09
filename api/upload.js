const express = require('express');
const multer = require('multer');
const app = express();

// Set up storage for images (e.g., in "uploads" folder)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Endpoint for image upload
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (req.file) {
        // Assuming you store the image URL in the response
        const imageUrl = `/uploads/${req.file.filename}`;
        return res.json({ photoUrl: imageUrl });
    } else {
        return res.status(400).json({ error: 'No file uploaded' });
    }
});
