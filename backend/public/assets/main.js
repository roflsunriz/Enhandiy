import{d as e,h as t,i as n,m as r,n as i,p as a,r as o,t as s,y as c}from"./error-handling-Bc7PTH2e.js";import{n as l,t as u}from"./client-Cqu8sAUr.js";import{n as d,r as f,t as p}from"./modal-CNOxf8Vx.js";var m=class{container;state;renderer=null;events=null;refreshPromise=null;refreshRequested=!1;constructor(e,t={}){this.container=e,this.state={files:[],filteredFiles:[],currentPage:1,itemsPerPage:t.itemsPerPage||12,searchQuery:``,sortBy:t.defaultSort||`date_desc`,viewMode:this.loadViewMode()||t.defaultView||`grid`,selectedFiles:new Set,isLoading:!1,isRefreshing:!1}}setDependencies(e,t){this.renderer=e,this.events=t}loadViewMode(){try{return localStorage.getItem(`fileManager_viewMode`)||null}catch{return null}}saveViewMode(){try{localStorage.setItem(`fileManager_viewMode`,this.state.viewMode)}catch{}}init(){this.renderer&&this.renderer.init(),this.events&&this.events.init(),this.initializeUrlParamWatcher()}setFiles(e){this.state.files=e.map(e=>this.normalizeFileData(e)),this.applyFiltersAndSort(),this.render()}normalizeFileData(e){let t={...e};if(!t.name&&t.origin_file_name&&(t.name=t.origin_file_name),t.folder_id!==void 0&&t.folder_id!==null&&(t.folder_id=String(t.folder_id)),t.upload_date){if(typeof t.upload_date==`number`||/^\d+$/.test(t.upload_date)){let e=typeof t.upload_date==`number`?t.upload_date:parseInt(t.upload_date);t.upload_date=new Date(e<1e10?e*1e3:e).toISOString()}}else if(t.input_date){let e=typeof t.input_date==`number`?t.input_date:parseInt(t.input_date);t.upload_date=new Date(e*1e3).toISOString()}return typeof t.id==`number`&&(t.id=t.id.toString()),!t.type&&t.name&&(t.type=this.guessFileTypeFromName(t.name)),t}guessFileTypeFromName(e){return{jpg:`image/jpeg`,jpeg:`image/jpeg`,png:`image/png`,gif:`image/gif`,webp:`image/webp`,pdf:`application/pdf`,txt:`text/plain`,json:`application/json`,js:`application/javascript`,html:`text/html`,css:`text/css`,xml:`application/xml`,zip:`application/zip`,rar:`application/x-rar-compressed`,"7z":`application/x-7z-compressed`,mp4:`video/mp4`,avi:`video/x-msvideo`,mp3:`audio/mpeg`,wav:`audio/wav`,doc:`application/msword`,docx:`application/vnd.openxmlformats-officedocument.wordprocessingml.document`,xls:`application/vnd.ms-excel`,xlsx:`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,ppt:`application/vnd.ms-powerpoint`,pptx:`application/vnd.openxmlformats-officedocument.presentationml.presentation`}[e.split(`.`).pop()?.toLowerCase()||``]||`application/octet-stream`}getFiles(){return[...this.state.files]}getFilteredFiles(){return[...this.state.filteredFiles]}getCurrentPage(){return this.state.currentPage}setPage(e){let t=this.getMaxPage();this.state.currentPage=Math.max(1,Math.min(e,t)),this.render()}getMaxPage(){return Math.ceil(this.state.filteredFiles.length/this.state.itemsPerPage)}setSearchQuery(e){this.state.searchQuery=e,this.state.currentPage=1,this.applyFiltersAndSort(),this.render()}setSortBy(e,t){this.state.sortBy=`${e}_${t}`,this.applyFiltersAndSort(),this.render()}setViewMode(e){this.state.viewMode=e,this.saveViewMode(),this.render()}getViewMode(){return this.state.viewMode}getSelectedFiles(){return this.state.files.filter(e=>this.state.selectedFiles.has(e.id.toString()))}toggleFileSelection(e){let t=e.toString();this.state.selectedFiles.has(t)?this.state.selectedFiles.delete(t):this.state.selectedFiles.add(t),this.render()}toggleAllSelection(){let e=this.getCurrentPageFiles();e.every(e=>this.state.selectedFiles.has(e.id.toString()))?e.forEach(e=>this.state.selectedFiles.delete(e.id.toString())):e.forEach(e=>this.state.selectedFiles.add(e.id.toString())),this.render()}clearSelection(){this.state.selectedFiles.clear(),this.render()}updateFile(e,t){let n=this.state.files.findIndex(t=>t.id===e);n!==-1&&(this.state.files[n]={...this.state.files[n],...t},this.applyFiltersAndSort(),this.render())}removeFile(e){this.state.files=this.state.files.filter(t=>t.id!==e),this.state.selectedFiles.delete(e),this.applyFiltersAndSort(),this.render()}addFile(e){this.state.files.push(e),this.applyFiltersAndSort(),this.render()}refresh(){this.applyFiltersAndSort(),this.render()}async refreshFromServer(){this.refreshRequested=!0,this.refreshPromise||=this.runRefreshLoop().finally(()=>{this.refreshPromise=null}),await this.refreshPromise}async runRefreshLoop(){try{this.state.isRefreshing=!0,this.state.isLoading=!0,this.updateLoadingState();do this.refreshRequested=!1,await this.refreshOnce();while(this.refreshRequested)}finally{this.state.isRefreshing=!1,this.state.isLoading=!1,this.updateLoadingState()}}async refreshOnce(){try{let e=new URLSearchParams(window.location.search),t=e.get(`folder`)||``;if(e.has(`folder`)&&(e.get(`folder`)===``||e.get(`folder`)===null)){e.delete(`folder`);let t=window.location.pathname+(e.toString()?`?`+e.toString():``)+(window.location.hash||``);try{window.history.replaceState({},``,t)}catch{}}let n=await l.getFiles(t||void 0,{includeFolders:!0,includeBreadcrumb:!0});if(n.success&&n.data){let e=n.data;this.state.files=(e.files||[]).map(e=>this.normalizeFileData(e)),Array.isArray(e.folders)&&(window.folderData=e.folders),this.applyFiltersAndSort(),this.goToLatestFilePage(),this.render(),this.updateLoadingState()}else console.error(`ファイルリスト更新エラー:`,n.error||`データが無効です`)}catch(e){console.error(`ファイルリストの更新に失敗:`,e)}}updateLoadingState(){if(this.state.isLoading||this.state.isRefreshing){this.container.classList.add(`file-manager--loading`),this.container.querySelectorAll(`.file-action-btn`).forEach(e=>{e.disabled=!0,e.classList.add(`disabled`)});let e=this.container.querySelector(`.file-manager__refresh-btn`);e&&(e.disabled=!0,e.classList.add(`disabled`))}else{this.container.classList.remove(`file-manager--loading`),this.container.querySelectorAll(`.file-action-btn`).forEach(e=>{e.disabled=!1,e.classList.remove(`disabled`)});let e=this.container.querySelector(`.file-manager__refresh-btn`);e&&(e.disabled=!1,e.classList.remove(`disabled`))}}isRefreshing(){return this.state.isRefreshing}initializeUrlParamWatcher(){this.checkUrlParams(),window.addEventListener(`popstate`,()=>{this.checkUrlParams()})}async checkUrlParams(){let e=new URLSearchParams(window.location.search);if(e.get(`deleted`)===`success`){await this.refreshFromServer(),window.folderManager&&await window.folderManager.refreshAll(),e.delete(`deleted`);let t=window.location.pathname+(e.toString()?`?`+e.toString():``);window.history.replaceState({},``,t)}}getStats(){let e=this.getSelectedFiles(),t=this.state.files.reduce((e,t)=>e+t.size,0);return{totalFiles:this.state.files.length,filteredFiles:this.state.filteredFiles.length,selectedFiles:e.length,totalSize:t}}getState(){return{...this.state}}goToPageContainingFile(e){let t=this.state.filteredFiles.findIndex(t=>t.id.toString()===e);if(t===-1)return console.warn(`FileManagerCore: 指定されたファイルが見つかりません:`,e),!1;let n=Math.floor(t/this.state.itemsPerPage)+1;return n!==this.state.currentPage&&(this.setPage(n),!0)}goToLatestFilePage(){if(this.state.filteredFiles.length>0){let e=this.state.filteredFiles[0];this.goToPageContainingFile(e.id.toString())}}getCurrentPageFiles(){let e=(this.state.currentPage-1)*this.state.itemsPerPage,t=e+this.state.itemsPerPage;return this.state.filteredFiles.slice(e,t)}applyFiltersAndSort(){let e=[...this.state.files];if(this.state.searchQuery){let t=this.state.searchQuery.toLowerCase();e=e.filter(e=>{if(!e||typeof e.name!=`string`)return console.warn(`Invalid file data (missing name):`,e),!1;let n=e.name.toLowerCase().includes(t),r=e.comment&&typeof e.comment==`string`?e.comment.toLowerCase().includes(t):!1;return n||r})}e.sort((e,t)=>this.compareFiles(e,t)),this.state.filteredFiles=e;let t=this.getMaxPage();this.state.currentPage>t&&t>0&&(this.state.currentPage=t)}compareFiles(e,t){if(!e||!t)return console.warn(`Invalid file data in comparison:`,{a:e,b:t}),0;let[n,r]=this.state.sortBy.split(`_`),i=r===`asc`?1:-1;try{switch(n){case`name`:{let n=e.name||``,r=t.name||``;return n.localeCompare(r)*i}case`size`:return((typeof e.size==`number`?e.size:0)-(typeof t.size==`number`?t.size:0))*i;case`date`:return(new Date(e.upload_date||0).getTime()-new Date(t.upload_date||0).getTime())*i;case`type`:{let n=e.type||``,r=t.type||``;return n.localeCompare(r)*i}default:return 0}}catch(n){return console.error(`Error in file comparison:`,n,{a:e,b:t}),0}}render(){this.renderer&&this.renderer.render()}destroy(){this.state.selectedFiles.clear()}},h=class{core;constructor(e){this.core=e}init(){this.setupContainer()}setupContainer(){this.core.container.classList.contains(`file-manager-v2`)||this.core.container.classList.add(`file-manager-v2`),this.core.container.innerHTML=`
      <div class="file-manager__header">
        <div class="file-manager__title-group">
          <span class="file-manager__eyebrow">コンテンツ</span>
          <h2>フォルダとファイル</h2>
        </div>
        <div class="file-manager__controls">
          <div class="file-manager__search">
            <input type="search" class="file-manager__search-input" placeholder="フォルダ・ファイルを検索" aria-label="フォルダとファイルを検索">
          </div>
          <div class="file-manager__sort">
            <label>並び順:</label>
            <select class="file-manager__sort-select">
              <option value="name_asc">名前順</option>
              <option value="name_desc">名前順 (逆)</option>
              <option value="size_asc">サイズ小順</option>
              <option value="size_desc">サイズ大順</option>
              <option value="date_asc">古い順</option>
              <option value="date_desc" selected>新しい順</option>
            </select>
          </div>
          <div class="file-manager__view-toggle">
            <button type="button" class="file-manager__view-btn" data-view="grid" title="グリッド表示" aria-label="グリッド表示">
              グリッド
            </button>
            <button type="button" class="file-manager__view-btn" data-view="list" title="リスト表示" aria-label="リスト表示">
              リスト
            </button>
            <button type="button" class="file-manager__refresh-btn" title="最新の状態に更新" aria-label="最新の状態に更新">
              ${a.refresh(18)} 更新
            </button>
          </div>
        </div>
        <div class="file-manager__stats">
          <span class="file-manager__stats-text"></span>
        </div>
      </div>

      <div class="file-manager__bulk-actions" style="display: none;">
        <div class="bulk-actions__controls">
          <button class="bulk-action-btn bulk-action-btn--select-all" data-action="select-all">
            全選択
          </button>
          <button class="bulk-action-btn bulk-action-btn--delete" data-action="delete">
            削除
          </button>
          <button class="bulk-action-btn bulk-action-btn--cancel" data-action="cancel">
            選択解除
          </button>
        </div>
      </div>

      <div class="file-manager__content">
        <div class="file-manager__grid" data-view="grid"></div>
        <div class="file-manager__list" data-view="list"></div>
      </div>

      <div class="file-manager__pagination">
        <div class="pagination__info"></div>
        <div class="pagination__controls"></div>
      </div>

      <div class="file-manager__loading" style="display: none;">
        <div class="loading__spinner"></div>
        <div class="loading__text">読み込み中...</div>
      </div>
    `}render(){this.updateViewMode(),this.renderFiles(),this.renderPagination(),this.renderStats(),this.renderBulkActions()}updateViewMode(){let e=this.core.getViewMode(),t=this.core.getState();this.core.container.querySelectorAll(`.file-manager__view-btn`).forEach(t=>{let n=t,r=n.dataset.view===e;n.setAttribute(`aria-pressed`,String(r)),r?n.classList.add(`active`):n.classList.remove(`active`)});let n=this.core.container.querySelector(`.file-manager__sort-select`);n&&(n.value=t.sortBy);let r=this.core.container.querySelector(`.file-manager__grid`),i=this.core.container.querySelector(`.file-manager__list`);e===`grid`?(r.style.display=`grid`,i.style.display=`none`):(r.style.display=`none`,i.style.display=`block`),this.updateSortIcons()}updateSortIcons(){let[e,t]=this.core.getState().sortBy.split(`_`);this.core.container.querySelectorAll(`.sort-icon`).forEach(e=>{e.textContent=``});let n=this.core.container.querySelector(`[data-sort="${e}"] .sort-icon`);n&&(n.innerHTML=t===`asc`?` ${a.arrowUp(16)}`:` ${a.arrowDown(16)}`)}renderFiles(){let e=this.core.getCurrentPageFiles(),t=this.getVisibleFolders();this.core.getViewMode()===`grid`?this.renderGridView(e,t):this.renderListView(e,t)}renderGridView(e,t){let n=this.core.container.querySelector(`.file-manager__grid`);if(e.length===0&&t.length===0){n.innerHTML=this.createEmptyState();return}n.innerHTML=(t.length>0?`<div id="folder-grid" class="file-manager__folder-grid">${t.map(e=>this.createFolderGridItem(e)).join(``)}</div>`:``)+e.map(e=>this.createGridItem(e)).join(``)}renderListView(e,t){let n=this.core.container.querySelector(`.file-manager__list`);if(e.length===0&&t.length===0){n.innerHTML=this.createEmptyState();return}n.innerHTML=`
      <table class="file-list-table">
        <thead>
          <tr>
            <th class="file-list__select">
              <input type="checkbox" class="select-all-checkbox">
            </th>
            <th class="file-list__name sortable" data-sort="name">
              名前 <span class="sort-icon"></span>
            </th>
            <th class="file-list__size sortable" data-sort="size">
              サイズ <span class="sort-icon"></span>
            </th>
            <th class="file-list__date sortable" data-sort="date">
              アップロード日時 <span class="sort-icon"></span>
            </th>
            ${window?.config?.folders_enabled?`<th class="file-list__folder">フォルダ</th>`:``}
            <th class="file-list__downloads">DL数</th>
            <th class="file-list__actions">操作</th>
          </tr>
        </thead>
        <tbody class="file-manager__folder-list">
          ${t.map(e=>this.createFolderListItem(e)).join(``)}
        </tbody>
        <tbody>
          ${e.map(e=>this.createListItem(e)).join(``)}
        </tbody>
      </table>
    `}createGridItem(e){let n=this.core.getState().selectedFiles.has(e.id.toString()),i=r(e.type||``,20),o=this.formatFileSize(e.size),s=this.formatDate(e.upload_date||``),c=e.name||``,{baseName:l,extension:u}=this.splitFileName(c);return`
      <article class="file-grid-item ${n?`selected`:``}" data-file-id="${e.id}">
        <div class="file-grid-item__checkbox">
          <input type="checkbox" ${n?`checked`:``} class="file-checkbox" data-file-id="${e.id}" aria-label="${this.escapeHtml(e.name||`ファイル`)}を選択">
        </div>

        <!-- アイコンとコメント部分（薄いねずみ色背景） -->
        <div class="file-grid-item__header">
          <div class="file-grid-item__icon">
            <span class="file-icon file-icon--${this.getFileTypeClass(e.type||``)}">${i}</span>
          </div>
          <div class="file-grid-item__name" title="${this.escapeHtml(c)}" aria-label="${this.escapeHtml(c)}"><span class="file-grid-item__name-base">${this.escapeHtml(l)}</span>${u?`<span class="file-grid-item__name-extension">${this.escapeHtml(u)}</span>`:``}</div>
          ${e.comment?`<div class="file-grid-item__comment" title="${this.escapeHtml(e.comment)}">${this.escapeHtml(e.comment)}</div>`:``}
        </div>

        <!-- メタデータ部分（2x2 グリッド・アイコンラベル） -->
        <div class="file-grid-item__metadata metadata-grid">
          <div class="meta-item meta-item--size">${t.size(16)} <span class="meta-text">${o}</span></div>
          <div class="meta-item meta-item--downloads">${t.downloads(16)} <span class="meta-text">${this.formatDownloads(e)}</span></div>
          <div class="meta-item meta-item--date">${t.date(16)} <span class="meta-text">${s}</span></div>
          ${window?.config?.folders_enabled?`<div class="meta-item meta-item--folder">${t.folder(16)} <span class="meta-text">${this.getFolderPath(e.folder_id)}</span></div>`:``}
        </div>

        <!-- アクションボタン部分（二段構成） -->
        <div class="file-grid-item__actions">
          <div class="file-grid-item__actions-row">
            <button type="button" class="btn btn-xs btn-primary file-action-btn file-action-btn--download" data-action="download" data-file-id="${e.id}" title="ダウンロード" aria-label="${this.escapeHtml(e.name||`ファイル`)}をダウンロード">
              ${a.download(14)} <span>保存</span>
            </button>
            <button type="button" class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有" aria-label="${this.escapeHtml(e.name||`ファイル`)}を共有">
              ${a.share(14)} <span>共有</span>
            </button>
            ${window?.config?.folders_enabled?`
            <button type="button" class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${e.id}" title="移動" aria-label="${this.escapeHtml(e.name||`ファイル`)}を移動">
              ${a.move(14)} <span>移動</span>
            </button>
            `:``}
            ${window?.config?.allow_comment_edit?`
            <button type="button" class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${e.id}" title="編集" aria-label="${this.escapeHtml(e.name||`ファイル`)}を編集">
              ${a.edit(14)} <span>編集</span>
            </button>
            `:``}
          </div>
          <div class="file-grid-item__actions-row">
            ${window?.config?.allow_file_replace?`
            <button type="button" class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${e.id}" title="差し替え" aria-label="${this.escapeHtml(e.name||`ファイル`)}を差し替え">
              ${a.replace(14)} <span>差し替え</span>
            </button>
            `:``}
            <button type="button" class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除" aria-label="${this.escapeHtml(e.name||`ファイル`)}を削除">
              ${a.delete(14)} <span>削除</span>
            </button>
          </div>
        </div>
      </article>
    `}createFolderGridItem(e){let t=String(e.id),n=this.escapeHtml(e.name),r=Number(e.file_count||0);return`
      <article class="folder-grid-item" data-folder-id="${this.escapeHtml(t)}">
        <div class="folder-item-wrapper">
          <a href="?folder=${encodeURIComponent(t)}" class="folder-item" data-folder-link="${this.escapeHtml(t)}">
            <span class="folder-icon">${a.move(24)}</span>
            <span class="folder-item__content">
              <span class="folder-name" title="${n}">${n}</span>
              <span class="folder-item__meta">${r}件のファイル</span>
            </span>
          </a>
          ${this.createFolderMenu(t,n)}
        </div>
      </article>
    `}createFolderListItem(e){let t=String(e.id),n=this.escapeHtml(e.name),r=this.formatDate(e.created_at||``),i=window.config?.folders_enabled?`<td class="file-list__folder">現在の場所</td>`:``;return`
      <tr class="folder-list-item" data-folder-id="${this.escapeHtml(t)}">
        <td class="file-list__select" aria-hidden="true"></td>
        <td class="file-list__name">
          <a href="?folder=${encodeURIComponent(t)}" class="folder-item folder-item--list" data-folder-link="${this.escapeHtml(t)}">
            <span class="folder-icon">${a.move(20)}</span>
            <span class="folder-name" title="${n}">${n}</span>
          </a>
        </td>
        <td class="file-list__size">フォルダ</td>
        <td class="file-list__date">${r}</td>
        ${i}
        <td class="file-list__downloads">${Number(e.file_count||0)}</td>
        <td class="file-list__actions folder-list__actions">${this.createFolderListActions(t,n)}</td>
      </tr>
    `}createFolderListActions(e,t){let n=this.escapeHtml(e);return`
      <div class="folder-list-actions" role="group" aria-label="${t}の操作">
        <button type="button" class="btn folder-action-btn rename-folder"
                data-folder-id="${n}" data-folder-action="rename"
                title="名前変更" aria-label="${t}の名前を変更">
          ${a.edit(16)} <span>名前変更</span>
        </button>
        <button type="button" class="btn folder-action-btn move-folder"
                data-folder-id="${n}" data-folder-action="move"
                title="移動" aria-label="${t}を移動">
          ${a.move(16)} <span>移動</span>
        </button>
        <button type="button" class="btn folder-action-btn folder-action-btn--delete delete-folder"
                data-folder-id="${n}" data-folder-action="delete"
                title="削除" aria-label="${t}を削除">
          ${a.delete(16)} <span>削除</span>
        </button>
      </div>
    `}createFolderMenu(e,t){return`
      <div class="folder-menu dropdown">
        <button class="btn btn-sm btn-secondary dropdown-toggle dropdown-toggle--icon" type="button"
                data-bs-toggle="dropdown" aria-expanded="false" aria-label="${t}の操作">
          <span aria-hidden="true">⋯</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end dropdown-menu--narrow">
          <li><a class="dropdown-item rename-folder" href="#" data-folder-id="${this.escapeHtml(e)}">${a.edit(16)} 名前変更</a></li>
          <li><a class="dropdown-item move-folder" href="#" data-folder-id="${this.escapeHtml(e)}">${a.move(16)} 移動</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item delete-folder text-danger-soft" href="#" data-folder-id="${this.escapeHtml(e)}">${a.delete(16)} 削除</a></li>
        </ul>
      </div>
    `}createEmptyState(){return`
      <div class="file-manager__empty">
        <div class="file-manager__empty-state">
          <span class="file-manager__empty-icon" aria-hidden="true">${a.move(26)}</span>
          <h3 class="file-manager__empty-title">この場所は空です</h3>
          <p class="file-manager__empty-description">ファイルをドロップするか、新しいフォルダを作成してください。</p>
        </div>
      </div>
    `}createListItem(e){let t=this.core.getState().selectedFiles.has(e.id.toString()),n=this.getFileIcon(e.type||``),r=this.formatFileSize(e.size),i=this.formatDate(e.upload_date||``);return`
      <tr class="file-list-item ${t?`selected`:``}" data-file-id="${e.id}">
        <td class="file-list__select">
          <input type="checkbox" ${t?`checked`:``} class="file-checkbox" data-file-id="${e.id}">
        </td>
        <td class="file-list__name">
          <span class="file-icon file-icon--${this.getFileTypeClass(e.type||``)}">${n}</span>
          <span class="file-name" title="${this.escapeHtml(e.name||``)}">${this.escapeHtml(e.name||``)}</span>
          ${e.comment?`<div class="file-comment">${this.escapeHtml(e.comment)}</div>`:``}
        </td>
        <td class="file-list__size">${r}</td>
        <td class="file-list__date">${i}</td>
        ${window?.config?.folders_enabled?`<td class="file-list__folder">${this.getFolderPath(e.folder_id)}</td>`:``}
        <td class="file-list__downloads">${this.formatDownloads(e)}</td>
        <td class="file-list__actions">
          <button class="btn btn-xs btn-primary file-action-btn file-action-btn--download" data-action="download" data-file-id="${e.id}" title="ダウンロード">
            ${a.download(18)}
          </button>
          <button class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有">
            ${a.share(18)}
          </button>
          ${window?.config?.allow_comment_edit?`
          <button class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${e.id}" title="編集">
            ${a.edit(18)}
          </button>
          `:``}
          ${window?.config?.folders_enabled?`
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${e.id}" title="移動">
            ${a.move(18)}
          </button>
          `:``}
          ${window?.config?.allow_file_replace?`
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${e.id}" title="差し替え">
            ${a.replace(18)}
          </button>
          `:``}
          <button class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除">
            ${a.delete(18)}
          </button>
        </td>
      </tr>
    `}renderPagination(){let e=this.core.getStats(),t=this.core.getCurrentPage(),n=this.core.getMaxPage(),r=this.core.container.querySelector(`.pagination__info`),i=this.core.container.querySelector(`.pagination__controls`);if(r.textContent=`${(t-1)*this.core.getState().itemsPerPage+1}-${Math.min(t*this.core.getState().itemsPerPage,e.filteredFiles)} / ${e.filteredFiles}件`,n<=1){i.innerHTML=``;return}let a=``;a+=`
      <button class="pagination-btn pagination-btn--prev" ${t<=1?`disabled`:``} data-page="${t-1}">
        ← 前
      </button>
    `;let o=Math.max(1,t-2),s=Math.min(n,t+2);for(let e=o;e<=s;e++)a+=`
        <button class="pagination-btn pagination-btn--number ${e===t?`active`:``}" data-page="${e}">
          ${e}
        </button>
      `;a+=`
      <button class="pagination-btn pagination-btn--next" ${t>=n?`disabled`:``} data-page="${t+1}">
        次 →
      </button>
    `,i.innerHTML=a}renderStats(){let e=this.core.getStats(),t=this.core.container.querySelector(`.file-manager__stats-text`),n=`${this.getVisibleFolders().length}フォルダ・${e.totalFiles}ファイル`;e.filteredFiles!==e.totalFiles&&(n+=` (${e.filteredFiles}件表示)`),e.selectedFiles>0&&(n+=` | ${e.selectedFiles}件選択中`),t.textContent=n}renderBulkActions(){let e=this.core.getStats().selectedFiles,t=this.core.container.querySelector(`.file-manager__bulk-actions`);e>0?t.style.display=`block`:t.style.display=`none`}getFileIcon(e){return``}getVisibleFolders(){if(!window.config?.folders_enabled||!Array.isArray(window.folderData))return[];let e=new URLSearchParams(window.location.search).get(`folder`),t=this.core.getState().searchQuery.trim().toLocaleLowerCase(`ja`);return window.folderData.filter(t=>(t.parent_id===void 0||t.parent_id===null||t.parent_id===``?null:String(t.parent_id))===e).filter(e=>!t||e.name.toLocaleLowerCase(`ja`).includes(t)).sort((e,t)=>e.name.localeCompare(t.name,`ja`,{numeric:!0,sensitivity:`base`}))}getFileTypeClass(e){return e?e.startsWith(`image/`)?`image`:e.startsWith(`video/`)?`video`:e.startsWith(`audio/`)?`audio`:e.includes(`pdf`)?`pdf`:e.includes(`zip`)||e.includes(`archive`)||e.includes(`compressed`)?`archive`:e.includes(`text`)||e.includes(`plain`)?`text`:e.includes(`javascript`)||e.includes(`json`)?`code`:e.includes(`html`)||e.includes(`xml`)?`web`:e.includes(`word`)||e.includes(`document`)?`document`:e.includes(`excel`)||e.includes(`sheet`)?`spreadsheet`:e.includes(`powerpoint`)||e.includes(`presentation`)?`presentation`:`file`:`file`}formatFileSize(e){if(!e||e===0)return`0 B`;let t=[`B`,`KB`,`MB`,`GB`,`TB`,`PB`],n=e,r=0;for(;n>=1024&&r<t.length-1;)n/=1024,r++;let i=0;return r>0&&(n<10?i=2:n<100&&(i=1)),`${n.toFixed(i)} ${t[r]}`}formatDate(e){if(!e)return`不明`;let t;if(typeof e==`number`||/^\d+$/.test(e)){let n=typeof e==`number`?e:parseInt(e);t=new Date(n<1e10?n*1e3:n)}else if(typeof e==`string`){if(e.includes(` `)){let n=e.split(` `);if(n.length===2){let[e,r]=n,i=`${e}T${r}`;t=new Date(i)}else t=new Date(e)}else t=new Date(e)}else t=new Date(e);if(isNaN(t.getTime()))return console.warn(`Invalid date format:`,e),`不明`;try{return t.toLocaleDateString(`ja-JP`,{year:`numeric`,month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`})}catch(t){return console.error(`Date formatting error:`,t,e),`不明`}}escapeHtml(e){if(!e)return``;let t=document.createElement(`div`);return t.textContent=e,t.innerHTML}splitFileName(e){let t=e.lastIndexOf(`.`);return t<=0||t===e.length-1?{baseName:e,extension:``}:{baseName:e.slice(0,t),extension:e.slice(t)}}getFolderPath(e){if(!e)return`ルート`;let t=window.folderData||[],n=(e,t)=>{for(let r of e){let e=r;if(String(e.id)===String(t))return e;if(e.children){let r=n(e.children,t);if(r)return r}}return null};return n(t,String(e))?.name||`不明なフォルダ`}formatDownloads(e){return e.count&&typeof e.count==`number`?`${e.count}回`:e.share_downloads&&typeof e.share_downloads==`number`?`${e.share_downloads}回`:e.share_key?`共有中`:`0回`}},g=class{core;eventListeners=[];processingActions=new Set;constructor(e){this.core=e}init(){this.bindEvents()}reinitializeEvents(){this.core.container.querySelector(`.file-action-btn`)||console.warn(`FileManagerEvents: アクションボタンが見つかりません`),this.destroy(),this.init()}bindEvents(){this.addListener(this.core.container,`input`,this.handleDelegatedInput.bind(this)),this.addListener(this.core.container,`keyup`,this.handleDelegatedKeyup.bind(this)),this.addListener(this.core.container,`click`,this.handleDelegatedClick.bind(this)),this.addListener(this.core.container,`change`,this.handleDelegatedChange.bind(this)),this.addListener(this.core.container,`dblclick`,this.handleDelegatedDoubleClick.bind(this)),this.addListener(document,`keydown`,this.handleKeyboard.bind(this))}handleDelegatedInput(e){e.target.classList.contains(`file-manager__search-input`)&&this.handleSearch(e)}handleDelegatedKeyup(e){e.target.classList.contains(`file-manager__search-input`)&&this.handleSearchKeyup(e)}handleDelegatedClick(e){let t=e.target;if(t.classList.contains(`file-manager__view-btn`)||t.closest(`.file-manager__view-btn`)){this.handleViewToggle(e);return}if(t.classList.contains(`file-manager__refresh-btn`)||t.closest(`.file-manager__refresh-btn`)){this.handleRefresh(e);return}if(t.classList.contains(`file-action-btn`)||t.closest(`.file-action-btn`)){this.handleFileAction(e);return}if(t.classList.contains(`bulk-action-btn`)||t.closest(`.bulk-action-btn`)){this.handleBulkAction(e);return}if(t.classList.contains(`pagination-btn`)||t.closest(`.pagination-btn`)){this.handlePagination(e);return}if(t.classList.contains(`sortable`)||t.closest(`.sortable`)){this.handleSort(e);return}if(t.classList.contains(`file-grid-item`)||t.closest(`.file-grid-item`)){this.handleItemClick(e);return}if(t.classList.contains(`file-list-item`)||t.closest(`.file-list-item`)){this.handleItemClick(e);return}}handleDelegatedChange(e){let t=e.target;t.classList.contains(`file-checkbox`)?this.handleFileSelection(e):t.classList.contains(`select-all-checkbox`)?this.handleSelectAll(e):t.classList.contains(`file-manager__sort-select`)&&this.handleSortSelectChange(e)}handleDelegatedDoubleClick(e){let t=e.target;(t.classList.contains(`file-grid-item`)||t.closest(`.file-grid-item`)||t.classList.contains(`file-list-item`)||t.closest(`.file-list-item`))&&this.handleItemDoubleClick(e)}handleSortSelectChange(e){let[t,n]=e.target.value.split(`_`);this.core.setSortBy(t,n)}handleSearch(e){let t=e.target;this.core.setSearchQuery(t.value)}handleSearchKeyup(e){let t=e;if(t.key===`Enter`){let e=t.target;this.core.setSearchQuery(e.value)}}handleViewToggle(e){e.preventDefault();let t=e.target.closest(`.file-manager__view-btn`)?.dataset.view;t&&this.core.setViewMode(t)}async handleRefresh(e){if(e.preventDefault(),this.core.isRefreshing())return;let t=e.target.closest(`.file-manager__refresh-btn`);t&&(t.disabled=!0,t.classList.add(`disabled`));try{window.folderManager&&typeof window.folderManager.refreshAll==`function`?await window.folderManager.refreshAll():window.fileManagerInstance&&typeof window.fileManagerInstance.refreshFromServer==`function`?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(e){console.error(`手動更新に失敗:`,e)}finally{t&&(t.disabled=!1,t.classList.remove(`disabled`))}}handleFileSelection(e){e.stopPropagation();let t=e.target.dataset.fileId;t&&this.core.toggleFileSelection(t)}handleSelectAll(e){e.stopPropagation(),this.core.toggleAllSelection()}async handleFileAction(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();let t=e.target.closest(`.file-action-btn`),n=t?.dataset.action,r=t?.dataset.fileId;if(!n||!r){console.warn(`FileManagerEvents: action または fileId が見つかりません`,{action:n,fileId:r});return}if(this.core.isRefreshing()||t.disabled||t.classList.contains(`disabled`))return;let i=`${n}:${r}`;if(this.processingActions.has(i))return;this.processingActions.add(i),t.disabled=!0,t.classList.add(`disabled`);let a=this.core.getCurrentPageFiles(),o=this.core.getFiles(),s=a.find(e=>e.id.toString()===r);if(!s){if(o.find(e=>e.id.toString()===r)){if(this.core.goToPageContainingFile(r)){if(s=this.core.getCurrentPageFiles().find(e=>e.id.toString()===r),!s){console.error(`FileManagerEvents: ページ移動後もファイルが見つかりません`,{fileId:r}),this.processingActions.delete(i),t.disabled=!1,t.classList.remove(`disabled`);return}}else{console.error(`FileManagerEvents: ページ移動に失敗しました`,{fileId:r}),this.processingActions.delete(i),t.disabled=!1,t.classList.remove(`disabled`);return}}else{console.error(`FileManagerEvents: ファイルが見つかりません`,{searchFileId:r,searchFileIdType:typeof r,currentPageAvailableIds:a.map(e=>e.id),allAvailableIds:o.map(e=>e.id),isRefreshing:this.core.isRefreshing(),note:`ファイルが完全に存在しません`}),this.processingActions.delete(i),t.disabled=!1,t.classList.remove(`disabled`);return}}try{switch(n){case`download`:await this.downloadFile(s.id.toString());break;case`share`:window.openShareModal&&window.openShareModal(r,s.name,s.comment||``);break;case`delete`:await this.deleteFile(s.id.toString());break;case`edit`:await this.editFile(s.id.toString());break;case`move`:await this.moveFile(s.id.toString());break;case`replace`:await this.replaceFile(s.id.toString())}}finally{this.processingActions.delete(i),t.isConnected&&(t.disabled=!1,t.classList.remove(`disabled`))}}handleBulkAction(e){switch(e.preventDefault(),e.target.closest(`.bulk-action-btn`)?.dataset.action){case`select-all`:this.selectAllFiles();break;case`delete`:this.deleteSelectedFiles();break;case`cancel`:this.core.clearSelection()}}handlePagination(e){e.preventDefault();let t=e.target.closest(`.pagination-btn`),n=parseInt(t?.dataset.page||`1`);isNaN(n)||this.core.setPage(n)}handleSort(e){e.preventDefault();let t=e.target.closest(`[data-sort]`)?.dataset.sort;if(!t)return;let[n,r]=this.core.getState().sortBy.split(`_`),i=`asc`;n===t&&r===`asc`&&(i=`desc`),this.core.setSortBy(t,i)}handleItemClick(e){let t=e.target;if(t.tagName===`INPUT`||t.tagName===`BUTTON`||t.closest(`.file-action-btn`))return;let n=t.closest(`.file-grid-item, .file-list-item`);if(!n||n.dataset.doubleClickProcessing===`true`)return;let r=n.dataset.fileId;r&&setTimeout(()=>{if(n.dataset.doubleClickProcessing!==`true`){let t=e;t.ctrlKey||t.metaKey||this.core.clearSelection(),this.core.toggleFileSelection(r)}},200)}async handleItemDoubleClick(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();let t=e.target.closest(`.file-grid-item, .file-list-item`);if(!t)return;let n=t.dataset.fileId,r=n?`download:${n}`:``;if(n&&!this.processingActions.has(r)){this.processingActions.add(r);try{await this.downloadFile(n)}finally{this.processingActions.delete(r)}}}handleKeyboard(e){let t=e;if(this.core.container.contains(document.activeElement))switch(t.key){case`Delete`:t.preventDefault(),this.deleteSelectedFiles();break;case`Enter`:t.preventDefault();break;case`Escape`:t.preventDefault(),this.core.clearSelection();break;case`a`:(t.ctrlKey||t.metaKey)&&(t.preventDefault(),this.core.toggleAllSelection())}}async downloadFile(e){let t=this.core.getFiles().find(t=>t.id.toString()===e);if(!t)return;let n=``;for(;;)try{let r=await u.verifyDownload(e,n);if(r.success&&r.data?.token){let n=document.createElement(`a`);n.href=`./download.php?id=${encodeURIComponent(e)}&key=${encodeURIComponent(r.data.token)}`,n.download=t.name||`download`,n.style.display=`none`,document.body.appendChild(n),n.click(),document.body.removeChild(n);return}let i=typeof r.error==`string`?r.error:void 0;if(i===`AUTH_REQUIRED`||i===`INVALID_KEY`){let r=await this.showDownloadAuthModal(t.name||`download`,e);if(!r||(n=(r.masterKey||r.downloadKey||``).trim(),!n))return;continue}await p(r.message||(typeof r.error==`string`?r.error:`ダウンロードエラー`));return}catch(e){console.error(`verifyDownload error`,e),await p(`ダウンロード処理でエラーが発生しました。`);return}}async showDownloadAuthModal(e,t){return new Promise(r=>{let a=document.getElementById(`downloadAuthModal`);if(!a){r(null);return}let o=a.querySelector(`#downloadTargetName`),s=a.querySelector(`#downloadAuthMasterKey`),c=a.querySelector(`#downloadAuthDlKey`),l=a.querySelector(`#downloadAuthFileId`),u=a.querySelector(`#downloadAuthConfirmBtn`);o&&(o.textContent=e),s&&(s.value=``),c&&(c.value=``),l&&(l.value=t);let d=()=>{let e=s?.value.trim()||void 0,t=c?.value.trim()||void 0;if(!e&&!t){window.showError?.(`マスターキーまたはダウンロードキーのどちらか一方を入力してください。`);return}p(),i(`downloadAuthModal`),r({masterKey:e,downloadKey:t})},f=()=>{p(),i(`downloadAuthModal`),r(null)},p=()=>{u?.removeEventListener(`click`,d),a.removeEventListener(`hidden.bs.modal`,f)};u?.addEventListener(`click`,d),a.addEventListener(`hidden.bs.modal`,f,{once:!0}),n(`downloadAuthModal`)})}selectAllFiles(){this.core.getFiles().forEach(e=>{this.core.getState().selectedFiles.add(e.id.toString())}),this.core.refresh()}async deleteFile(e){let t=this.core.getFiles().find(t=>t.id===e);if(!t)return;let n=await this.showDeleteAuthModal(t.name||`ファイル${e}`,e);if(n)try{let t=this.showProgressMessage(`削除中...`),r=n.masterKey||n.deleteKey||``,i=await u.verifyDelete(e,r);if(i.success&&i.data?.token){let n=await fetch(`./delete.php?id=${e}&key=${i.data.token}`,{method:`GET`,headers:{"X-Requested-With":`XMLHttpRequest`}});if(this.hideProgressMessage(t),n.ok){let e=await n.json();e.success?(setTimeout(async()=>{try{window.folderManager?await window.folderManager.refreshAll():window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(e){console.error(`個別削除: 更新処理エラー:`,e),window.location.reload()}},1e3),await p(`ファイルを削除しました。`)):await p(e.message||`ファイルの削除に失敗しました。`)}else await p(`削除処理でエラーが発生しました。`)}else{this.hideProgressMessage(t);let e=typeof i.error==`object`&&i.error?i.error.code:i.error,n=`ファイルの削除に失敗しました。`;e===`AUTH_REQUIRED`?n=`マスターキーまたは削除キーの入力が必要です。`:e===`INVALID_KEY`?n=`マスターキーまたは削除キーが正しくありません。`:i.message&&(n=i.message),await p(n)}}catch(e){console.error(`削除エラー:`,e),await p(`削除処理でシステムエラーが発生しました。`)}}async deleteSelectedFiles(){let e=this.core.getSelectedFiles();if(e.length===0){await p(`削除するファイルを選択してください。`);return}if(!await d(`選択した${e.length}件のファイルを削除しますか？この操作は取り消せません。`))return;let t=await f(`管理者マスターキーを入力してください:`);if(!t){await p(`削除処理がキャンセルされました。`);return}try{let n=this.showProgressMessage(`削除中... (0/${e.length})`),r=e.map(e=>e.id.toString()),i=await l.bulkDeleteFiles(r,t);if(this.hideProgressMessage(n),i.success&&i.data){let{summary:e,details:t}=i.data,n=`削除処理が完了しました。
`;n+=`成功: ${e.deleted_count}件\n`,e.failed_count>0&&(n+=`失敗: ${e.failed_count}件\n`),e.not_found_count>0&&(n+=`見つからない: ${e.not_found_count}件\n`),t.failed_files.length>0&&(n+=`
失敗したファイル:
`,t.failed_files.slice(0,5).forEach(e=>{n+=`- ${e.name}: ${e.reason}\n`}),t.failed_files.length>5&&(n+=`... 他${t.failed_files.length-5}件\n`)),setTimeout(async()=>{try{window.folderManager?await window.folderManager.refreshAll():window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(e){console.error(`一括削除: 更新処理エラー:`,e),window.location.reload()}},1e3),await p(n),this.core.clearSelection()}else{let e=typeof i.error==`object`&&i.error?i.error.code:i.error,t=`ファイルの削除に失敗しました。`;e===`MASTER_KEY_REQUIRED`?t=`マスターキーの入力が必要です。`:e===`INVALID_MASTER_KEY`?t=`マスターキーが正しくありません。`:e===`BULK_DELETE_DISABLED`?t=`一括削除機能が無効になっています。`:i.message&&(t=i.message),await p(t)}}catch(e){console.error(`一括削除エラー:`,e),await p(`削除処理でシステムエラーが発生しました。`)}}showProgressMessage(e){let t=document.createElement(`div`);return t.id=`bulk-delete-progress`,t.style.cssText=`
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ffffff;
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 20px 30px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      font-size: 16px;
      color: #333;
    `,t.textContent=e,document.body.appendChild(t),t}hideProgressMessage(e){e&&e.parentNode&&e.parentNode.removeChild(e)}async showDeleteAuthModal(e,t){return new Promise(r=>{let a=document.getElementById(`deleteAuthModal`);if(!a){r(null);return}let o=a.querySelector(`#deleteTargetName`),s=a.querySelector(`#deleteAuthMasterKey`),c=a.querySelector(`#deleteAuthDelKey`),l=a.querySelector(`#deleteAuthFileId`),u=a.querySelector(`#deleteAuthConfirmBtn`);o&&(o.textContent=e),s&&(s.value=``),c&&(c.value=``),l&&(l.value=t);let d=()=>{let e=s?.value.trim()||void 0,t=c?.value.trim()||void 0;if(!e&&!t){alert(`マスターキーまたは削除キーのどちらか一方を入力してください。`);return}p(),i(`deleteAuthModal`),r({masterKey:e,deleteKey:t})},f=()=>{p(),i(`deleteAuthModal`),r(null)},p=()=>{u?.removeEventListener(`click`,d),a.removeEventListener(`hidden.bs.modal`,f)};u?.addEventListener(`click`,d),a.addEventListener(`hidden.bs.modal`,f,{once:!0}),n(`deleteAuthModal`)})}async editFile(e){let t=this.core.getFiles().find(t=>t.id===e);t&&(typeof window.editFile==`function`?window.editFile(e,t.name,t.comment):await p(`編集機能が読み込まれていません。ページを再読み込みしてください。`))}async moveFile(e){this.core.getFiles().find(t=>t.id===e)&&(typeof window.moveFile==`function`?await window.moveFile(e):await p(`フォルダマネージャーが読み込まれていません。`))}async replaceFile(e){let t=this.core.getFiles().find(t=>t.id===e);t&&(typeof window.replaceFile==`function`?window.replaceFile(e,t.name):await p(`差し替え機能が読み込まれていません。ページを再読み込みしてください。`))}addListener(e,t,n){let r;r=typeof e==`string`?this.core.container.querySelector(e)||document.querySelector(e):e,r&&(r.addEventListener(t,n),this.eventListeners.push({element:r,event:t,handler:n}))}destroy(){this.eventListeners.forEach(({element:e,event:t,handler:n})=>{e.removeEventListener(t,n)}),this.eventListeners=[]}},_=class{core;renderer;events;container;isInitialized=!1;constructor(e,t={}){this.core=new m(e,t),this.renderer=new h(this.core),this.events=new g(this.core),this.core.setDependencies(this.renderer,this.events),this.container=this.core.container}init(){this.isInitialized||=(this.core.init(),!0)}setFiles(e){this.init(),this.core.setFiles(e)}getFiles(){return this.core.getFiles()}getFilteredFiles(){return this.core.getFilteredFiles()}getCurrentPage(){return this.core.getCurrentPage()}setPage(e){this.core.setPage(e)}setSearchQuery(e){this.core.setSearchQuery(e)}setSortBy(e,t){this.core.setSortBy(e,t)}setViewMode(e){this.core.setViewMode(e)}getViewMode(){return this.core.getViewMode()}getSelectedFiles(){return this.core.getSelectedFiles()}toggleFileSelection(e){this.core.toggleFileSelection(e)}toggleAllSelection(){this.core.toggleAllSelection()}clearSelection(){this.core.clearSelection()}updateFile(e,t){this.core.updateFile(e,t)}removeFile(e){this.core.removeFile(e)}addFile(e){if(!this.validateFileData(e)){console.error(`Invalid file data provided to addFile:`,e);return}this.core.addFile(e)}validateFileData(e){if(!e||typeof e!=`object`||!e.id||typeof e.id!=`string`&&typeof e.id!=`number`||!e.origin_file_name||typeof e.origin_file_name!=`string`||e.origin_file_name.trim()===``)return!1;let t=e.origin_file_name.trim();for(let e of[/\.\./,/[<>:"|?*]/,/^\./,/\0/,/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i])if(e.test(t))return console.warn(`Dangerous filename pattern detected:`,t),!1;return t.length>255?(console.warn(`Filename too long:`,t.length),!1):e.size!==void 0&&(typeof e.size!=`number`||e.size<0||e.size>10737418240)?(console.warn(`Invalid file size:`,e.size),!1):e.comment!==void 0&&(typeof e.comment!=`string`||e.comment.length>1024)?(console.warn(`Invalid comment:`,e.comment),!1):!0}refresh(){this.core.refresh()}async refreshFromServer(){await this.core.refreshFromServer()}getStats(){return this.core.getStats()}getState(){return this.core.getState()}destroy(){this.events.destroy(),this.core.destroy()}loadViewMode(){return this.core.loadViewMode()||`grid`}};c(()=>{s(),o(),v(),y(),b()});function v(){let e=document.getElementById(`fileManagerContainer`);if(window.fileData&&e){let t=new _(e,{itemsPerPage:12,defaultSort:`date_desc`});t.setFiles(window.fileData),window.fileManagerInstance=t}else S()}function y(){let e=document.getElementById(`statusMessage`);e&&setTimeout(()=>{e.style.opacity=`0`,setTimeout(()=>{e.style.display=`none`},300)},5e3)}function b(){let t=new URLSearchParams(window.location.search).get(`error`);if(t){let n,r=`エラー`;switch(t){case`expired`:r=`共有リンクエラー`,n=`この共有リンクは有効期限が切れています。`;break;case`limit_exceeded`:r=`ダウンロード制限エラー`,n=`このファイルは最大ダウンロード数に達しているため、ダウンロードできません。`;break;default:n=`不明なエラーが発生しました。`}e(`${r}: ${n}`,`error`),x()}}function x(){if(window.history&&window.history.replaceState){let e=window.location.pathname+window.location.search.replace(/[?&]error=[^&]*/,``).replace(/^&/,`?`);window.history.replaceState({},document.title,e)}}function S(){console.error(`❌ FileManager initialization failed: missing container or data`),e(`ファイル一覧の表示に問題があります。ページを再読み込みしてください。`,`error`)}