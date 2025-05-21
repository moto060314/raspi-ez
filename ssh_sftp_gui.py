import sys
import paramiko
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QLineEdit,
    QPushButton, QLabel, QFileDialog, QMessageBox, QInputDialog, QListView, QTreeView, QAbstractItemView,
    QMenu, QSplitter
)
from PyQt5.QtCore import Qt, QDir, QModelIndex
from PyQt5.QtGui import QStandardItemModel, QStandardItem
import os

# --- 追加: socketioクライアントのインポート ---
# pip install "python-socketio[client]"
import socketio

class SFTPManager(QWidget):
    def __init__(self, sftp, remote_root=None, local_root=os.path.expanduser("~")):
        super().__init__()
        self.sftp = sftp
        self.local_root = local_root
        if remote_root is None:
            try:
                remote_root = self.sftp.normalize('.')
            except Exception:
                remote_root = "/home/pi"
        self.remote_root = remote_root
        self.current_local_dir = self.local_root
        self.current_remote_dir = self.remote_root
        self.setWindowTitle("SFTPマネージャ")
        layout = QVBoxLayout(self)

        # 戻るボタン
        nav_layout = QHBoxLayout()
        self.local_back_btn = QPushButton("ローカル戻る")
        self.local_back_btn.clicked.connect(self.local_back)
        self.remote_back_btn = QPushButton("リモート戻る")
        self.remote_back_btn.clicked.connect(self.remote_back)
        nav_layout.addWidget(self.local_back_btn)
        nav_layout.addWidget(self.remote_back_btn)
        layout.addLayout(nav_layout)

        # ファイルビュー
        splitter = QSplitter()
        # ローカル
        self.local_view = QTreeView()
        self.local_model = QStandardItemModel()
        self.local_model.setHorizontalHeaderLabels(["Local"])
        self.populate_local(self.local_model.invisibleRootItem(), self.current_local_dir)
        self.local_view.setModel(self.local_model)
        self.local_view.setContextMenuPolicy(Qt.CustomContextMenu)
        self.local_view.customContextMenuRequested.connect(self.local_menu)
        self.local_view.setDragEnabled(True)
        self.local_view.setAcceptDrops(True)
        self.local_view.setDragDropMode(QAbstractItemView.DragDrop)
        self.local_view.setDefaultDropAction(Qt.MoveAction)
        self.local_view.doubleClicked.connect(self.local_double_click)

        # リモート
        self.remote_view = QTreeView()
        self.remote_model = QStandardItemModel()
        self.remote_model.setHorizontalHeaderLabels(["Remote"])
        self.populate_remote(self.remote_model.invisibleRootItem(), self.current_remote_dir)
        self.remote_view.setModel(self.remote_model)
        self.remote_view.setContextMenuPolicy(Qt.CustomContextMenu)
        self.remote_view.customContextMenuRequested.connect(self.remote_menu)
        self.remote_view.setDragEnabled(True)
        self.remote_view.setAcceptDrops(True)
        self.remote_view.setDragDropMode(QAbstractItemView.DragDrop)
        self.remote_view.setDefaultDropAction(Qt.MoveAction)
        self.remote_view.doubleClicked.connect(self.remote_double_click)

        splitter.addWidget(self.local_view)
        splitter.addWidget(self.remote_view)
        layout.addWidget(splitter)
        self.setLayout(layout)

        # ドラッグ&ドロップイベント
        self.local_view.viewport().installEventFilter(self)
        self.remote_view.viewport().installEventFilter(self)

        self.sio = None  # socketioクライアント
        self.setup_socketio()

    def setup_socketio(self):
        # 例: localhost:5000 のSocket.IOサーバーに接続
        # サーバー側の実装が必要です
        try:
            self.sio = socketio.Client()
            self.sio.connect('http://localhost:5000')
            # ファイル変更イベント受信時にリスト再読み込み
            @self.sio.on('refresh_remote')
            def on_refresh_remote(data):
                self.populate_remote(self.remote_model.invisibleRootItem(), self.current_remote_dir)
            @self.sio.on('refresh_local')
            def on_refresh_local(data):
                self.populate_local(self.local_model.invisibleRootItem(), self.current_local_dir)
        except Exception as e:
            # サーバーが起動していない場合は一度だけ警告を表示し、以降はemitしない
            if not hasattr(self, "_socketio_warned"):
                print(f"Socket.IO接続エラー: {e}\nリアルタイム同期機能は無効化されます。")
                self._socketio_warned = True
            self.sio = None

    def populate_local(self, parent, path):
        parent.removeRows(0, parent.rowCount())
        try:
            for name in os.listdir(path):
                item = QStandardItem(name)
                full_path = os.path.join(path, name)
                item.setData(full_path, Qt.UserRole)
                parent.appendRow(item)
        except Exception:
            pass

    def populate_remote(self, parent, path):
        parent.removeRows(0, parent.rowCount())
        try:
            for entry in self.sftp.listdir_attr(path):
                item = QStandardItem(entry.filename)
                rpath = path + "/" + entry.filename
                item.setData(rpath, Qt.UserRole)
                parent.appendRow(item)
        except Exception:
            pass

    def local_double_click(self, index):
        path = index.data(Qt.UserRole)
        if os.path.isdir(path):
            self.current_local_dir = path
            self.populate_local(self.local_model.invisibleRootItem(), self.current_local_dir)

    def remote_double_click(self, index):
        path = index.data(Qt.UserRole)
        try:
            attr = self.sftp.stat(path)
            import stat
            if stat.S_ISDIR(attr.st_mode):
                self.current_remote_dir = path
                self.populate_remote(self.remote_model.invisibleRootItem(), self.current_remote_dir)
        except Exception:
            pass

    def local_back(self):
        parent_dir = os.path.dirname(self.current_local_dir.rstrip("/"))
        if parent_dir and os.path.exists(parent_dir):
            self.current_local_dir = parent_dir
            self.populate_local(self.local_model.invisibleRootItem(), self.current_local_dir)

    def remote_back(self):
        parent_dir = os.path.dirname(self.current_remote_dir.rstrip("/"))
        if parent_dir and parent_dir != self.current_remote_dir:
            self.current_remote_dir = parent_dir
            self.populate_remote(self.remote_model.invisibleRootItem(), self.current_remote_dir)

    def eventFilter(self, source, event):
        from PyQt5.QtWidgets import QAbstractItemView
        import stat
        if event.type() == event.Drop:
            parent_view = source.parent()
            if isinstance(parent_view, QAbstractItemView):
                index = parent_view.indexAt(event.pos())
                if parent_view is self.local_view:
                    # リモート→ローカル（ダウンロード）
                    selected = self.remote_view.selectedIndexes()
                    if index.isValid():
                        drop_dir = index.data(Qt.UserRole)
                        if not os.path.isdir(drop_dir):
                            drop_dir = os.path.dirname(drop_dir)
                    else:
                        drop_dir = self.current_local_dir
                    for idx in selected:
                        remote_path = idx.data(Qt.UserRole)
                        if not remote_path:
                            continue
                        filename = os.path.basename(remote_path)
                        local_path = os.path.join(drop_dir, filename)
                        try:
                            attr = self.sftp.stat(remote_path)
                            if stat.S_ISDIR(attr.st_mode):
                                self._download_dir_recursive(remote_path, local_path)
                            else:
                                self.sftp.get(remote_path, local_path)
                            QMessageBox.information(self, "ダウンロード", f"{filename} をダウンロードしました")
                            # --- 追加: socket.io通知 ---
                            if self.sio:
                                self.sio.emit('refresh_local', {'path': drop_dir})
                        except Exception as e:
                            QMessageBox.critical(self, "エラー", str(e))
                    return True
                elif parent_view is self.remote_view:
                    # ローカル→リモート（アップロード）
                    selected = self.local_view.selectedIndexes()
                    if index.isValid():
                        drop_dir = index.data(Qt.UserRole)
                        try:
                            attr = self.sftp.stat(drop_dir)
                            if not stat.S_ISDIR(attr.st_mode):
                                drop_dir = os.path.dirname(drop_dir)
                        except Exception:
                            drop_dir = self.current_remote_dir
                    else:
                        drop_dir = self.current_remote_dir
                    for idx in selected:
                        local_path = idx.data(Qt.UserRole)
                        if not local_path:
                            continue
                        filename = os.path.basename(local_path)
                        remote_path = drop_dir + "/" + filename
                        try:
                            if os.path.isdir(local_path):
                                self._upload_dir_recursive(local_path, remote_path)
                            else:
                                self.sftp.put(local_path, remote_path)
                            QMessageBox.information(self, "アップロード", f"{filename} をアップロードしました")
                            # --- 追加: socket.io通知 ---
                            if self.sio:
                                self.sio.emit('refresh_remote', {'path': drop_dir})
                        except Exception as e:
                            QMessageBox.critical(self, "エラー", str(e))
                    return True
        return super().eventFilter(source, event)

    def _download_dir_recursive(self, remote_dir, local_dir):
        import os
        import stat
        os.makedirs(local_dir, exist_ok=True)
        for entry in self.sftp.listdir_attr(remote_dir):
            rpath = remote_dir + "/" + entry.filename
            lpath = os.path.join(local_dir, entry.filename)
            if stat.S_ISDIR(entry.st_mode):
                self._download_dir_recursive(rpath, lpath)
            else:
                self.sftp.get(rpath, lpath)
        # --- 追加: ダウンロード後に通知 ---
        if self.sio:
            self.sio.emit('refresh_local', {'path': local_dir})

    def _upload_dir_recursive(self, local_dir, remote_dir):
        import os
        try:
            self.sftp.mkdir(remote_dir)
        except Exception:
            pass
        for item in os.listdir(local_dir):
            lpath = os.path.join(local_dir, item)
            rpath = remote_dir + "/" + item
            if os.path.isdir(lpath):
                self._upload_dir_recursive(lpath, rpath)
            else:
                self.sftp.put(lpath, rpath)
        # --- 追加: アップロード後に通知 ---
        if self.sio:
            self.sio.emit('refresh_remote', {'path': remote_dir})

    def local_menu(self, pos):
        index = self.local_view.indexAt(pos)
        menu = QMenu()
        copy_action = menu.addAction("コピー")
        delete_action = menu.addAction("削除")
        paste_action = menu.addAction("貼り付け")
        path = None
        if index.isValid():
            path = index.data(Qt.UserRole)
        action = menu.exec_(self.local_view.viewport().mapToGlobal(pos))
        if action == copy_action and path:
            self.clipboard_local_path = path
            QMessageBox.information(self, "コピー", f"{os.path.basename(path)} を貼り付け用にコピーしました")
            return
        elif action == delete_action and path:
            try:
                if os.path.isdir(path):
                    import shutil
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                QMessageBox.information(self, "削除", "削除しました")
                # --- 追加: 削除後にsocket.io通知 ---
                if self.sio:
                    self.sio.emit('refresh_local', {'path': os.path.dirname(path)})
            except Exception as e:
                QMessageBox.critical(self, "エラー", str(e))
        elif action == paste_action:
            # リモート→ローカルに貼り付け
            if hasattr(self, "clipboard_remote_path") and self.clipboard_remote_path:
                filename = os.path.basename(self.clipboard_remote_path)
                if index.isValid() and os.path.isdir(path):
                    local_dir = path
                else:
                    local_dir = self.current_local_dir
                local_path = os.path.join(local_dir, filename)
                try:
                    attr = self.sftp.stat(self.clipboard_remote_path)
                    import stat
                    if stat.S_ISDIR(attr.st_mode):
                        self._download_dir_recursive(self.clipboard_remote_path, local_path)
                    else:
                        self.sftp.get(self.clipboard_remote_path, local_path)
                    QMessageBox.information(self, "貼り付け", f"{filename} をローカルに貼り付けました")
                except Exception as e:
                    QMessageBox.critical(self, "エラー", str(e))

    def remote_menu(self, pos):
        index = self.remote_view.indexAt(pos)
        menu = QMenu()
        copy_action = menu.addAction("コピー")
        delete_action = menu.addAction("削除")
        paste_action = menu.addAction("貼り付け")
        path = None
        if index.isValid():
            path = index.data(Qt.UserRole)
        action = menu.exec_(self.remote_view.viewport().mapToGlobal(pos))
        if action == copy_action and path:
            self.clipboard_remote_path = path
            QMessageBox.information(self, "コピー", f"{os.path.basename(path)} を貼り付け用にコピーしました")
            return
        elif action == delete_action and path:
            try:
                attr = self.sftp.stat(path)
                if attr.st_mode & 0o40000:
                    self._remote_rmtree(path)
                else:
                    self.sftp.remove(path)
                QMessageBox.information(self, "削除", "削除しました")
                # --- 追加: 削除後にsocket.io通知 ---
                if self.sio:
                    self.sio.emit('refresh_remote', {'path': os.path.dirname(path)})
            except Exception as e:
                QMessageBox.critical(self, "エラー", str(e))
        elif action == paste_action:
            if hasattr(self, "clipboard_local_path") and self.clipboard_local_path:
                filename = os.path.basename(self.clipboard_local_path)
                if index.isValid():
                    try:
                        attr = self.sftp.stat(path)
                        import stat
                        if stat.S_ISDIR(attr.st_mode):
                            remote_dir = path
                        else:
                            remote_dir = os.path.dirname(path)
                    except Exception:
                        remote_dir = self.current_remote_dir
                else:
                    remote_dir = self.current_remote_dir
                remote_path = remote_dir + "/" + filename
                try:
                    if os.path.isdir(self.clipboard_local_path):
                        self._upload_dir_recursive(self.clipboard_local_path, remote_path)
                    else:
                        self.sftp.put(self.clipboard_local_path, remote_path)
                    QMessageBox.information(self, "貼り付け", f"{filename} をリモートに貼り付けました")
                except Exception as e:
                    QMessageBox.critical(self, "エラー", str(e))

    def _remote_rmtree(self, path):
        for entry in self.sftp.listdir_attr(path):
            rpath = path + "/" + entry.filename
            if entry.st_mode & 0o40000:
                self._remote_rmtree(rpath)
            else:
                self.sftp.remove(rpath)
        self.sftp.rmdir(path)

class SSHSFTPClient(QWidget):
    def __init__(self):
        super().__init__()
        self.ssh = None
        self.sftp = None
        self.shell = None
        self.clipboard_local_path = None
        self.clipboard_remote_path = None
        # --- コマンド履歴用 ---
        self.command_history = []
        self.history_index = -1
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
        # --- キーイベントフック ---
        self.ssh_input.installEventFilter(self)
        layout.addWidget(QLabel("SSH Console"))
        layout.addWidget(self.ssh_output)
        layout.addWidget(self.ssh_input)

        # SFTP操作
        sftp_btn = QPushButton("ディレクトリ")
        sftp_btn.clicked.connect(self.open_sftp_manager)
        layout.addWidget(sftp_btn)

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

    def eventFilter(self, obj, event):
        # SSH入力欄で↑↓キーで履歴参照
        from PyQt5.QtCore import QEvent
        from PyQt5.QtGui import QKeyEvent
        if obj == self.ssh_input and event.type() == QEvent.KeyPress:
            if event.key() == Qt.Key_Up:
                if self.command_history:
                    if self.history_index == -1:
                        self.history_index = len(self.command_history) - 1
                    elif self.history_index > 0:
                        self.history_index -= 1
                    self.ssh_input.setText(self.command_history[self.history_index])
                return True
            elif event.key() == Qt.Key_Down:
                if self.command_history and self.history_index != -1:
                    if self.history_index < len(self.command_history) - 1:
                        self.history_index += 1
                        self.ssh_input.setText(self.command_history[self.history_index])
                    else:
                        self.history_index = -1
                        self.ssh_input.clear()
                return True
        return super().eventFilter(obj, event)

    def send_command(self):
        if not self.shell:
            self.ssh_output.append("SSH未接続")
            return
        cmd = self.ssh_input.text()
        self.ssh_input.clear()
        # --- 履歴に追加 ---
        if cmd and (not self.command_history or self.command_history[-1] != cmd):
            self.command_history.append(cmd)
        self.history_index = -1
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

    def open_sftp_manager(self):
        if not self.sftp:
            QMessageBox.warning(self, "警告", "SFTP未接続")
            return
        try:
            remote_root = self.sftp.normalize('.')
        except Exception:
            remote_root = "/home/"
        self.sftp_manager = SFTPManager(self.sftp, remote_root=remote_root)
        self.sftp_manager.show()

# Flask+python-socketioサーバーをこのPCで自動起動する例
def start_socketio_server():
    import threading
    try:
        from flask import Flask
        import socketio as sio_server

        app = Flask(__name__)
        sio = sio_server.Server(async_mode='threading', cors_allowed_origins='*')
        app.wsgi_app = sio_server.WSGIApp(sio, app.wsgi_app)

        @sio.on('refresh_local')
        def handle_refresh_local(sid, data):
            # 必要に応じてbroadcast
            sio.emit('refresh_local', data)

        @sio.on('refresh_remote')
        def handle_refresh_remote(sid, data):
            sio.emit('refresh_remote', data)

        def run():
            app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

        thread = threading.Thread(target=run, daemon=True)
        thread.start()
    except Exception as e:
        print(f"Socket.IOサーバー起動失敗: {e}")

if __name__ == "__main__":
    start_socketio_server()  # アプリ起動時にサーバーも起動
    app = QApplication(sys.argv)
    win = SSHSFTPClient()
    win.show()
    sys.exit(app.exec_())
