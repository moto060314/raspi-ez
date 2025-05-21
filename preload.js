const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sshConnect: (params) => ipcRenderer.invoke("ssh-connect", params),
  sshInput: (data) => ipcRenderer.send("ssh-input", data),
  sshDisconnect: () => ipcRenderer.send("ssh-disconnect"),
  onSshData: (callback) =>
    ipcRenderer.on("ssh-data", (event, data) => callback(data)),
  onSshClose: (callback) => ipcRenderer.on("ssh-close", callback),
  // SFTP
  sftpConnect: (params) => ipcRenderer.invoke("sftp-connect", params),
  sftpList: (path) => ipcRenderer.invoke("sftp-list", path),
  sftpDownload: (remote, local) =>
    ipcRenderer.invoke("sftp-download", remote, local),
  sftpUpload: (local, remote) =>
    ipcRenderer.invoke("sftp-upload", local, remote),
  sftpDelete: (remote) => ipcRenderer.invoke("sftp-delete", remote),
  sftpDisconnect: () => ipcRenderer.send("sftp-disconnect"),
  // VNC
  vncConnect: (params) => ipcRenderer.invoke("vnc-connect", params),
  vncSend: (data) => ipcRenderer.send("vnc-send", data),
  vncDisconnect: () => ipcRenderer.send("vnc-disconnect"),
  onVncData: (cb) => ipcRenderer.on("vnc-data", (e, d) => cb(d)),
  onVncConnected: (cb) => ipcRenderer.on("vnc-connected", cb),
  onVncClose: (cb) => ipcRenderer.on("vnc-close", cb),
});

// デバッグ用: preload.jsが実行されたことをログ出力
console.log("preload.js loaded");
