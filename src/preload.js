const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("Electron", {
  ipcRenderer: {
    invoke: (channel, args) => ipcRenderer.invoke(channel, args),
    on: (channel, listener) => ipcRenderer.on(channel, listener),
  },
});
