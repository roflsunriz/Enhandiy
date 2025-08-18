<?php

/**
 * アップロードフォーム部分テンプレート
 * ドラッグ&ドロップ、ファイル選択、設定項目を担当
 */

?>
<?php $render_as_modal_body = isset($render_as_modal_body) ? (bool)$render_as_modal_body : false; ?>

<?php if (!$render_as_modal_body) : ?>
<div class="row bg-white radius box-shadow">
  <div class="col-sm-12">
    <div class="page-header">
      <h1><?php echo $title; ?> <small>ファイルアップロード</small></h1>
    </div>
<?php endif; ?>
    <form id="upload" class="upload-form">
      <input type="hidden" id="csrfToken" name="csrf_token" 
             value="<?php echo htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8'); ?>">

      <!-- ドラッグ&ドロップエリア -->
      <div id="dragDropArea" class="drag-drop-area">
        <div class="drag-drop-content">
          <div class="drag-drop-icon">
            <span class="glyphicon glyphicon-cloud-upload"></span>
          </div>
          <h4>ファイルをドラッグ&ドロップ</h4>
          <p class="text-muted">複数ファイルやフォルダにも対応しています</p>
          <p>または</p>
          <button type="button" class="btn btn-primary" id="selectFilesBtn">ファイルを選択</button>
          <button type="button" class="btn btn-info" id="selectFolderBtn">フォルダを選択</button>
        </div>
        <div class="drag-drop-overlay">
          <div class="drag-drop-overlay-content">
            <span class="glyphicon glyphicon-download-alt"></span>
            <p>ここにファイルをドロップ</p>
          </div>
        </div>
      </div>

      <!-- ファイル入力要素 -->
      <input id="multipleFileInput" type="file" multiple style="display:none">
      <input id="folderInput" type="file" webkitdirectory multiple style="display:none">

      <!-- 選択ファイル表示 -->
      <div id="selectedFilesContainer" class="selected-files-container" style="display: none;">
        <h5>選択されたファイル:</h5>
        <div id="selectedFilesList" class="selected-files-list"></div>
        <button type="button" class="btn btn-sm btn-default" id="clearFilesBtn">クリア</button>
      </div>

      <!-- アップロード制限情報 -->
      <div class="form-section">
        <p class="help-block">
          <strong>最大サイズ:</strong> <?php echo $max_file_size ?? 100; ?>MBまでアップロード可能<br>
          <?php
            $policy = $upload_extension_policy ?? null;
            $mode = is_array($policy) && isset($policy['mode']) ? $policy['mode'] : 'all';
            $wl = (is_array($policy) && isset($policy['whitelist']) && is_array($policy['whitelist']))
                ? $policy['whitelist']
                : [];
            $bl = (is_array($policy) && isset($policy['blacklist']) && is_array($policy['blacklist']))
                ? $policy['blacklist']
                : [];
            // 後方互換: 旧extensionをwhitelistに統合表示
            if (empty($wl) && isset($extension) && is_array($extension)) {
                $wl = $extension;
            }

            if ($mode === 'whitelist') {
                echo '<strong>対応拡張子:</strong> ' . htmlspecialchars(implode(', ', $wl), ENT_QUOTES, 'UTF-8');
            } elseif ($mode === 'blacklist') {
                echo '<strong>禁止拡張子:</strong> '
                    . htmlspecialchars(implode(', ', $bl), ENT_QUOTES, 'UTF-8')
                    . '（上記以外はアップロード可能）';
            } else { // all
                echo '<strong>対応拡張子:</strong> すべて（全拡張子を許可）';
            }
            ?>
        </p>
      </div>

      <!-- 上段: コメント・フォルダ -->
      <div class="form-section">
        <div class="row align-items-start">
          <div class="col-sm-6">
            <div class="form-group">
              <label for="commentInput">コメント <small class="text-muted">(任意)</small></label>
              <input type="text" class="form-control" id="commentInput" name="comment" placeholder="コメントを入力...">
              <p class="help-block"><?php echo $max_comment ?? 80; ?>文字以内で入力</p>
            </div>
          </div>
          <?php if (isset($folders_enabled) && $folders_enabled) : ?>
          <div class="col-sm-6">
            <div class="form-group">
              <label for="folder-select">保存先フォルダ</label>
              <select class="form-control" id="folder-select" name="folder_id">
                <option value="">ルートフォルダ</option>
                <!-- フォルダ一覧はJavaScriptで動的に生成 -->
              </select>
              <p class="help-block">ファイルを保存するフォルダを選択してください</p>
            </div>
          </div>
          <?php else : ?>
          <div class="col-sm-6"></div>
          <?php endif; ?>
        </div>
      </div>

      <!-- 下段: DLキー・削除キー -->
      <div class="form-section">
        <div class="row align-items-start">
          <div class="col-sm-6">
            <div class="form-group">
              <label for="dlkeyInput">
                DLキー
                <?php if (isset($dlkey_required) && $dlkey_required) : ?>
                  <span class="text-danger">*必須</span>
                <?php else : ?>
                  <small class="text-muted">(任意)</small>
                <?php endif; ?>
              </label>
              <input type="text" class="form-control" id="dlkeyInput" name="dlkey"
                     placeholder="<?php echo (isset($dlkey_required) && $dlkey_required) ?
                                    'DLキーを入力してください (8文字以上推奨)' :
                                    'DLキーを入力... (空白時は認証不要)'; ?>"
                     <?php echo (isset($dlkey_required) && $dlkey_required) ? 'required' : ''; ?>>
              <p class="help-block">ファイルダウンロード時に必要なキーです</p>
              <div class="password-strength" id="dlkey-strength" style="visibility: hidden;">
                <div class="strength-bar">
                  <div class="strength-level" id="dlkey-strength-level"></div>
                </div>
                <span class="strength-text" id="dlkey-strength-text"></span>
              </div>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="form-group">
              <label for="delkeyInput">
                削除キー <span class="text-danger">*必須</span>
              </label>
              <input type="text" class="form-control" id="delkeyInput" name="delkey"
                     placeholder="削除キーを入力してください (8文字以上推奨)" required>
              <p class="help-block">ファイル削除時に必要なキーです（必須項目）</p>
              <div class="password-strength" id="delkey-strength" style="visibility: hidden;">
                <div class="strength-bar">
                  <div class="strength-level" id="delkey-strength-level"></div>
                </div>
                <span class="strength-text" id="delkey-strength-text"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <?php
        ?>
      <?php if (isset($allow_file_replace) && $allow_file_replace) : ?>
      <!-- 差し替えキー -->
      <div class="form-section">
        <div class="form-group">
          <label for="replacekeyInput">差し替えキー <span class="text-danger">*必須</span></label>
          <input type="text" class="form-control" id="replaceKeyInput" name="replacekey" 
                 placeholder="差し替えキーを入力してください" required>
          <p class="help-block">ファイル差し替え時とコメント編集時に必要なキーです（必須項目）</p>
          <div class="password-strength" id="replacekey-strength" style="visibility: hidden;">
            <div class="strength-bar">
              <div class="strength-level" id="replacekey-strength-level"></div>
            </div>
            <span class="strength-text" id="replacekey-strength-text"></span>
          </div>
        </div>
      </div>
      <?php else : ?>
      <!-- デバッグ用: 差し替えキーが無効の場合の代替表示 -->
      <div class="form-section">
        <div class="form-group">
          <label for="replacekeyInput">差し替えキー <span class="text-danger">*必須</span></label>
          <input type="text" class="form-control" id="replaceKeyInput" name="replacekey" 
                 placeholder="差し替えキーを入力してください" required>
          <p class="help-block">ファイル差し替え時に必要なキーです（必須項目）</p>
          <div class="password-strength" id="replacekey-strength" style="visibility: hidden;">
            <div class="strength-bar">
              <div class="strength-level" id="replacekey-strength-level"></div>
            </div>
            <span class="strength-text" id="replacekey-strength-text"></span>
          </div>
        </div>
      </div>
      <?php endif; ?>

      <!-- プログレスバーエリア -->
      <div id="progressContainer" style="display: none;" class="form-section">
        <h5>アップロード進行状況</h5>
        <div class="progress">
          <div id="progressBar" class="progress-bar progress-bar-info progress-bar-striped active" 
               role="progressbar" style="width: 0%">
            <span id="progressText">0%</span>
          </div>
        </div>
        <div id="uploadStatus" class="text-muted"></div>
      </div>

      <div class="form-section text-right">
        <button type="button" class="btn btn-default btn-lg" id="cancelBtn" style="display: none;">キャンセル</button>
      </div>
    </form>

    <?php if (!$render_as_modal_body) : ?>
    <!-- 右下固定のアップロードボタン（通常ページ時のみ） -->
    <div class="upload-button-fixed">
      <input type="submit" form="upload" class="btn btn-success btn-lg btn-upload" value="📁 ファイルをアップロード" id="uploadBtn">
    </div>
    <?php endif; ?>
<?php if (!$render_as_modal_body) : ?>
  </div>
</div>
<?php endif; ?>