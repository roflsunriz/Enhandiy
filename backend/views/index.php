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

require_once __DIR__ . '/icons.php';
?>

<main class="container app-shell">
  <!-- ステータスメッセージ部分 -->
  <?php include __DIR__ . '/status-messages.php'; ?>

  <!-- エラー表示部分 -->
  <?php include __DIR__ . '/error-display.php'; ?>

  <section class="app-surface app-workspace" aria-label="ファイルとフォルダ">
    <?php include __DIR__ . '/folder-navigation.php'; ?>
    <?php include __DIR__ . '/file-manager.php'; ?>
    <div class="app-workspace__drop-overlay" aria-hidden="true">
      <?php echo render_icon('folder', 34, 'icon'); ?>
      <strong>ここにドロップしてアップロード</strong>
      <span>ファイルを選択したあと、アップロード設定を確認できます</span>
    </div>
  </section>

  <!-- フッター情報 -->
  <footer class="app-footer">
    <p>Enhandiy v<?php echo htmlspecialchars($version ?? '4.4.1', ENT_QUOTES, 'UTF-8'); ?></p>
    <p><a href="https://github.com/roflsunriz/Enhandiy" target="_blank" rel="noopener noreferrer">
      GitHubでプロジェクトを見る</a></p>
  </footer>
</main>

<!-- モーダルダイアログ部分 -->
<?php include __DIR__ . '/modals.php'; ?>

<!-- JavaScript部分 -->
<?php include __DIR__ . '/page-scripts.php'; ?>
