const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const pty = require("node-pty");

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // preload.js を指定
      contextIsolation: true, // contextBridge を有効化
      enableRemoteModule: false, // セキュリティ向上のため無効化
    },
  });

  mainWindow.loadFile("dist/index.html");
});

// IPC ハンドラを追加
ipcMain.handle("start-ssh", (event, { host, username, password }) => {
  const sshProcess = pty.spawn("ssh", [`${username}@${host}`], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env,
  });

  sshProcess.on("data", (data) => {
    event.sender.send("ssh-data", data);
  });

  sshProcess.on("exit", () => {
    event.sender.send("ssh-exit");
  });

  return true;
});
