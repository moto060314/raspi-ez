import React from "react";
import Client from "ssh2-sftp-client";

const FileManager = () => {
  const uploadFile = async () => {
    const sftp = new Client();
    await sftp.connect({
      host: "raspberrypi.local",
      port: 22,
      username: "pi",
      password: "your_password",
    });
    await sftp.put("local_file_path.txt", "/home/pi/remote_file_path.txt");
    console.log("ファイルアップロード成功");
    await sftp.end();
  };

  const downloadFile = async () => {
    const sftp = new Client();
    await sftp.connect({
      host: "raspberrypi.local",
      port: 22,
      username: "pi",
      password: "your_password",
    });
    await sftp.get("/home/pi/remote_file_path.txt", "local_file_path.txt");
    console.log("ファイルダウンロード成功");
    await sftp.end();
  };

  return (
    <div>
      <button onClick={uploadFile}>アップロード</button>
      <button onClick={downloadFile}>ダウンロード</button>
    </div>
  );
};

export default FileManager;
