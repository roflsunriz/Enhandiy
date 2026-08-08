<?php
require_once __DIR__ . '/../core/assets.php';
require_once __DIR__ . '/icons.php';

$headerInfoTitle = '';
$headerInfoDesc = '';
$headerInfoUrls = [];
if (isset($uploader_info) && is_array($uploader_info)) {
    $headerInfoTitle = trim($uploader_info['title'] ?? '');
    $headerInfoDesc = trim($uploader_info['description'] ?? '');
    if (!empty($uploader_info['urls']) && is_array($uploader_info['urls'])) {
        foreach ($uploader_info['urls'] as $headerUrlEntry) {
            if (is_array($headerUrlEntry) && !empty($headerUrlEntry['url'])) {
                $headerUrl = trim($headerUrlEntry['url']);
                $headerUrlTitle = trim($headerUrlEntry['title'] ?? '');
                $headerUrlDesc = trim($headerUrlEntry['desc'] ?? '');
            } else {
                $headerUrl = trim((string)$headerUrlEntry);
                $headerUrlTitle = '';
                $headerUrlDesc = '';
            }
            if ($headerUrl !== '') {
                $headerInfoUrls[] = ['url' => $headerUrl, 'title' => $headerUrlTitle, 'desc' => $headerUrlDesc];
            }
        }
    } elseif (!empty($uploader_info['url'])) {
        $headerInfoUrls[] = ['url' => trim($uploader_info['url']), 'title' => '', 'desc' => ''];
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
    <title><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></title>

    <!-- Bootstrap 5 -->
    <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" 
        rel="stylesheet" 
        integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" 
        crossorigin="anonymous"
    >

    <!-- Viteビルド済みCSS (Apache Alias不要: backend/public/assets 配下) -->
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('common.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('responsive.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('responsive-extra.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('file-manager-css.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('share-css.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('dragdrop.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('folders.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('password-strength-css.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('fluent.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('fluent-content.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('fluent-responsive.css'); ?>">
    <link rel="stylesheet" href="<?php echo enhandiy_asset_url('workspace.css'); ?>">

    <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
      <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
  </head>
  <body class="bg-fade app-body">
    <header class="app-topbar">
      <div class="app-topbar__inner">
        <a class="app-brand" href="/" aria-label="Enhandiy ホーム">
          <span class="app-brand__mark" aria-hidden="true">E</span>
          <span>Enhandiy</span>
        </a>
        <div class="app-topbar__identity">
          <h1 id="app-page-title"><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></h1>
          <p>
            <?php if ($headerInfoTitle !== '') : ?>
              <strong><?php echo htmlspecialchars($headerInfoTitle, ENT_QUOTES, 'UTF-8'); ?></strong>
            <?php endif; ?>
            <?php if ($headerInfoDesc !== '') : ?>
              <span><?php echo htmlspecialchars($headerInfoDesc, ENT_QUOTES, 'UTF-8'); ?></span>
            <?php elseif ($headerInfoTitle === '') : ?>
              <span>セキュア ファイル ワークスペース</span>
            <?php endif; ?>
          </p>
        </div>
        <?php if (count($headerInfoUrls) > 0) : ?>
          <nav class="app-topbar__links" aria-label="関連リンク">
            <?php foreach ($headerInfoUrls as $headerLink) : ?>
                <?php
                $headerLinkText = $headerLink['title'] !== ''
                    ? $headerLink['title']
                    : $headerLink['url'];
                ?>
              <a href="<?php echo htmlspecialchars($headerLink['url'], ENT_QUOTES, 'UTF-8'); ?>"
                 target="_blank" rel="noopener noreferrer"
                 <?php if ($headerLink['desc'] !== '') : ?>
                   title="<?php echo htmlspecialchars($headerLink['desc'], ENT_QUOTES, 'UTF-8'); ?>"
                 <?php endif; ?>>
                <?php echo render_icon('link', 15, 'icon'); ?>
                <span><?php echo htmlspecialchars($headerLinkText, ENT_QUOTES, 'UTF-8'); ?></span>
              </a>
            <?php endforeach; ?>
          </nav>
        <?php endif; ?>
      </div>
    </header>
