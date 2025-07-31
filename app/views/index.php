
<div class="container">
  <?php if (isset($status_message)) : ?>
      <?php if ($status_message === 'success') : ?>
      <div id="statusMessage" class="alert alert-success" role="alert">
        <strong>?????</strong> ????????????????
      </div>
      <?php elseif ($status_message === 'error') : ?>
      <div id="statusMessage" class="alert alert-danger" role="alert">
        <strong>???</strong> ???????????????
      </div>
    <?php endif; ?>
  <?php endif; ?>

  <div class="row bg-white radius box-shadow">
    <div class="col-sm-12">
      <p class="h2">???????</p>
      <form id="upload" class="upload-form">
        <input type="hidden" id="csrfToken" name="csrf_token" 
               value="<?php echo htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8'); ?>">
        
        <!-- ????&??????? -->
        <div id="dragDropArea" class="drag-drop-area">
          <div class="drag-drop-content">
            <div class="drag-drop-icon">
              <span class="glyphicon glyphicon-cloud-upload"></span>
            </div>
            <h4>?????????&????</h4>
            <p>???</p>
            <button type="button" class="btn btn-primary" id="selectFilesBtn">???????</button>
            <button type="button" class="btn btn-info" id="selectFolderBtn">???????</button>
          </div>
          <div class="drag-drop-overlay">
            <div class="drag-drop-overlay-content">
              <span class="glyphicon glyphicon-download-alt"></span>
              <p>?????????????</p>
            </div>
          </div>
        </div>
        
        <!-- ?????????? -->
        <input id="multipleFileInput" type="file" multiple style="display:none">
        <input id="folderInput" type="file" webkitdirectory multiple style="display:none">
        
        <!-- ??????????? -->
        <div id="selectedFilesContainer" class="selected-files-container" style="display: none;">
          <h5>?????????:</h5>
          <div id="selectedFilesList" class="selected-files-list"></div>
          <button type="button" class="btn btn-sm btn-default" id="clearFilesBtn">???</button>
        </div>

        <div class="form-section file-input-group">
          <input id="lefile" name="file" type="file" style="display:none">
          <div class="input-group">
            <input type="text" id="fileInput" class="form-control" name="file" placeholder="???????..." readonly>
            <span class="input-group-btn">
              <button type="button" class="btn btn-primary" onclick="$('input[id=lefile]').click();">
                ?? ??????
              </button>
            </span>
          </div>
          <p class="help-block">
            ?? ??<?php echo $max_file_size; ?>MB??????????<br>
            ?? ?????: <?php echo implode(', ', $extension); ?>
          </p>
        </div>

        <div class="form-section">
          <div class="form-group">
            <label for="commentInput">?? ????</label>
            <input type="text" class="form-control" id="commentInput" name="comment" placeholder="??????????...">
            <p class="help-block"><?php echo $max_comment; ?>????????</p>
          </div>
        </div>

        <div class="form-section">
          <div class="row">
            <div class="col-sm-6">
              <div class="form-group">
                <label for="dlkeyInput">?? ????????</label>
                <input type="text" class="form-control" id="dleyInput" name="dlkey" placeholder="????????...">
                <p class="help-block">???????</p>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="form-group">
                <label for="delkeyInput">??? ????</label>
                <input type="text" class="form-control" id="deleyInput" name="delkey" placeholder="????????...">
                <p class="help-block">???????</p>
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="row">
            <div class="col-sm-offset-10 col-sm-2">
              <button type="button" class="btn btn-success btn-block btn-submit" onclick="file_upload()">
                ?? ??????
              </button>
            </div>
          </div>
        </div>
      </form>

      <div id="uploadContainer" class="upload-progress" style="display: none;">
        <div class="panel-heading">
          <h4>? ???????...</h4>
        </div>
        <div class="panel-body">
          <div class="progress">
            <div id="progressBar" class="progress-bar" role="progressbar" style="width: 0%;">
              <span id="progressText">0%</span>
            </div>
          </div>
        </div>
      </div>

      <div id="errorContainer" class="panel panel-danger" style="<?php echo !empty($error_message) ? 'display: block;' : 'display: none;'; ?>">
        <div class="panel-heading">
          <h4>?? ???</h4>
        </div>
        <div class="panel-body">
          <?php echo !empty($error_message) ? htmlspecialchars($error_message) : ''; ?>
        </div>
      </div>

    </div>
  </div>

  <div class="row bg-white radius box-shadow">
    <div class="col-sm-12">
      <!-- ????????????? (DataTables?????) -->
      <div id="fileManagerContainer"></div>
      
      <!-- ??????????????? -->
      <div class="file-table-container" style="display: none;">
        <table id="fileList" class="table table-striped" cellspacing="0" width="100%">
          <thead>
            <tr>
              <th>ID</th>
              <th>?????</th>
              <th>????</th>
              <th>???</th>
              <th>??</th>
              <th>DL?</th>
              <th>??</th>
              <th>??</th>
            </tr>
          </thead>
          <tbody>
                <?php
        foreach ($data as $s) {
            echo '<tr>';
            echo '<td>' . $s['id'] . '</td>';
            echo '<td><a href="javascript:void(0);" onclick="dl_button(' . $s['id'] . ');">' 
                . $s['origin_file_name'] . '</a></td>';
            echo '<td>' . $s['comment'] . '</td>';
            echo '<td>' . round($s['size'] / (1024 * 1024), 1) . 'MB</td>';
            echo '<td>' . date("Y/m/d H:i:s", $s['input_date']) . '</td>';
            echo '<td>' . $s['count'] . '</td>';
            echo '<td><a href="javascript:void(0);" onclick="share_button(' . $s['id'] . ');">[??]</a></td>';
            echo '<td><a href="javascript:void(0);" onclick="del_button(' . $s['id'] . ');">[DEL]</a></td>';
            echo '</tr>';
        }
        ?>
          </tbody>
          <tfoot>
            <tr>
              <th>ID</th>
              <th>?????</th>
              <th>????</th>
              <th>???</th>
              <th>??</th>
              <th>DL?</th>
              <th>??</th>
              <th>??</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ???????????? -->
      <div id="fileListCards">
                <?php
        foreach ($data as $s) {
            echo '<div class="file-card">';
            echo '  <div class="file-card__main" onclick="toggleCardDetails(this)">';
            echo '    <div class="file-card__content">';
            echo '      <a href="javascript:void(0);" class="file-card__filename" ';
            echo 'onclick="event.stopPropagation(); dl_button(' . $s['id'] . ');">';
            echo $s['origin_file_name'] . '</a>';
            echo '      <p class="file-card__comment">' . $s['comment'] . '</p>';
            echo '    </div>';
            echo '    <button class="file-card__toggle" type="button">?</button>';
            echo '  </div>';
            echo '  <div class="file-card__details">';
            echo '    <div class="file-card__detail-row">';
            echo '      <span class="file-card__detail-label">ID:</span>';
            echo '      <span class="file-card__detail-value">' . $s['id'] . '</span>';
            echo '    </div>';
            echo '    <div class="file-card__detail-row">';
            echo '      <span class="file-card__detail-label">???:</span>';
            echo '      <span class="file-card__detail-value file-card__detail-value--size">';
            echo round($s['size'] / (1024 * 1024), 1) . 'MB</span>';
            echo '    </div>';
            echo '    <div class="file-card__detail-row">';
            echo '      <span class="file-card__detail-label">??:</span>';
            echo '      <span class="file-card__detail-value file-card__detail-value--date">';
            echo date("Y/m/d H:i:s", $s['input_date']) . '</span>';
            echo '    </div>';
            echo '    <div class="file-card__detail-row">';
            echo '      <span class="file-card__detail-label">DL?:</span>';
            echo '      <span class="file-card__detail-value file-card__detail-value--count">' . $s['count'] . '</span>';
            echo '    </div>';
            echo '    <div class="file-card__actions">';
            echo '      <a href="javascript:void(0);" class="file-card__action-btn" ';
            echo 'onclick="dl_button(' . $s['id'] . ');">??????</a>';
            echo '      <a href="javascript:void(0);" class="file-card__action-btn file-card__action-btn--share" ';
            echo 'onclick="share_button(' . $s['id'] . ');">??</a>';
            echo '      <a href="javascript:void(0);" class="file-card__action-btn file-card__action-btn--delete" ';
            echo 'onclick="del_button(' . $s['id'] . ');">??</a>';
            echo '    </div>';
            echo '  </div>';
            echo '</div>';
        }
        ?>
      </div>

      <!-- ?????????????? -->
      <div class="file-cards-container" style="display: none;"></div>
    </div>
    <p class="text-right">@<a href="https://github.com/shimosyan/phpUploader" target="_blank">
      shimosyan/phpUploader</a> v<?php echo $version; ?> (GitHub)</p>
  </div>
</div>

<!-- ????????JavaScript??? -->
<script>
  // PHP??JavaScript???????????
  window.fileData = <?php echo json_encode($data, JSON_UNESCAPED_UNICODE); ?>;
</script>
