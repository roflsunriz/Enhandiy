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

  <!-- アップロードフォーム部分 -->
  <?php include __DIR__ . '/upload-form.php'; ?>

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
        roflsunriz/phpUploader</a> v<?php echo $version ?? '3.0.0-roflsunriz'; ?> -
        コミュニティフォーク - 機能強化版 (GitHub)</p>
    </div>
  </div>
</div>

<!-- モーダルダイアログ部分 -->
<?php include __DIR__ . '/modals.php'; ?>

<!-- JavaScript部分 -->
<?php include __DIR__ . '/page-scripts.php'; ?>