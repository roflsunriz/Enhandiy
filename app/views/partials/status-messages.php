<?php

/**
 * ステータスメッセージ表示部分テンプレート
 * 成功・エラーメッセージの表示を担当
 */

?>

<?php if (isset($deleted_status) && $deleted_status === 'success') : ?>
    <div id="statusMessage" class="alert alert-success" role="alert">
      <strong>成功</strong> ファイルの削除が完了しました
    </div>
<?php elseif (isset($uploaded_status) && $uploaded_status === 'success') : ?>
    <div id="statusMessage" class="alert alert-success" role="alert">
      <strong>成功</strong> ファイルのアップロードが完了しました
    </div>
<?php elseif (isset($deleted_status) && $deleted_status === 'error') : ?>
    <div id="statusMessage" class="alert alert-danger" role="alert">
      <strong>エラー</strong> ファイルの削除に失敗しました
    </div>
<?php elseif (isset($uploaded_status) && $uploaded_status === 'error') : ?>
    <div id="statusMessage" class="alert alert-danger" role="alert">
      <strong>エラー</strong> ファイルのアップロードに失敗しました
    </div>
<?php endif; ?>