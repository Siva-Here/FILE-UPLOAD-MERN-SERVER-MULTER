const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { format } = require('date-fns');

const app = express();
app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const currentDate = format(new Date(), 'yyyy-MM-dd_HH-mm-ss'); // Format current date and time
    const fileExtension = getFileExtension(file.originalname); // Extract sanitized file extension
    const filename = `${currentDate}.${fileExtension}`; // Combine date and extension
    cb(null, filename);
  }
});

function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length === 1) {
    return parts[0];
  }
  return parts.pop();
}

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, and PNG files are allowed.'));
    }
  },
  limits: {
    fileSize: 1 * 1024 * 1024 // 1MB limit
  }
}).single('file');

// Serve uploaded images statically
app.use('/uploads', express.static('secure_uploads'));

app.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File is too large. Maximum size allowed is 1MB.' });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const uploadDir = 'secure_uploads/';
    const securePath = uploadDir + req.file.filename;
    try {
      fs.mkdirSync(uploadDir, { recursive: true }); 
      fs.renameSync(req.file.path, securePath);
    } catch (error) {
      console.error('Error storing file:', error);
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Failed to store the file securely.' });
    }
    return res.json({ message: 'File uploaded successfully.', filename: req.file.filename });
  });
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
