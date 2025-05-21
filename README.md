# raspi-ez

## よくあるエラーと対処

### `Could not resolve entry module "index.html".`

- `index.html` がプロジェクトのルートまたは `vite.config.ts` の `root` で指定したディレクトリに存在しない場合に発生します。
- 通常は `/Users/motonobunakao/raspi-ez/index.html` が必要です。

#### 対処方法

- `index.html` 内の  
  `<script type="module" src="/src/main.tsx"></script>`  
  のパスが正しいか確認してください。

- `src/main.tsx` ファイルが存在しない場合は作成してください。

  例:

  ```
  /Users/motonobunakao/raspi-ez/src/main.tsx
  ```

- ファイル名やディレクトリ名の大文字・小文字も一致しているか確認してください。

### `Error: Cannot find module 'ssh2'`

- `ssh2` モジュールがインストールされていない場合に発生します。

#### 対処方法

1. プロジェクトルートで以下を実行してください。

   ```
   yarn add ssh2
   ```

2. 他にも `node-pty` や `ssh2-sftp-client` など必要な依存も同様にインストールしてください。

   ```
   yarn add node-pty ssh2-sftp-client
   ```

---

## Electron デスクトップアプリケーションとしての起動方法

1. 依存パッケージをインストール

   ```
   yarn install
   ```

2. 開発モードで起動（Vite + Electron）

   ```
   yarn dev
   ```

   - Vite の開発サーバーと Electron が同時に起動します。

3. 本番ビルドして起動

   ```
   yarn build
   ```

   - `dist/`にビルドされ、electron-builder でパッケージングされます。

---

`package.json`の`scripts`に`dev`や`build`が設定されていることを確認してください。

# トラブルシューティング: 画面が何も表示されない場合

1. **dist/assets/index-xxxx.js が存在するか確認**

   - `/Users/motonobunakao/raspi-ez/dist/assets/` に `index-xxxx.js` というファイルが**ない場合**は、Vite のビルドが正しく完了していません。
   - 下記コマンドをプロジェクトルートで実行して、再度ビルドしてください。

     ```
     yarn build
     ```

   - ビルド後、`dist/assets/` フォルダに `index-xxxx.js` などのファイルが生成されているか確認してください。
   - それでも生成されない場合は、Vite のエラー内容を確認し、必要な依存や設定ファイル（vite.config.ts, index.html など）を見直してください。

2. **dist/index.html の `<script src="...">` のパスが正しいか確認**

   - `<script type="module" crossorigin src="/assets/index-xxxx.js"></script>` となっている場合、  
     ファイルパス `/Users/motonobunakao/raspi-ez/dist/assets/index-xxxx.js` が存在する必要があります。

3. **Electron ウィンドウの DevTools でエラーを確認**

   - Electron アプリのウィンドウで `Cmd+Opt+I` (Mac) で DevTools を開き、Console タブにエラーが出ていないか確認してください。
   - 例: `Uncaught ReferenceError` や `Failed to load resource` など

4. **main.js の loadFile パスを再確認**

   - `/electron/main.js` の `win.loadFile(path.join(__dirname, "../index.html"));` となっているか確認してください。
   - dist 配下ではなく、プロジェクト直下の `index.html` を開く必要があります。

5. **preload.js loaded のみ表示される場合**
   - これは preload.js が正しく動作しているサインです。
   - それ以降の React アプリのログ（例: `main.tsx loaded`）が出ていなければ、JS ファイルの読み込みに失敗しています。

---

### それでも解決しない場合

- `dist/index.html` の `<script src="...">` のパスと、`dist/assets/` のファイル名が一致しているか再度確認してください。
- DevTools の Console タブに表示されているエラー内容を貼り付けてください。

---

## ビルドが一瞬で終わり、`dist/assets/` に JS ファイルが生成されない場合

- Vite の出力ログに「1 modules transformed.」と表示されている場合、**React やアプリのエントリーポイントがビルド対象になっていません**。
- これは `index.html` の `<script type="module" src="/src/main.tsx"></script>` がコメントアウトされている、または存在しない場合に発生します。

### 対処方法

1. **開発用（`yarn dev`）の場合のみ**、`index.html` に以下の script タグを追加してください。

   ```html
   <script type="module" src="/src/main.tsx"></script>
   ```

2. **本番ビルド時はこの script タグは不要**ですが、Vite がエントリーポイントを認識できるように、  
   `index.html` から `src/main.tsx` を参照する script タグが一時的に必要です。

3. `yarn build` を実行し、`dist/assets/` に `index-xxxx.js` が生成されるか確認してください。

4. ビルド後は、`dist/index.html` からこの script タグは自動で除去されます。

---

- それでも解決しない場合は、`index.html` の `<script type="module" src="/src/main.tsx"></script>` の有無と、`vite.config.ts` の設定を再度確認してください。
- 必要に応じて、`index.html` の該当部分を一時的にアンコメントしてビルドしてください。

---
