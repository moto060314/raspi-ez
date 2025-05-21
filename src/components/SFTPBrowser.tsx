import React, { useEffect, useState } from "react";

// window.electronAPIの型をanyで宣言
declare global {
  interface Window {
    electronAPI: any;
  }
}

const SFTPBrowser = () => {
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [path, setPath] = useState("/");
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    return () => {
      window.electronAPI?.sftpDisconnect();
    };
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      await window.electronAPI.sftpConnect({
        host,
        port: 22,
        username,
        password,
      });
      setConnected(true);
      loadList("/");
    } catch (e) {
      setError("接続できませんでした");
    } finally {
      setConnecting(false);
    }
  };

  const loadList = (p: string) => {
    window.electronAPI.sftpList(p).then(setList);
    setPath(p);
  };

  const handleDelete = (file: any) => {
    window.electronAPI
      .sftpDelete(path + "/" + file.name)
      .then(() => loadList(path));
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
      {connected && (
        <>
          <h3>SFTP Browser: {path}</h3>
          <ul>
            {list.map((file) => (
              <li key={file.name}>
                {file.type === "d" ? (
                  <button onClick={() => loadList(path + "/" + file.name)}>
                    [DIR]
                  </button>
                ) : null}
                {file.name}
                <button onClick={() => handleDelete(file)}>Delete</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SFTPBrowser;
