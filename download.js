const Client = require("ssh2-sftp-client");
const sftp = new Client();

sftp
  .connect({
    host: "raspberrypi.local",
    port: 22,
    username: "pi",
    password: "your_password",
  })
  .then(() => {
    console.log("接続成功");
    // ファイルをダウンロード
    return sftp.get("/home/pi/remote_file_path.txt", "local_file_path.txt");
  })
  .then(() => {
    console.log("ファイルダウンロード成功");
    // リモートディレクトリの内容をリスト
    return sftp.list("/home/pi");
  })
  .then((data) => {
    console.log("ディレクトリ内容:", data);
  })
  .catch((err) => {
    console.error("エラー:", err);
  })
  .finally(() => {
    sftp.end();
  });
