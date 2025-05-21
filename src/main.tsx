import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import SSHConsole from "./components/SSHConsole";
import SFTPBrowser from "./components/SFTPBrowser";
import VncViewer from "./components/VncViewer";

// 認証情報フォームコンポーネント
const AuthForm = ({
  onSubmit,
}: {
  onSubmit: (params: {
    host: string;
    username: string;
    password: string;
  }) => void;
}) => {
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ host, username, password });
      }}
      style={{ marginBottom: 16 }}
    >
      <label>
        IPアドレス:
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
      </label>
      <label>
        ユーザー名:
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
      </label>
      <label>
        パスワード:
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
      </label>
      <button type="submit">接続</button>
    </form>
  );
};

const App = () => {
  const [auth, setAuth] = useState(
    null as {
      host: string;
      username: string;
      password: string;
    } | null
  );

  return (
    <div>
      <h1>raspi-ez</h1>
      <AuthForm onSubmit={setAuth} />
      {auth && (
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>SSH Console</h2>
            <div style={{ height: 300, border: "1px solid #ccc" }}>
              <SSHConsole
                host={auth.host}
                username={auth.username}
                password={auth.password}
              />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>SFTP Browser</h2>
            <div style={{ height: 300, border: "1px solid #ccc" }}>
              <SFTPBrowser
                host={auth.host}
                username={auth.username}
                password={auth.password}
              />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>VNC Viewer</h2>
            <div style={{ height: 300, border: "1px solid #ccc" }}>
              <VncViewer host={auth.host} password={auth.password} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// デバッグ用: レンダリング直前にログを出す
console.log("main.tsx loaded", { SSHConsole, SFTPBrowser, VncViewer });

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
