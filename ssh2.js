import React, { useState } from "react";
import { Client } from "ssh2";

const SSHConsole = () => {
  const [output, setOutput] = useState("");
  const [command, setCommand] = useState("");

  const executeCommand = () => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) throw err;
          stream
            .on("data", (data) => {
              setOutput((prev) => prev + data.toString());
            })
            .stderr.on("data", (data) => {
              setOutput((prev) => prev + "エラー: " + data.toString());
            });
        });
      })
      .connect({
        host: "raspberrypi.local",
        port: 22,
        username: "pi",
        password: "your_password",
      });
  };

  return (
    <div>
      <textarea
        rows={10}
        cols={50}
        value={output}
        readOnly
        placeholder="コマンドの出力がここに表示されます"
      ></textarea>
      <br />
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="コマンドを入力"
      />
      <button onClick={executeCommand}>実行</button>
    </div>
  );
};

export default SSHConsole;
