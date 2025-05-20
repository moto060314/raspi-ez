const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { Client } = require("ssh2");
const dns = require("dns").promises; // DNS モジュールをインポート

let mainWindow;

app.on("ready", () => {
  app.commandLine.appendSwitch("disable-gpu"); // GPU を無効化

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // preload.js を指定
      contextIsolation: true, // contextBridge を有効化
      enableRemoteModule: false, // セキュリティ向上のため無効化
    },
  });

  // React のビルド済みファイルを読み込む
  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

  // 本番環境では DevTools を無効化
  if (process.env.NODE_ENV !== "production") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:",
            ],
          },
        });
      }
    );
  });

  // IPC ハンドラーを登録
  ipcMain.handle("start-ssh", async (event, args) => {
    const { host, username, password, command } = args;

    try {
      // ホスト名の解決を確認
      await dns.lookup(host);

      return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.setMaxListeners(0); // イベントリスナーの制限を解除
        conn
          .on("ready", () => {
            console.log("SSH Connection Ready");
            conn.exec(command, (err, stream) => {
              if (err) {
                conn.end();
                return reject({ success: false, error: err.message });
              }
              let output = "";
              stream
                .on("close", (code, signal) => {
                  console.log(
                    "Stream closed with code:",
                    code,
                    "signal:",
                    signal
                  );
                  conn.end();
                  resolve({ success: true, output });
                })
                .on("data", (data) => {
                  output += data.toString();
                })
                .stderr.on("data", (data) => {
                  console.error("STDERR:", data.toString());
                });
            });
          })
          .on("error", (err) => {
            console.error("SSH Connection Error:", err);
            reject({ success: false, error: err.message });
          })
          .connect({
            host,
            port: 22,
            username,
            password,
          });
      });
    } catch (error) {
      console.error("DNS Lookup Error:", error);
      throw new Error(
        JSON.stringify({
          success: false,
          error: `Failed to resolve host: ${host}. Please check the hostname or IP address.`,
        })
      );
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 不要なコードを削除
// console.log("window.Electron:", window.Electron);
