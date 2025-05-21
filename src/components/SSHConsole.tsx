import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

// window.electronAPIの型をanyで宣言
declare global {
  interface Window {
    electronAPI: any;
  }
}

const SSHConsole = () => {
  const termRef = useRef(null);
  const terminal = useRef<any>(null);

  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) {
      console.error(
        "electronAPI is not defined. このアプリはElectron上でのみ動作します。"
      );
      return;
    }
    terminal.current = new Terminal();
    terminal.current.open(termRef.current!);

    // データ受信
    window.electronAPI.onSshData((data: string) => {
      terminal.current?.write(data);
    });

    // 入力送信
    terminal.current.onData((data) => {
      window.electronAPI.sshInput(data);
    });

    // 切断時
    window.electronAPI.onSshClose(() => {
      terminal.current?.writeln("\r\n*** SSH Disconnected ***");
      setConnected(false);
    });

    return () => {
      window.electronAPI.sshDisconnect();
      terminal.current?.dispose();
    };
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await window.electronAPI.sshConnect({
        host,
        port: 22,
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConnect();
          }}
          style={{ marginBottom: 10 }}
        >
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
      <div
        ref={termRef}
        style={{ width: "100%", height: "100%", background: "black" }}
      />
    </div>
  );
};

export default SSHConsole;
