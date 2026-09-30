<?php

$error = $error ?? 'エラーが発生しました。';

?>

<div class="container">
  <div class="row">
    <div class="col-sm-12">
      <div class="alert alert-danger" role="alert"><?php echo $error ?></div>
    </div>
  </div>
</div>
