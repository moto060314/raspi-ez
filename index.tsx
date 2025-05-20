import React from "react";
import ReactDOM from "react-dom/client"; // ReactDOM.createRoot をインポート
import MainApp from "./src/App"; // src/App.tsx からインポート

const App = () => {
  console.log("ローカル App コンポーネントがレンダリングされました");
  return (
    <div>
      <h1>Raspberry Pi デスクトップアプリ</h1>
      <div>
        <h2>VNC 機能</h2>
        <canvas id="vncCanvas"></canvas>
      </div>
      <div>
        <h2>SSH コンソール</h2>
        <textarea id="sshConsole" rows={10} cols={50}></textarea>
      </div>
      <div>
        <h2>SSH ディレクトリ管理</h2>
        <button>アップロード</button>
        <button>ダウンロード</button>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(<MainApp />);

export default App;
