const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { Client } = require("ssh2");
const pty = require("node-pty");
const SftpClient = require("ssh2-sftp-client");
const net = require("net");

let win;
let sshClient;
let sshPty;
const sftp = new SftpClient();
let vncSocket = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  // 開発時はViteサーバー、ビルド時はファイルをロード
  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
    win.webContents.openDevTools();
  }

  // ウィンドウ表示時にログを出す
  win.webContents.on("did-finish-load", () => {
    console.log("Electronウィンドウが表示されました");
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// SSH接続・PTY生成・IPC通信
ipcMain.handle(
  "ssh-connect",
  async (event, { host, port, username, password }) => {
    return new Promise((resolve, reject) => {
      sshClient = new Client();
      sshClient
        .on("ready", () => {
          sshClient.shell((err, stream) => {
            if (err) {
              reject(err);
              return;
            }
            sshPty = stream;

            // データ受信時にRendererへ転送
            sshPty.on("data", (data) => {
              win.webContents.send("ssh-data", data.toString());
            });

            // エラー時
            sshPty.on("close", () => {
              win.webContents.send("ssh-close");
            });

            resolve(true);
          });
        })
        .on("error", (err) => {
          reject(err);
        })
        .connect({
          host,
          port,
          username,
          password,
          tryKeyboard: true,
        });
    });
  }
);

ipcMain.on("ssh-input", (event, data) => {
  if (sshPty) {
    sshPty.write(data);
  }
});

ipcMain.on("ssh-disconnect", () => {
  if (sshPty) sshPty.end();
  if (sshClient) sshClient.end();
});

// SFTP接続
ipcMain.handle(
  "sftp-connect",
  async (event, { host, port, username, password }) => {
    try {
      await sftp.connect({ host, port, username, password });
      return true;
    } catch (e) {
      return false;
    }
  }
);

// ディレクトリ一覧取得
ipcMain.handle("sftp-list", async (event, path) => {
  try {
    return await sftp.list(path);
  } catch (e) {
    return [];
  }
});

// ファイルダウンロード
ipcMain.handle("sftp-download", async (event, remotePath, localPath) => {
  try {
    await sftp.fastGet(remotePath, localPath);
    return true;
  } catch (e) {
    return false;
  }
});

// ファイルアップロード
ipcMain.handle("sftp-upload", async (event, localPath, remotePath) => {
  try {
    await sftp.fastPut(localPath, remotePath);
    return true;
  } catch (e) {
    return false;
  }
});

// ファイル削除
ipcMain.handle("sftp-delete", async (event, remotePath) => {
  try {
    await sftp.delete(remotePath);
    return true;
  } catch (e) {
    return false;
  }
});

// SFTP切断
ipcMain.handle("sftp-disconnect", async () => {
  try {
    await sftp.end();
    return true;
  } catch (e) {
    return false;
  }
});

// VNCプロキシ（簡易例: VNCサーバーとソケット転送）
ipcMain.on("vnc-connect", (event, { host, port }) => {
  vncSocket = net.connect(port, host, () => {
    event.sender.send("vnc-connected");
  });
  vncSocket.on("data", (data) => {
    event.sender.send("vnc-data", data);
  });
  vncSocket.on("close", () => {
    event.sender.send("vnc-close");
  });
  vncSocket.on("error", () => {
    event.sender.send("vnc-close");
  });
});

ipcMain.on("vnc-send", (event, data) => {
  if (vncSocket) vncSocket.write(data);
});

ipcMain.on("vnc-disconnect", () => {
  if (vncSocket) vncSocket.end();
  vncSocket = null;
});
