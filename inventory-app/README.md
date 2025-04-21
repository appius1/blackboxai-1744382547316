# Inventory Management System

An offline-first desktop inventory management application built with Electron and React.

## Features

- **Product Management**: CRUD operations, image upload, and stock tracking
- **Sales & Orders**: Order entry, invoice generation (PDF)
- **Inventory Tracking**: Stock levels, reorder points, low-stock alerts
- **Reporting**: Interactive charts and data visualization
- **Data Export**: CSV export for any table
- **Offline Storage**: Local SQLite database
- **Dark Mode**: Full dark mode support

## Tech Stack

- Electron.js + Node.js
- React (Hooks + Functional Components)
- SQLite (better-sqlite3)
- Chart.js for visualizations
- jsPDF/html2canvas for PDF generation
- Tailwind CSS for styling

## Prerequisites

- Node.js 14.x or later
- npm 6.x or later

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/inventory-app.git
cd inventory-app
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm start
```

This will:
- Start the React development server
- Launch the Electron application
- Enable hot reloading

## Building

Create a production build:
```bash
npm run build
```

Create a portable Windows executable:
```bash
npm run dist
```

The portable .exe will be available in the `dist` directory.

## Project Structure

```
inventory-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   └── TopNav.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── Sales.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   ├── App.jsx
│   ├── index.js
│   └── index.css
├── main.js
├── preload.js
└── package.json
```

## Database

The application uses SQLite for data storage, located at:
```
%APPDATA%/MyInventoryApp/data.sqlite
```

Images are stored at:
```
%APPDATA%/MyInventoryApp/images/
```

## Important Notes

1. **SQLite Busy Timeout**: The application sets a PRAGMA busy_timeout and uses BEGIN IMMEDIATE for write transactions to avoid SQLITE_BUSY errors.

2. **Chart.js Containers**: All chart containers include `min-width: 0` when inside flex/grid layouts to ensure proper rendering.

3. **PDF Generation**: Images are properly loaded via `new Image()` + `onload` or converted through canvas → `toDataURL` before `addImage`.

4. **Windows Notifications**: The application sets `app.setAppUserModelId(process.execPath)` to ensure notification click events work properly.

## Troubleshooting

### Common Issues

1. **Database Locked**
   - The application uses proper transaction handling to prevent database locks
   - If issues persist, check if multiple instances are running

2. **Images Not Loading**
   - Verify the images directory exists at %APPDATA%/MyInventoryApp/images/
   - Check file permissions

3. **PDF Generation Fails**
   - Ensure all images are fully loaded before generation
   - Check available system memory

### Error Logs

Logs are stored at:
```
%APPDATA%/MyInventoryApp/logs/
```

## License

MIT License - see LICENSE file for details
