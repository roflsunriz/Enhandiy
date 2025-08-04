<?php

/**
 * モーダルダイアログ部分テンプレート
 * ファイル編集、差し替えなどのモーダルを担当
 */

?>


<!-- ファイル編集モーダル -->
<div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="editModalLabel">ファイル編集</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <!-- タブナビゲーション -->
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="comment-tab" data-bs-toggle="tab"
                    data-bs-target="#commentTab" type="button" role="tab"
                    aria-controls="commentTab" aria-selected="true">コメント編集</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="replace-tab" data-bs-toggle="tab"
                    data-bs-target="#replaceTab" type="button" role="tab"
                    aria-controls="replaceTab" aria-selected="false">ファイル差し替え</button>
          </li>
        </ul>
        
        <!-- タブコンテント -->
        <div class="tab-content" style="margin-top: 15px;">
          <!-- コメント編集タブ -->
          <div role="tabpanel" class="tab-pane active" id="commentTab">
            <form id="editCommentForm">
              <div class="form-group">
                <label for="editFileName">ファイル名</label>
                <input type="text" class="form-control" id="editFileName" readonly>
              </div>
              <div class="form-group">
                <label for="editComment">コメント</label>
                <input type="text" class="form-control" id="editComment" placeholder="コメントを入力...">
                <p class="help-block"><?php echo isset($max_comment) ? $max_comment : 80; ?>字まで入力できます。</p>
              </div>
              <input type="hidden" id="editFileId">
            </form>
          </div>
          
          <!-- ファイル差し替えタブ -->
          <div role="tabpanel" class="tab-pane" id="replaceTab">
            <form id="replaceFileForm" enctype="multipart/form-data">
              <div class="form-group">
                <label for="replaceFileName">現在のファイル名</label>
                <input type="text" class="form-control" id="replaceFileName" readonly>
              </div>
              <div class="form-group">
                <label for="replaceFileInput">新しいファイル</label>
                <input type="file" class="form-control" id="replaceFileInput" name="file" required>
                <p class="help-block">
                  <?php echo isset($max_file_size) ? $max_file_size : 100; ?>MBまでのファイルがアップロードできます。<br>
                  対応拡張子： <?php
                    if (isset($extension) && is_array($extension)) {
                        foreach ($extension as $ext) {
                            echo $ext . ' ';
                        }
                    } else {
                        echo 'zip pdf jpg png';
                    }
                    ?>
                </p>
              </div>
              <div class="form-group">
                <label for="modalReplaceKeyInput">差し替えキー</label>
                <input type="password" class="form-control" id="modalReplaceKeyInput"
                       name="replacekey" placeholder="差し替えキーを入力してください" required>
                <p class="help-block">アップロード時に設定した差し替えキーを入力してください。</p>
              </div>
              <input type="hidden" id="replaceFileId">
              <div class="alert alert-warning">
                <span class="glyphicon glyphicon-warning-sign"></span>
                <strong>注意:</strong> ファイルを差し替えると、元のファイルは削除されます。この操作は取り消せません。
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
        <button type="button" class="btn btn-primary" id="saveCommentBtn" style="display: none;">コメント保存</button>
        <button type="button" class="btn btn-warning" id="replaceFileBtn" style="display: none;">ファイル差し替え</button>
      </div>
    </div>
  </div>
</div>

<!-- 汎用アラートモーダル -->
<div class="modal fade" id="alertModal" tabindex="-1" aria-labelledby="alertModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="alertModalLabel">お知らせ</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="alertModalMessage"></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
      </div>
    </div>
  </div>
</div>

<!-- 汎用確認モーダル -->
<div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="confirmModalLabel">確認</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="confirmModalMessage"></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="confirmModalCancel">キャンセル</button>
        <button type="button" class="btn btn-primary" id="confirmModalOk">OK</button>
      </div>
    </div>
  </div>
</div>

<!-- 汎用入力モーダル -->
<div class="modal fade" id="promptModal" tabindex="-1" aria-labelledby="promptModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="promptModalLabel">入力</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="promptModalMessage"></p>
        <input type="text" class="form-control" id="promptModalInput" placeholder="">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="promptModalCancel">キャンセル</button>
        <button type="button" class="btn btn-primary" id="promptModalOk">OK</button>
      </div>
    </div>
  </div>
</div>

<!-- パスワード入力モーダル -->
<div class="modal fade" id="passwordModal" tabindex="-1" aria-labelledby="passwordModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="passwordModalLabel">パスワード入力</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="passwordModalMessage"></p>
        <input type="password" class="form-control" id="passwordModalInput" placeholder="パスワードを入力してください">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="passwordModalCancel">キャンセル</button>
        <button type="button" class="btn btn-primary" id="passwordModalOk">OK</button>
      </div>
    </div>
  </div>
</div>

<!-- 共有リンクモーダル -->
<div class="modal fade" id="shareLinkModal" tabindex="-1" aria-labelledby="shareLinkModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="shareLinkModalLabel">共有リンク生成</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <!-- ファイル情報 -->
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label for="shareFileName">ファイル名</label>
              <input type="text" class="form-control" id="shareFileName" readonly>
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group">
              <label for="shareFileComment">コメント</label>
              <input type="text" class="form-control" id="shareFileComment" readonly>
            </div>
          </div>
        </div>

        <!-- 共有設定パネル -->
        <div class="panel panel-default">
          <div class="panel-heading">
            <h5 class="panel-title">共有設定</h5>
          </div>
          <div class="panel-body">
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="shareMaxDownloads">最大ダウンロード数</label>
                  <input type="number" class="form-control" id="shareMaxDownloads"
                         min="1" max="1000" placeholder="制限なし">
                  <p class="help-block">指定した回数ダウンロードされると、リンクが無効になります。</p>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label for="shareExpiresDays">有効期限（日数）</label>
                  <input type="number" class="form-control" id="shareExpiresDays"
                         min="1" max="365" placeholder="制限なし">
                  <p class="help-block">指定した日数後にリンクが無効になります。</p>
                </div>
              </div>
            </div>
            <div class="form-group">
              <button type="button" class="btn btn-primary" id="generateShareLinkBtn">
                <span class="glyphicon glyphicon-link"></span> 共有リンクを生成
              </button>
              <button type="button" class="btn btn-default" id="regenerateShareLinkBtn" style="display: none;">
                <span class="glyphicon glyphicon-refresh"></span> 再生成
              </button>
            </div>
          </div>
        </div>

        <!-- 生成された共有リンク -->
        <div id="shareResultPanel" style="display: none;">
          <!-- 共有形式選択 -->
          <div class="form-group">
            <label>共有形式を選択</label>
            <div class="radio">
              <label>
                <input type="radio" name="shareFormat" value="url_only" checked>
                URLのみ
              </label>
            </div>
            <div class="radio">
              <label>
                <input type="radio" name="shareFormat" value="url_with_comment">
                コメント + URL
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="shareUrl">共有内容</label>
            <div class="input-group">
              <textarea class="form-control" id="shareUrl" rows="3" readonly></textarea>
              <span class="input-group-btn" style="vertical-align: top;">
                <button class="btn btn-success" type="button" id="copyShareUrlBtn"
                        title="クリップボードにコピー" style="height: 80px;">
                  <span class="glyphicon glyphicon-copy"></span><br>
                  コピー
                </button>
              </span>
            </div>
            <p class="help-block">このリンクを使って誰でもファイルをダウンロードできます。</p>
          </div>
          
          <!-- 現在の設定情報 -->
          <div class="alert alert-info">
            <h5><strong>📊 現在の設定</strong></h5>
            <ul class="list-unstyled">
              <li id="currentMaxDownloads"><strong>最大ダウンロード数:</strong> 制限なし</li>
              <li id="currentExpiresDays"><strong>有効期限:</strong> 制限なし</li>
            </ul>
          </div>
          
          <div class="alert alert-success">
            <strong>📋 クリップボードにコピーされました！</strong><br>
            このリンクを共有したい相手に送信してください。
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" id="saveShareSettingsBtn">設定を保存</button>
        <button type="button" class="btn btn-default" data-bs-dismiss="modal">閉じる</button>
      </div>
    </div>
  </div>
</div>