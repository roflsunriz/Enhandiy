<?php

/**
 * フォルダナビゲーション部分テンプレート
 * フォルダ一覧表示と管理機能を担当
 */

?>

<?php require_once __DIR__ . '/icons.php'; ?>
<header class="app-workspace__navigation">
  <div class="app-workspace__location">
    <?php if (isset($folders_enabled) && $folders_enabled) : ?>
      <div class="folder-breadcrumb">
        <span class="folder-breadcrumb__label"><?php echo render_icon('map-marker', 18, 'icon'); ?> 現在の場所</span>
        <ol class="breadcrumb folder-breadcrumb-list">
          <?php
            // ルートリンクはクエリを空にしない（余分な `?folder=` を残さない）
            $requestUri = $_SERVER['REQUEST_URI'];
            $path = parse_url($requestUri, PHP_URL_PATH);
            $fragment = parse_url($requestUri, PHP_URL_FRAGMENT);
            $rootUrl = $path;
            if ($fragment !== null && $fragment !== '') {
                $rootUrl .= '#' . $fragment;
            }
            ?>
          <li>
            <a href="<?php echo htmlspecialchars($rootUrl, ENT_QUOTES, 'UTF-8'); ?>" class="breadcrumb-link">
              <?php echo render_icon('home', 18, 'icon'); ?> ルート
            </a>
          </li>
          <?php if (isset($breadcrumb) && is_array($breadcrumb)) : ?>
                <?php foreach ($breadcrumb as $index => $bc) : ?>
                    <?php if ($index + 1 === count($breadcrumb)) : ?>
                        <li class="active"><?php echo htmlspecialchars($bc['name']); ?></li>
                    <?php else : ?>
                        <li>
                            <a href="?folder=<?php echo $bc['id']; ?>" class="breadcrumb-link">
                                <?php echo htmlspecialchars($bc['name']); ?>
                            </a>
                        </li>
                    <?php endif; ?>
                <?php endforeach; ?>
          <?php endif; ?>
        </ol>
      </div>
    <?php else : ?>
      <span class="app-workspace__all-files"><?php echo render_icon('folder', 18, 'icon'); ?> すべてのファイル</span>
    <?php endif; ?>
  </div>
  <div class="app-workspace__primary-actions">
    <?php if (isset($folders_enabled) && $folders_enabled) : ?>
      <button type="button" class="btn btn-secondary btn-sm" id="create-folder-btn" title="現在の場所に新しいフォルダを作成">
        <span aria-hidden="true">＋</span> 新しいフォルダ
      </button>
    <?php endif; ?>
    <button type="button" class="btn btn-primary btn-sm app-upload-trigger"
            data-bs-toggle="modal" data-bs-target="#uploadModal">
      <?php echo render_icon('folder', 17, 'icon'); ?> アップロード
    </button>
  </div>
</header>
