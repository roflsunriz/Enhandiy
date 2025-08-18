<?php

/**
 * フォルダナビゲーション部分テンプレート
 * フォルダ一覧表示と管理機能を担当
 */

?>

<?php if (isset($folders_enabled) && $folders_enabled) : ?>
<!-- フォルダナビゲーション -->
<div class="row bg-white radius box-shadow">
  <div class="col-sm-12">
    <!-- タイトルは省略し、パンくずと一覧を優先表示 -->

    <!-- パンくずリスト -->
    <div class="form-section">
      <div class="folder-breadcrumb">
        <label>📍 現在の場所:</label>
        <ol class="breadcrumb folder-breadcrumb-list">
          <li><a href="?folder=" class="breadcrumb-link">🏠 ルート</a></li>
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
    </div>

    <!-- フォルダ一覧 -->
    <div class="form-section">
        <div class="folder-actions">
          <!-- フォルダ作成ボタンを画面右端に -->
          <div class="push-right">
            <button type="button" class="btn btn-success btn-sm" id="create-folder-btn" title="新しいフォルダを作成">
              <span class="glyphicon glyphicon-plus"></span> フォルダ作成
            </button>
          </div>
        </div>

    <?php if (!empty($folders)) : ?>
    <div class="row" id="folder-grid">
        <?php foreach ($folders as $folder) : ?>
            <?php if (
                (isset($current_folder_id) && $folder['parent_id'] == $current_folder_id) ||
                (!isset($current_folder_id) && !$folder['parent_id'])
) : ?>
                <div class="col-sm-3 col-xs-6 mb-15"
                     data-folder-id="<?php echo $folder['id']; ?>">
          <div class="folder-item-wrapper pos-relative">
            <a href="?folder=<?php echo $folder['id']; ?>" class="folder-item">
              <span class="folder-icon">📁</span>
              <span class="folder-name"><?php echo htmlspecialchars($folder['name']); ?></span>
            </a>
                <?php // 全てのフォルダに管理メニューを表示 ?>
                <div class="folder-menu">
              <div class="dropdown">
                <button class="btn btn-sm btn-secondary dropdown-toggle dropdown-toggle--icon" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false">
                  ⋮
                </button>
                <ul class="dropdown-menu dropdown-menu-end dropdown-menu--narrow">
                  <li>
                      <a class="dropdown-item rename-folder" href="#"
                         data-folder-id="<?php echo $folder['id']; ?>">
                          ✏️ 名前変更
                      </a>
                  </li>
                  <li>
                      <a class="dropdown-item move-folder" href="#"
                         data-folder-id="<?php echo $folder['id']; ?>">
                          📁 移動
                      </a>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                      <a class="dropdown-item delete-folder text-danger-soft" href="#"
                         data-folder-id="<?php echo $folder['id']; ?>">
                          🗑 削除
                      </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
    <?php else : ?>
    <div class="text-center text-muted" style="padding: 20px;">
      <span class="glyphicon glyphicon-folder-open"
            style="font-size: 2em; margin-bottom: 10px; display: block;"></span>
      フォルダがありません
    </div>
    <?php endif; ?>
    </div>
  </div>
</div>
<?php endif; ?>