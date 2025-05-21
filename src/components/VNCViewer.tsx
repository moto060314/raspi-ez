import React, { useRef, useState } from "react";

declare global {
  interface Window {
    RFB: any;
  }
}

const VncViewer = () => {
  const canvasParentRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState("");
  const [user, setUser] = useState(""); // ユーザーID用
  const [password, setPassword] = useState(""); // パスワード用
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rfbRef = useRef<any>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);

    try {
      if (typeof window.RFB !== "function") {
        throw new Error(
          "noVNC (RFB) ライブラリが正しく読み込まれていません。index.htmlの<script>タグを確認してください。"
        );
      }
      const wsUrl = `ws://localhost:6080/?host=${host}&port=5900`;
      rfbRef.current = new window.RFB(canvasParentRef.current!, wsUrl, {
        credentials: { username: user, password: password },
      });
      rfbRef.current.addEventListener("connect", () => setConnected(true));
      rfbRef.current.addEventListener("disconnect", () => setConnected(false));
    } catch (e: any) {
      setError("接続できませんでした: " + (e?.message ?? e));
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
            placeholder="ユーザーID（任意）"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <button type="submit" disabled={connecting} style={{ marginLeft: 8 }}>
            接続
          </button>
          {connecting && <span>接続中...</span>}
          {error && (
            <span style={{ color: "red", marginLeft: 8 }}>{error}</span>
          )}
        </form>
      )}
      <h3>VNC Viewer</h3>
      <div
        ref={canvasParentRef}
        style={{ width: 800, height: 600, border: "1px solid #ccc" }}
      />
    </div>
  );
};

export default VncViewer;
