const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Database = require('better-sqlite3');
const fs = require('fs');

// Initialize database
const APP_DATA_PATH = path.join(app.getPath('appData'), 'MyInventoryApp');
const DB_PATH = path.join(APP_DATA_PATH, 'data.sqlite');
const IMAGES_PATH = path.join(APP_DATA_PATH, 'images');

// Ensure directories exist
if (!fs.existsSync(APP_DATA_PATH)) {
    fs.mkdirSync(APP_DATA_PATH, { recursive: true });
}
if (!fs.existsSync(IMAGES_PATH)) {
    fs.mkdirSync(IMAGES_PATH, { recursive: true });
}

// Initialize database with busy timeout
let db;
try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
} catch (err) {
    console.error('Database initialization failed:', err);
    app.quit();
}

function createWindow() {
    // Set app user model id for Windows notifications
    app.setAppUserModelId(process.execPath);
    
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Load app
    if (isDev) {
        win.loadURL('http://localhost:3000');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, 'build', 'index.html'));
    }

    return win;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Database initialization
function initializeDatabase() {
    const createTables = db.transaction(() => {
        // Products table
        db.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sku TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                reorder_point INTEGER NOT NULL DEFAULT 5,
                image_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Sales table
        db.exec(`
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total REAL NOT NULL,
                customer_name TEXT,
                status TEXT DEFAULT 'completed'
            )
        `);

        // Sale items table
        db.exec(`
            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER,
                product_id INTEGER,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);
    });

    try {
        createTables();
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Database initialization error:', err);
        app.quit();
    }
}

// Initialize database on app start
initializeDatabase();

// IPC Handlers
ipcMain.handle('get-products', () => {
    const stmt = db.prepare('SELECT * FROM products ORDER BY name');
    return stmt.all();
});

ipcMain.handle('add-product', (event, product) => {
    const stmt = db.prepare(`
        INSERT INTO products (name, sku, category, description, price, stock, reorder_point, image_path)
        VALUES (@name, @sku, @category, @description, @price, @stock, @reorder_point, @image_path)
    `);
    
    try {
        const info = stmt.run(product);
        return { success: true, id: info.lastInsertRowid };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Handle low stock notifications
ipcMain.on('show-notification', (event, { title, body }) => {
    new Notification({ title, body }).show();
});

// Clean up database connection on quit
app.on('before-quit', () => {
    if (db) {
        db.close();
    }
});
