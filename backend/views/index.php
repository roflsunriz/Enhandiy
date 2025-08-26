<?php

/**
 * メインビューテンプレート - リファクタリング版
 * 分離された部分テンプレートを統合したビュー
 *
 * 部分テンプレート構成:
 * - status-messages.php: ステータスメッセージ表示
 * - upload-form.php: アップロードフォーム
 * - error-display.php: エラー表示
 * - folder-navigation.php: フォルダナビゲーション
 * - file-manager.php: ファイルマネージャー
 * - modals.php: モーダルダイアログ
 * - page-scripts.php: JavaScript部分
 */

?>

<div class="container">
  <!-- ステータスメッセージ部分 -->
  <?php include __DIR__ . '/status-messages.php'; ?>

  <!-- アップロード起動ボタン（モーダル） -->
  <div class="row">
    <div class="col-sm-12 text-center my-15">
      <?php
        // config.php で設定可能なアップローダ説明（タイトル/説明/URL）。空の場合は非表示。
        if (isset($uploader_info) && is_array($uploader_info)) {
            $infoTitle = trim($uploader_info['title'] ?? '');
            $infoDesc = trim($uploader_info['description'] ?? '');
            $infoUrl  = trim($uploader_info['url'] ?? '');
            if ($infoTitle !== '' || $infoDesc !== '' || $infoUrl !== '') {
                echo '<div class="alert alert-info text-start" role="alert" '
                   . 'style="max-width:860px;margin:0 auto 15px;">';
                if ($infoTitle !== '') {
                    $safeTitle = htmlspecialchars($infoTitle, ENT_QUOTES, 'UTF-8');
                    echo '<h4 class="alert-heading" style="margin-top:0;">'
                        . $safeTitle
                        . '</h4>';
                }
                if ($infoDesc !== '') {
                    $safeDesc = htmlspecialchars($infoDesc, ENT_QUOTES, 'UTF-8');
                    echo '<p style="margin-bottom:8px;">' . nl2br($safeDesc) . '</p>';
                }
                if ($infoUrl !== '') {
                    $safeUrl = htmlspecialchars($infoUrl, ENT_QUOTES, 'UTF-8');
                    echo '<p style="margin:0;">'
                        . '<a href="' . $safeUrl . '" target="_blank" rel="noopener noreferrer">'
                        . $safeUrl
                        . '</a>'
                        . '</p>';
                }
                echo '</div>';
            }
        }
        ?>
      <?php require_once __DIR__ . '/icons.php'; ?>
      <button type="button" class="btn btn-success btn-lg" data-bs-toggle="modal" data-bs-target="#uploadModal">
        <?php echo render_icon('folder', 18, 'icon'); ?> ファイルをアップロード
      </button>
    </div>
  </div>

  <!-- エラー表示部分 -->
  <?php include __DIR__ . '/error-display.php'; ?>

  <!-- フォルダナビゲーション部分 -->
  <?php include __DIR__ . '/folder-navigation.php'; ?>

  <!-- ファイルマネージャー部分 -->
  <?php include __DIR__ . '/file-manager.php'; ?>

  <!-- フッター情報 -->
  <div class="row">
    <div class="col-sm-12">
      <p class="text-right">@<a href="https://github.com/roflsunriz/phpUploader" target="_blank">
        roflsunriz/phpUploader</a> v<?php echo $version ?? '4.3.3'; ?> -
        コミュニティフォーク - 機能強化版 (GitHub)</p>
    </div>
  </div>
</div>

<!-- モーダルダイアログ部分 -->
<?php include __DIR__ . '/modals.php'; ?>

<!-- JavaScript部分 -->
<?php include __DIR__ . '/page-scripts.php'; ?>