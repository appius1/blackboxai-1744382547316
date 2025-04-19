const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { APIError } = require('./error.middleware');

const appDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
const imagesDir = path.join(appDataPath, 'MyInventoryApp', 'images');

// Ensure images directory exists
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, imagesDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new APIError('Only image files are allowed!', 400), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
