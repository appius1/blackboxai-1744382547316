const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // Database operations
    invoke: (channel, data) => {
      const validChannels = [
        'get-products',
        'add-product',
        'update-product',
        'delete-product',
        'get-sales',
        'create-sale',
        'get-report-data',
        'get-settings',
        'save-settings',
        'save-image',
        'save-invoice',
        'select-backup-location',
        'enable-notifications'
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      throw new Error(`Invalid channel: ${channel}`);
    },

    // File system operations
    handleFiles: async (files) => {
      const fileHandles = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        fileHandles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: Buffer.from(buffer)
        });
      }
      return fileHandles;
    },

    // Notifications
    showNotification: (options) => {
      ipcRenderer.send('show-notification', options);
    },

    // Event listeners
    on: (channel, func) => {
      const validChannels = [
        'low-stock-alert',
        'backup-complete',
        'settings-updated'
      ];
      if (validChannels.includes(channel)) {
        // Strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },

    // Event removal
    removeListener: (channel, func) => {
      const validChannels = [
        'low-stock-alert',
        'backup-complete',
        'settings-updated'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    }
  }
);

// Handle uncaught exceptions in the renderer process
window.addEventListener('error', (event) => {
  event.preventDefault();
  console.error('Uncaught error:', event.error);
  ipcRenderer.send('renderer-error', {
    message: event.error.message,
    stack: event.error.stack
  });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.error('Unhandled promise rejection:', event.reason);
  ipcRenderer.send('renderer-error', {
    message: event.reason.message,
    stack: event.reason.stack
  });
});

// Initialize any required preload operations
window.addEventListener('DOMContentLoaded', () => {
  // Apply any saved theme
  ipcRenderer.invoke('get-settings').then(settings => {
    if (settings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }).catch(console.error);
});
