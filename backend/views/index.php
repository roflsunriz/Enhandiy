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

<main class="container app-shell">
  <!-- ステータスメッセージ部分 -->
  <?php include __DIR__ . '/status-messages.php'; ?>

  <section class="app-hero" aria-labelledby="app-page-title">
    <div class="app-hero__content">
      <span class="app-hero__eyebrow">ファイル ワークスペース</span>
      <h1 id="app-page-title"><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></h1>
      <p>ファイルのアップロード、整理、共有を、ひとつの軽やかなワークスペースで。</p>
    </div>
    <div class="app-hero__actions">
      <?php require_once __DIR__ . '/icons.php'; ?>
      <button type="button" class="btn btn-lg app-upload-trigger" data-bs-toggle="modal" data-bs-target="#uploadModal">
        <?php echo render_icon('folder', 18, 'icon'); ?> ファイルをアップロード
      </button>
    </div>
  </section>

  <!-- アップローダーからのお知らせ -->
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
                echo '<aside class="app-announcement" role="note">';
                if ($infoTitle !== '') {
                    $safeTitle = htmlspecialchars($infoTitle, ENT_QUOTES, 'UTF-8');
                    echo '<h2>'
                        . $safeTitle
                        . '</h2>';
                }
                if ($infoDesc !== '') {
                    $safeDesc = htmlspecialchars($infoDesc, ENT_QUOTES, 'UTF-8');
                    echo '<p>' . nl2br($safeDesc) . '</p>';
                }
                if (count($infoUrls) > 0) {
                    echo '<div class="app-announcement__links">';
                    foreach ($infoUrls as $entry) {
                        $url = $entry['url'] ?? '';
                        $title = $entry['title'] ?? '';
                        $desc = $entry['desc'] ?? '';
                        $safeUrl = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
                        $linkText = ($title !== '') ? htmlspecialchars($title, ENT_QUOTES, 'UTF-8') : $safeUrl;
                        echo '<a class="app-announcement__link" href="' . $safeUrl
                            . '" target="_blank" rel="noopener noreferrer">'
                            . '<span>' . $linkText . '</span>';
                        if ($desc !== '') {
                            $safeDesc = nl2br(htmlspecialchars($desc, ENT_QUOTES, 'UTF-8'));
                            echo '<small>' . $safeDesc . '</small>';
                        }
                        echo '</a>';
                    }
                    echo '</div>';
                }
                echo '</aside>';
            }
        }
        ?>

  <!-- エラー表示部分 -->
  <?php include __DIR__ . '/error-display.php'; ?>

  <!-- フォルダナビゲーション部分 -->
  <?php include __DIR__ . '/folder-navigation.php'; ?>

  <!-- ファイルマネージャー部分 -->
  <?php include __DIR__ . '/file-manager.php'; ?>

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
