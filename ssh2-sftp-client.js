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
