import sys
import subprocess
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QLineEdit, QPushButton, QLabel, QMessageBox

class VNCLauncher(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("VNC Launcher (外部VNCクライアント起動)")
        layout = QVBoxLayout()

        self.host_input = QLineEdit()
        self.host_input.setPlaceholderText("VNCサーバー (例: 192.168.1.10)")
        self.port_input = QLineEdit()
        self.port_input.setPlaceholderText("ポート (例: 5900)")
        self.user_input = QLineEdit()
        self.user_input.setPlaceholderText("ユーザー名（省略可）")
        launch_btn = QPushButton("VNCクライアントで開く")
        launch_btn.clicked.connect(self.launch_vnc)
        self.info_label = QLabel("MacのVNCクライアントでRaspiを操作できます")

        layout.addWidget(self.host_input)
        layout.addWidget(self.port_input)
        layout.addWidget(self.user_input)
        layout.addWidget(launch_btn)
        layout.addWidget(self.info_label)
        self.setLayout(layout)

    def launch_vnc(self):
        host = self.host_input.text()
        port = self.port_input.text() or "5900"
        user = self.user_input.text()
        if not host:
            QMessageBox.warning(self, "入力エラー", "ホストを入力してください")
            return
        # vnc://[user@]host:port 形式
        url = f"vnc://{user+'@' if user else ''}{host}:{port}"
        try:
            subprocess.Popen(["open", url])
        except Exception as e:
            QMessageBox.critical(self, "起動エラー", str(e))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = VNCLauncher()
    win.show()
    sys.exit(app.exec_())
