import React, { useEffect, useRef, useState } from "react";

// window.electronAPIの型をanyで宣言
declare global {
  interface Window {
    electronAPI: any;
  }
}

const VncViewer = () => {
  const canvasRef = useRef(null);

  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    if (!window.electronAPI) {
      console.error(
        "electronAPI is not defined. このアプリはElectron上でのみ動作します。"
      );
      return;
    }

    window.electronAPI.vncConnect({ host, port: 5900, username, password });

    window.electronAPI.onVncData((data: ArrayBuffer) => {
      // ここでnoVNCや独自デコーダにデータを渡す
      // 例: noVNCライブラリを使う場合はここで処理
    });

    return () => {
      window.electronAPI.vncDisconnect();
    };
  }, [connected, host, username, password]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      await window.electronAPI.vncConnect({
        host,
        port: 5900,
        username,
        password,
      });
      setConnected(true);
    } catch (e) {
      setError("接続できませんでした");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      {!connected && (
        <form onSubmit={handleConnect} style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="IPアドレス"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="ユーザーID"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={connecting}>
            接続
          </button>
          {connecting && <span>接続中...</span>}
          {error && <span style={{ color: "red" }}>{error}</span>}
        </form>
      )}
      <h3>VNC Viewer</h3>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: "1px solid #ccc" }}
      />
    </div>
  );
};

export default VncViewer;
