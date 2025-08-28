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

            // 複数URL対応: 各要素は文字列または ['url'=>'...', 'title'=>'...'] を許容
            // 従来の 'url' も互換でサポート
            $infoUrls = [];
            if (!empty($uploader_info['urls']) && is_array($uploader_info['urls'])) {
                foreach ($uploader_info['urls'] as $u) {
                    if (is_array($u) && !empty($u['url'])) {
                        $uUrl = trim($u['url']);
                        $uTitle = trim($u['title'] ?? '');
                        $uDesc = trim($u['desc'] ?? '');
                    } else {
                        $uUrl = trim((string)$u);
                        $uTitle = '';
                        $uDesc = '';
                    }
                    if ($uUrl !== '') {
                        $infoUrls[] = ['url' => $uUrl, 'title' => $uTitle, 'desc' => $uDesc];
                    }
                }
            } elseif (!empty($uploader_info['url'])) {
                $infoUrls[] = ['url' => trim($uploader_info['url']), 'title' => '', 'desc' => ''];
            }

            if ($infoTitle !== '' || $infoDesc !== '' || count($infoUrls) > 0) {
                echo '<div class="alert alert-info text-start" role="alert">';
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
                if (count($infoUrls) > 0) {
                    echo '<div style="margin:0;">';
                    foreach ($infoUrls as $entry) {
                        $url = $entry['url'] ?? '';
                        $title = $entry['title'] ?? '';
                        $desc = $entry['desc'] ?? '';
                        $safeUrl = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
                        $linkText = ($title !== '') ? htmlspecialchars($title, ENT_QUOTES, 'UTF-8') : $safeUrl;
                        echo '<div style="display:inline-block;margin-right:16px;vertical-align:top;">'
                            . '<a href="' . $safeUrl . '" target="_blank" rel="noopener noreferrer">'
                            . $linkText
                            . '</a>';
                        if ($desc !== '') {
                            $safeDesc = nl2br(htmlspecialchars($desc, ENT_QUOTES, 'UTF-8'));
                            echo '<div class="small text-muted" style="margin-top:4px;">' . $safeDesc . '</div>';
                        }
                        echo '</div>';
                    }
                    echo '</div>';
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
        roflsunriz/phpUploader</a> v<?php echo $version ?? '4.3.6'; ?> -
        コミュニティフォーク - 機能強化版 (GitHub)</p>
    </div>
  </div>
</div>

<!-- モーダルダイアログ部分 -->
<?php include __DIR__ . '/modals.php'; ?>

<!-- JavaScript部分 -->
<?php include __DIR__ . '/page-scripts.php'; ?>