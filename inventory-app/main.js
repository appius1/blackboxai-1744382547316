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
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
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
                customer_name TEXT,
                subtotal REAL NOT NULL,
                discount REAL DEFAULT 0,
                total_discount REAL DEFAULT 0,
                total REAL NOT NULL,
                status TEXT DEFAULT 'completed'
            )
        `);

        // Sale items table
        db.exec(`
            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER,
                product_id INTEGER,
                quantity REAL NOT NULL,
                price REAL NOT NULL,
                discount REAL DEFAULT 0,
                total REAL NOT NULL,
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

ipcMain.handle('get-sales', () => {
    const stmt = db.prepare('SELECT * FROM sales ORDER BY date DESC');
    return stmt.all();
});

ipcMain.handle('create-sale', (event, saleData) => {
    const createSale = db.transaction((sale) => {
        // Insert sale record
        const saleStmt = db.prepare(`
            INSERT INTO sales (customer_name, subtotal, discount, total_discount, total, date)
            VALUES (@customerName, @subtotal, @discount, @totalDiscount, @total, @date)
        `);
        const saleResult = saleStmt.run({
            customerName: sale.customerName,
            subtotal: sale.subtotal,
            discount: sale.discount,
            totalDiscount: sale.totalDiscount,
            total: sale.total,
            date: sale.date
        });

        const saleId = saleResult.lastInsertRowid;

        // Insert sale items
        const itemStmt = db.prepare(`
            INSERT INTO sale_items (sale_id, product_id, quantity, price, discount, total)
            VALUES (@saleId, @productId, @quantity, @price, @discount, @total)
        `);

        // Update product stock
        const updateStockStmt = db.prepare(`
            UPDATE products
            SET stock = stock - @quantity
            WHERE id = @productId
        `);

        // Process each item
        for (const item of sale.items) {
            itemStmt.run({
                saleId,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
                total: item.total
            });

            updateStockStmt.run({
                quantity: item.quantity,
                productId: item.productId
            });
        }

        return { success: true, saleId };
    });

    try {
        return createSale(saleData);
    } catch (err) {
        console.error('Error creating sale:', err);
        return { success: false, error: err.message };
    }
});

// Handle image saving
ipcMain.handle('save-image', (event, { path: imageName, data }) => {
    const imagePath = path.join(IMAGES_PATH, imageName);
    fs.writeFileSync(imagePath, data);
    return imagePath;
});

// Handle invoice saving
ipcMain.handle('save-invoice', (event, { saleId, data }) => {
    const invoicePath = path.join(APP_DATA_PATH, 'invoices', `invoice-${saleId}.pdf`);
    fs.writeFileSync(invoicePath, Buffer.from(data));
    return invoicePath;
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
