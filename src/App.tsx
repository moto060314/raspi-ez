import React, { useState } from "react";

const App = () => {
  const [ipAddress, setIpAddress] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [sshOutput, setSshOutput] = useState("");

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();

    if (!window.Electron || !window.Electron.ipcRenderer) {
      console.error("Electron IPC Renderer が利用できません");
      return;
    }

    window.Electron.ipcRenderer.invoke("start-ssh", {
      host: ipAddress,
      username: userId,
      password: password,
    });

    window.Electron.ipcRenderer.on("ssh-data", (event, data) => {
      setSshOutput((prev) => prev + data);
    });

    window.Electron.ipcRenderer.on("ssh-exit", () => {
      console.log("SSH 接続が終了しました");
    });
  };

  return (
    <div>
      <h1>Raspberry Pi デスクトップアプリ</h1>
      <div>
        <h2>接続情報</h2>
        <form onSubmit={handleConnect}>
          <div>
            <label htmlFor="ipAddress">IPアドレス:</label>
            <input
              type="text"
              id="ipAddress"
              name="ipAddress"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="userId">ユーザーID:</label>
            <input
              type="text"
              id="userId"
              name="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">パスワード:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit">接続</button>
        </form>
      </div>
      <div>
        <h2>SSH コンソール</h2>
        <textarea
          id="sshConsole"
          rows={10}
          cols={50}
          value={sshOutput}
          readOnly
        ></textarea>
      </div>
      <div>
        <h2>SSH ディレクトリ管理</h2>
        <button>アップロード</button>
        <button>ダウンロード</button>
      </div>
    </div>
  );
};

export default App;
