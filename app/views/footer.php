<?php

// Footer partial - Modal dialogs and scripts
?>
    <div class="modal fade" id="OKModal" tabindex="-1" aria-labelledby="OKModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="OKModalLabel">Modal title</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Modal body text goes here.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary f-action">OK</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="OKCanselModal" tabindex="-1" aria-labelledby="OKCanselModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="OKCanselModalLabel">Modal title</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Modal body text goes here.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
            <button type="button" class="btn btn-primary f-action">OK</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Bootstrap 5 JavaScript Bundle (no jQuery required) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
            integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
            crossorigin="anonymous"></script>

    

    <!-- DataTables removed - replaced with TypeScript FileManager -->
    
    <!-- Tus.io resumable upload client -->
    <script src="https://cdn.jsdelivr.net/npm/tus-js-client@3.1.1/dist/tus.min.js"></script>
    
    <!-- Modal処理 (TypeScript版に移行済み) -->
    <!-- <script src="./asset/js/modal.js"></script> -->
    
    <!-- TypeScript版JavaScript (DataTables完全除去済み) -->
    <script type="module" src="./asset/dist/main.js"></script>
    <script type="module" src="./asset/dist/file-manager.js"></script>
    <script type="module" src="./asset/dist/share.js"></script>
    <script type="module" src="./asset/dist/file-edit.js"></script>
    
    <script type="module" src="./asset/dist/drag-drop.js"></script>
    <script type="module" src="./asset/dist/folder-manager.js"></script>
    <script type="module" src="./asset/dist/resumable-upload.js"></script>
  </body>
</html>
