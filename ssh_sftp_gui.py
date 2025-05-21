import sys
import paramiko
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QLineEdit,
    QPushButton, QLabel, QFileDialog, QMessageBox, QInputDialog, QListView, QTreeView, QAbstractItemView
)

class SSHSFTPClient(QWidget):
    def __init__(self):
        super().__init__()
        self.ssh = None
        self.sftp = None
        self.shell = None  # 追加: シェルチャネル
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Raspi SSH & SFTP Client")
        layout = QVBoxLayout()

        # SSH接続情報
        self.host_input = QLineEdit()
        self.host_input.setPlaceholderText("Host (例: 192.168.1.10)")
        self.user_input = QLineEdit()
        self.user_input.setPlaceholderText("Username")
        self.pass_input = QLineEdit()
        self.pass_input.setPlaceholderText("Password")
        self.pass_input.setEchoMode(QLineEdit.Password)
        connect_btn = QPushButton("Connect")
        connect_btn.clicked.connect(self.connect_ssh)

        hlayout = QHBoxLayout()
        hlayout.addWidget(self.host_input)
        hlayout.addWidget(self.user_input)
        hlayout.addWidget(self.pass_input)
        hlayout.addWidget(connect_btn)
        layout.addLayout(hlayout)

        # SSHコンソール
        self.ssh_output = QTextEdit()
        self.ssh_output.setReadOnly(True)
        self.ssh_input = QLineEdit()
        self.ssh_input.setPlaceholderText("コマンドを入力してEnter")
        self.ssh_input.returnPressed.connect(self.send_command)
        layout.addWidget(QLabel("SSH Console"))
        layout.addWidget(self.ssh_output)
        layout.addWidget(self.ssh_input)

        # SFTP操作
        sftp_layout = QHBoxLayout()
        upload_btn = QPushButton("Upload Dir")
        upload_btn.clicked.connect(self.upload_dir)
        download_btn = QPushButton("Download Dir")
        download_btn.clicked.connect(self.download_dir)
        sftp_layout.addWidget(upload_btn)
        sftp_layout.addWidget(download_btn)
        layout.addLayout(sftp_layout)

        self.setLayout(layout)

    def connect_ssh(self):
        host = self.host_input.text()
        user = self.user_input.text()
        password = self.pass_input.text()
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(host, username=user, password=password)
            self.sftp = self.ssh.open_sftp()
            self.shell = self.ssh.invoke_shell()  # 追加: シェル起動
            self.ssh_output.append("SSH接続成功")
        except Exception as e:
            QMessageBox.critical(self, "接続エラー", str(e))

    def send_command(self):
        if not self.shell:
            self.ssh_output.append("SSH未接続")
            return
        cmd = self.ssh_input.text()
        self.ssh_input.clear()
        try:
            self.shell.send(cmd + "\n")
            import time
            time.sleep(0.2)  # 少し待つ
            output = ""
            while self.shell.recv_ready():
                output += self.shell.recv(4096).decode(errors="ignore")
            self.ssh_output.append(f"$ {cmd}\n{output}")
        except Exception as e:
            self.ssh_output.append(f"コマンド実行エラー: {e}")

    def upload_dir(self):
        if not self.sftp:
            QMessageBox.warning(self, "警告", "SFTP未接続")
            return
        # ファイルまたはディレクトリ選択
        file_dialog = QFileDialog(self)
        file_dialog.setFileMode(QFileDialog.ExistingFiles)
        file_dialog.setOption(QFileDialog.DontUseNativeDialog, True)
        file_view = file_dialog.findChild(QListView, "listView")
        if file_view:
            file_view.setSelectionMode(QAbstractItemView.ExtendedSelection)
        tree_view = file_dialog.findChild(QTreeView)
        if tree_view:
            tree_view.setSelectionMode(QAbstractItemView.ExtendedSelection)
        if file_dialog.exec_():
            selected = file_dialog.selectedFiles()
        else:
            return
        # リモートディレクトリ入力
        remote_dir, ok = QInputDialog.getText(self, "リモートディレクトリ名入力", "Raspi上の保存先ディレクトリ（例: /home/pi/upload）:")
        if not ok or not remote_dir:
            return
        import os
        for path in selected:
            if os.path.isdir(path):
                base = os.path.basename(path.rstrip("/"))
                self._upload_dir_recursive(path, remote_dir + "/" + base)
            else:
                remote_path = remote_dir + "/" + os.path.basename(path)
                self.sftp.put(path, remote_path)
        QMessageBox.information(self, "完了", "アップロード完了")

    def _upload_dir_recursive(self, local_dir, remote_dir):
        import os
        try:
            self.sftp.mkdir(remote_dir)
        except IOError:
            pass  # 既に存在する場合
        for item in os.listdir(local_dir):
            lpath = os.path.join(local_dir, item)
            rpath = remote_dir + "/" + item
            if os.path.isdir(lpath):
                self._upload_dir_recursive(lpath, rpath)
            else:
                self.sftp.put(lpath, rpath)

    def download_dir(self):
        if not self.sftp:
            QMessageBox.warning(self, "警告", "SFTP未接続")
            return
        # リモートファイルまたはディレクトリ入力
        remote_path, ok = QInputDialog.getText(self, "リモートパス入力", "Raspi上のダウンロード元パス（例: /home/pi/file.txt または /home/pi/dir）:")
        if not ok or not remote_path:
            return
        # ローカル保存先ディレクトリ選択
        local_dir = QFileDialog.getExistingDirectory(self, "保存先ローカルディレクトリ選択")
        if not local_dir:
            return
        # ファイルかディレクトリか判定
        try:
            attr = self.sftp.stat(remote_path)
            import stat, os
            if stat.S_ISDIR(attr.st_mode):
                base = os.path.basename(remote_path.rstrip("/"))
                self._download_dir_recursive(remote_path, os.path.join(local_dir, base))
            else:
                local_path = os.path.join(local_dir, os.path.basename(remote_path))
                self.sftp.get(remote_path, local_path)
            QMessageBox.information(self, "完了", "ダウンロード完了")
        except Exception as e:
            QMessageBox.critical(self, "エラー", str(e))

    def _download_dir_recursive(self, remote_dir, local_dir):
        import os
        try:
            os.makedirs(local_dir, exist_ok=True)
            for entry in self.sftp.listdir_attr(remote_dir):
                rpath = remote_dir + "/" + entry.filename
                lpath = os.path.join(local_dir, entry.filename)
                if paramiko.SFTPAttributes.from_stat(entry.st_mode).st_mode & 0o40000:  # ディレクトリ
                    self._download_dir_recursive(rpath, lpath)
                else:
                    self.sftp.get(rpath, lpath)
        except Exception as e:
            QMessageBox.critical(self, "エラー", str(e))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = SSHSFTPClient()
    win.show()
    sys.exit(app.exec_())
