<?php

/**
 * エラー表示部分テンプレート
 * アップロードエラーなどの表示を担当
 */

?>

<div class="row bg-white radius box-shadow d-none" id="errorContainer">
  <div class="col-sm-12">
    <div class="panel panel-danger">
      <div class="panel-heading">
        <h4>エラーが発生</h4>
      </div>
      <div class="panel-body">
        <?php echo !empty($error_message) ? htmlspecialchars($error_message) : ''; ?>
      </div>
    </div>
  </div>
</div>