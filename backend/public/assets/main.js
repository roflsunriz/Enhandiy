import{a as l,m as S,n as w,j as _,h as b,r as $,i as M,o as P,q as v}from"./http-BZ2DqswS.js";import{a as F,A as y}from"./client-DVZPNxrq.js";import{s as d,b as L,c as I}from"./modal-FkhxqS4-.js";class x{container;state;renderer=null;events=null;refreshPromise=null;refreshRequested=!1;constructor(e,t={}){this.container=e,this.state={files:[],filteredFiles:[],currentPage:1,itemsPerPage:t.itemsPerPage||12,searchQuery:"",sortBy:t.defaultSort||"date_desc",viewMode:this.loadViewMode()||t.defaultView||"grid",selectedFiles:new Set,isLoading:!1,isRefreshing:!1}}setDependencies(e,t){this.renderer=e,this.events=t}loadViewMode(){try{return localStorage.getItem("fileManager_viewMode")||null}catch{return null}}saveViewMode(){try{localStorage.setItem("fileManager_viewMode",this.state.viewMode)}catch{}}init(){this.renderer&&this.renderer.init(),this.events&&this.events.init(),this.initializeUrlParamWatcher()}setFiles(e){this.state.files=e.map(t=>this.normalizeFileData(t)),this.applyFiltersAndSort(),this.render()}normalizeFileData(e){const t={...e};if(!t.name&&t.origin_file_name&&(t.name=t.origin_file_name),t.folder_id!==void 0&&t.folder_id!==null&&(t.folder_id=String(t.folder_id)),t.upload_date){if(typeof t.upload_date=="number"||/^\d+$/.test(t.upload_date)){const i=typeof t.upload_date=="number"?t.upload_date:parseInt(t.upload_date);t.upload_date=new Date(i<1e10?i*1e3:i).toISOString()}}else if(t.input_date){const i=typeof t.input_date=="number"?t.input_date:parseInt(t.input_date);t.upload_date=new Date(i*1e3).toISOString()}return typeof t.id=="number"&&(t.id=t.id.toString()),!t.type&&t.name&&(t.type=this.guessFileTypeFromName(t.name)),t}guessFileTypeFromName(e){const t=e.split(".").pop()?.toLowerCase()||"";return{jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",pdf:"application/pdf",txt:"text/plain",json:"application/json",js:"application/javascript",html:"text/html",css:"text/css",xml:"application/xml",zip:"application/zip",rar:"application/x-rar-compressed","7z":"application/x-7z-compressed",mp4:"video/mp4",avi:"video/x-msvideo",mp3:"audio/mpeg",wav:"audio/wav",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"}[t]||"application/octet-stream"}getFiles(){return[...this.state.files]}getFilteredFiles(){return[...this.state.filteredFiles]}getCurrentPage(){return this.state.currentPage}setPage(e){const t=this.getMaxPage();this.state.currentPage=Math.max(1,Math.min(e,t)),this.render()}getMaxPage(){return Math.ceil(this.state.filteredFiles.length/this.state.itemsPerPage)}setSearchQuery(e){this.state.searchQuery=e,this.state.currentPage=1,this.applyFiltersAndSort(),this.render()}setSortBy(e,t){this.state.sortBy=`${e}_${t}`,this.applyFiltersAndSort(),this.render()}setViewMode(e){this.state.viewMode=e,this.saveViewMode(),this.render()}getViewMode(){return this.state.viewMode}getSelectedFiles(){return this.state.files.filter(e=>this.state.selectedFiles.has(e.id.toString()))}toggleFileSelection(e){const t=e.toString();this.state.selectedFiles.has(t)?this.state.selectedFiles.delete(t):this.state.selectedFiles.add(t),this.render()}toggleAllSelection(){const e=this.getCurrentPageFiles();e.every(i=>this.state.selectedFiles.has(i.id.toString()))?e.forEach(i=>this.state.selectedFiles.delete(i.id.toString())):e.forEach(i=>this.state.selectedFiles.add(i.id.toString())),this.render()}clearSelection(){this.state.selectedFiles.clear(),this.render()}updateFile(e,t){const i=this.state.files.findIndex(s=>s.id===e);i!==-1&&(this.state.files[i]={...this.state.files[i],...t},this.applyFiltersAndSort(),this.render())}removeFile(e){this.state.files=this.state.files.filter(t=>t.id!==e),this.state.selectedFiles.delete(e),this.applyFiltersAndSort(),this.render()}addFile(e){this.state.files.push(e),this.applyFiltersAndSort(),this.render()}refresh(){this.applyFiltersAndSort(),this.render()}async refreshFromServer(){this.refreshRequested=!0,this.refreshPromise||(this.refreshPromise=this.runRefreshLoop().finally(()=>{this.refreshPromise=null})),await this.refreshPromise}async runRefreshLoop(){try{this.state.isRefreshing=!0,this.state.isLoading=!0,this.updateLoadingState();do this.refreshRequested=!1,await this.refreshOnce();while(this.refreshRequested)}finally{this.state.isRefreshing=!1,this.state.isLoading=!1,this.updateLoadingState()}}async refreshOnce(){try{const e=new URLSearchParams(window.location.search),t=e.get("folder")||"";if(e.has("folder")&&(e.get("folder")===""||e.get("folder")===null)){e.delete("folder");const s=window.location.pathname+(e.toString()?"?"+e.toString():"")+(window.location.hash||"");try{window.history.replaceState({},"",s)}catch{}}const i=await F.getFiles(t||void 0,{includeFolders:!0,includeBreadcrumb:!0});if(i.success&&i.data){const s=i.data;this.state.files=(s.files||[]).map(n=>this.normalizeFileData(n)),Array.isArray(s.folders)&&(window.folderData=s.folders),this.applyFiltersAndSort(),this.goToLatestFilePage(),this.render(),this.updateLoadingState()}else console.error("ファイルリスト更新エラー:",i.error||"データが無効です")}catch(e){console.error("ファイルリストの更新に失敗:",e)}}updateLoadingState(){if(this.state.isLoading||this.state.isRefreshing){this.container.classList.add("file-manager--loading"),this.container.querySelectorAll(".file-action-btn").forEach(i=>{i.disabled=!0,i.classList.add("disabled")});const t=this.container.querySelector(".file-manager__refresh-btn");t&&(t.disabled=!0,t.classList.add("disabled"))}else{this.container.classList.remove("file-manager--loading"),this.container.querySelectorAll(".file-action-btn").forEach(i=>{i.disabled=!1,i.classList.remove("disabled")});const t=this.container.querySelector(".file-manager__refresh-btn");t&&(t.disabled=!1,t.classList.remove("disabled"))}}isRefreshing(){return this.state.isRefreshing}initializeUrlParamWatcher(){this.checkUrlParams(),window.addEventListener("popstate",()=>{this.checkUrlParams()})}async checkUrlParams(){const e=new URLSearchParams(window.location.search);if(e.get("deleted")==="success"){await this.refreshFromServer(),window.folderManager&&await window.folderManager.refreshAll(),e.delete("deleted");const i=window.location.pathname+(e.toString()?"?"+e.toString():"");window.history.replaceState({},"",i)}}getStats(){const e=this.getSelectedFiles(),t=this.state.files.reduce((i,s)=>i+s.size,0);return{totalFiles:this.state.files.length,filteredFiles:this.state.filteredFiles.length,selectedFiles:e.length,totalSize:t}}getState(){return{...this.state}}goToPageContainingFile(e){const t=this.state.filteredFiles.findIndex(s=>s.id.toString()===e);if(t===-1)return console.warn("FileManagerCore: 指定されたファイルが見つかりません:",e),!1;const i=Math.floor(t/this.state.itemsPerPage)+1;return i!==this.state.currentPage?(this.setPage(i),!0):!1}goToLatestFilePage(){if(this.state.filteredFiles.length>0){const e=this.state.filteredFiles[0];this.goToPageContainingFile(e.id.toString())}}getCurrentPageFiles(){const e=(this.state.currentPage-1)*this.state.itemsPerPage,t=e+this.state.itemsPerPage;return this.state.filteredFiles.slice(e,t)}applyFiltersAndSort(){let e=[...this.state.files];if(this.state.searchQuery){const i=this.state.searchQuery.toLowerCase();e=e.filter(s=>{if(!s||typeof s.name!="string")return console.warn("Invalid file data (missing name):",s),!1;const n=s.name.toLowerCase().includes(i),a=s.comment&&typeof s.comment=="string"?s.comment.toLowerCase().includes(i):!1;return n||a})}e.sort((i,s)=>this.compareFiles(i,s)),this.state.filteredFiles=e;const t=this.getMaxPage();this.state.currentPage>t&&t>0&&(this.state.currentPage=t)}compareFiles(e,t){if(!e||!t)return console.warn("Invalid file data in comparison:",{a:e,b:t}),0;const[i,s]=this.state.sortBy.split("_"),n=s==="asc"?1:-1;try{switch(i){case"name":{const a=e.name||"",o=t.name||"";return a.localeCompare(o)*n}case"size":{const a=typeof e.size=="number"?e.size:0,o=typeof t.size=="number"?t.size:0;return(a-o)*n}case"date":{const a=new Date(e.upload_date||0).getTime(),o=new Date(t.upload_date||0).getTime();return(a-o)*n}case"type":{const a=e.type||"",o=t.type||"";return a.localeCompare(o)*n}default:return 0}}catch(a){return console.error("Error in file comparison:",a,{a:e,b:t}),0}}render(){this.renderer&&this.renderer.render()}destroy(){this.state.selectedFiles.clear()}}class k{core;constructor(e){this.core=e}init(){this.setupContainer()}setupContainer(){this.core.container.classList.contains("file-manager-v2")||this.core.container.classList.add("file-manager-v2"),this.core.container.innerHTML=`
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
              ${l.refresh(18)} 更新
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
    `}render(){this.updateViewMode(),this.renderFiles(),this.renderPagination(),this.renderStats(),this.renderBulkActions()}updateViewMode(){const e=this.core.getViewMode(),t=this.core.getState();this.core.container.querySelectorAll(".file-manager__view-btn").forEach(o=>{const r=o,c=r.dataset.view===e;r.setAttribute("aria-pressed",String(c)),c?r.classList.add("active"):r.classList.remove("active")});const s=this.core.container.querySelector(".file-manager__sort-select");s&&(s.value=t.sortBy);const n=this.core.container.querySelector(".file-manager__grid"),a=this.core.container.querySelector(".file-manager__list");e==="grid"?(n.style.display="grid",a.style.display="none"):(n.style.display="none",a.style.display="block"),this.updateSortIcons()}updateSortIcons(){const e=this.core.getState(),[t,i]=e.sortBy.split("_");this.core.container.querySelectorAll(".sort-icon").forEach(a=>{a.textContent=""});const n=this.core.container.querySelector(`[data-sort="${t}"] .sort-icon`);n&&(n.innerHTML=i==="asc"?` ${l.arrowUp(16)}`:` ${l.arrowDown(16)}`)}renderFiles(){const e=this.core.getCurrentPageFiles(),t=this.getVisibleFolders();this.core.getViewMode()==="grid"?this.renderGridView(e,t):this.renderListView(e,t)}renderGridView(e,t){const i=this.core.container.querySelector(".file-manager__grid");if(e.length===0&&t.length===0){i.innerHTML=this.createEmptyState();return}const s=t.length>0?`<div id="folder-grid" class="file-manager__folder-grid">${t.map(n=>this.createFolderGridItem(n)).join("")}</div>`:"";i.innerHTML=s+e.map(n=>this.createGridItem(n)).join("")}renderListView(e,t){const i=this.core.container.querySelector(".file-manager__list");if(e.length===0&&t.length===0){i.innerHTML=this.createEmptyState();return}const s=`
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
            ${window?.config?.folders_enabled?'<th class="file-list__folder">フォルダ</th>':""}
            <th class="file-list__downloads">DL数</th>
            <th class="file-list__actions">操作</th>
          </tr>
        </thead>
        <tbody class="file-manager__folder-list">
          ${t.map(n=>this.createFolderListItem(n)).join("")}
        </tbody>
        <tbody>
          ${e.map(n=>this.createListItem(n)).join("")}
        </tbody>
      </table>
    `;i.innerHTML=s}createGridItem(e){const t=this.core.getState().selectedFiles.has(e.id.toString()),i=S(e.type||"",20),s=this.formatFileSize(e.size),n=this.formatDate(e.upload_date||""),a=e.name||"",{baseName:o,extension:r}=this.splitFileName(a);return`
      <article class="file-grid-item ${t?"selected":""}" data-file-id="${e.id}">
        <div class="file-grid-item__checkbox">
          <input type="checkbox" ${t?"checked":""} class="file-checkbox" data-file-id="${e.id}" aria-label="${this.escapeHtml(e.name||"ファイル")}を選択">
        </div>

        <!-- アイコンとコメント部分（薄いねずみ色背景） -->
        <div class="file-grid-item__header">
          <div class="file-grid-item__icon">
            <span class="file-icon file-icon--${this.getFileTypeClass(e.type||"")}">${i}</span>
          </div>
          <div class="file-grid-item__name" title="${this.escapeHtml(a)}" aria-label="${this.escapeHtml(a)}"><span class="file-grid-item__name-base">${this.escapeHtml(o)}</span>${r?`<span class="file-grid-item__name-extension">${this.escapeHtml(r)}</span>`:""}</div>
          ${e.comment?`<div class="file-grid-item__comment" title="${this.escapeHtml(e.comment)}">${this.escapeHtml(e.comment)}</div>`:""}
        </div>

        <!-- メタデータ部分（2x2 グリッド・アイコンラベル） -->
        <div class="file-grid-item__metadata metadata-grid">
          <div class="meta-item meta-item--size">${w.size(16)} <span class="meta-text">${s}</span></div>
          <div class="meta-item meta-item--downloads">${w.downloads(16)} <span class="meta-text">${this.formatDownloads(e)}</span></div>
          <div class="meta-item meta-item--date">${w.date(16)} <span class="meta-text">${n}</span></div>
          ${window?.config?.folders_enabled?`<div class="meta-item meta-item--folder">${w.folder(16)} <span class="meta-text">${this.getFolderPath(e.folder_id)}</span></div>`:""}
        </div>

        <!-- アクションボタン部分（二段構成） -->
        <div class="file-grid-item__actions">
          <div class="file-grid-item__actions-row">
            <button type="button" class="btn btn-xs btn-primary file-action-btn file-action-btn--download" data-action="download" data-file-id="${e.id}" title="ダウンロード" aria-label="${this.escapeHtml(e.name||"ファイル")}をダウンロード">
              ${l.download(14)} <span>保存</span>
            </button>
            <button type="button" class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有" aria-label="${this.escapeHtml(e.name||"ファイル")}を共有">
              ${l.share(14)} <span>共有</span>
            </button>
            ${window?.config?.folders_enabled?`
            <button type="button" class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${e.id}" title="移動" aria-label="${this.escapeHtml(e.name||"ファイル")}を移動">
              ${l.move(14)} <span>移動</span>
            </button>
            `:""}
            ${window?.config?.allow_comment_edit?`
            <button type="button" class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${e.id}" title="編集" aria-label="${this.escapeHtml(e.name||"ファイル")}を編集">
              ${l.edit(14)} <span>編集</span>
            </button>
            `:""}
          </div>
          <div class="file-grid-item__actions-row">
            ${window?.config?.allow_file_replace?`
            <button type="button" class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${e.id}" title="差し替え" aria-label="${this.escapeHtml(e.name||"ファイル")}を差し替え">
              ${l.replace(14)} <span>差し替え</span>
            </button>
            `:""}
            <button type="button" class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除" aria-label="${this.escapeHtml(e.name||"ファイル")}を削除">
              ${l.delete(14)} <span>削除</span>
            </button>
          </div>
        </div>
      </article>
    `}createFolderGridItem(e){const t=String(e.id),i=this.escapeHtml(e.name),s=Number(e.file_count||0);return`
      <article class="folder-grid-item" data-folder-id="${this.escapeHtml(t)}">
        <div class="folder-item-wrapper">
          <a href="?folder=${encodeURIComponent(t)}" class="folder-item" data-folder-link="${this.escapeHtml(t)}">
            <span class="folder-icon">${l.move(24)}</span>
            <span class="folder-item__content">
              <span class="folder-name" title="${i}">${i}</span>
              <span class="folder-item__meta">${s}件のファイル</span>
            </span>
          </a>
          ${this.createFolderMenu(t,i)}
        </div>
      </article>
    `}createFolderListItem(e){const t=String(e.id),i=this.escapeHtml(e.name),s=this.formatDate(e.created_at||""),n=window.config?.folders_enabled?'<td class="file-list__folder">現在の場所</td>':"";return`
      <tr class="folder-list-item" data-folder-id="${this.escapeHtml(t)}">
        <td class="file-list__select" aria-hidden="true"></td>
        <td class="file-list__name">
          <a href="?folder=${encodeURIComponent(t)}" class="folder-item folder-item--list" data-folder-link="${this.escapeHtml(t)}">
            <span class="folder-icon">${l.move(20)}</span>
            <span class="folder-name" title="${i}">${i}</span>
          </a>
        </td>
        <td class="file-list__size">フォルダ</td>
        <td class="file-list__date">${s}</td>
        ${n}
        <td class="file-list__downloads">${Number(e.file_count||0)}</td>
        <td class="file-list__actions folder-list__actions">${this.createFolderListActions(t,i)}</td>
      </tr>
    `}createFolderListActions(e,t){const i=this.escapeHtml(e);return`
      <div class="folder-list-actions" role="group" aria-label="${t}の操作">
        <button type="button" class="btn folder-action-btn rename-folder"
                data-folder-id="${i}" data-folder-action="rename"
                title="名前変更" aria-label="${t}の名前を変更">
          ${l.edit(16)} <span>名前変更</span>
        </button>
        <button type="button" class="btn folder-action-btn move-folder"
                data-folder-id="${i}" data-folder-action="move"
                title="移動" aria-label="${t}を移動">
          ${l.move(16)} <span>移動</span>
        </button>
        <button type="button" class="btn folder-action-btn folder-action-btn--delete delete-folder"
                data-folder-id="${i}" data-folder-action="delete"
                title="削除" aria-label="${t}を削除">
          ${l.delete(16)} <span>削除</span>
        </button>
      </div>
    `}createFolderMenu(e,t){return`
      <div class="folder-menu dropdown">
        <button class="btn btn-sm btn-secondary dropdown-toggle dropdown-toggle--icon" type="button"
                data-bs-toggle="dropdown" aria-expanded="false" aria-label="${t}の操作">
          <span aria-hidden="true">⋯</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end dropdown-menu--narrow">
          <li><a class="dropdown-item rename-folder" href="#" data-folder-id="${this.escapeHtml(e)}">${l.edit(16)} 名前変更</a></li>
          <li><a class="dropdown-item move-folder" href="#" data-folder-id="${this.escapeHtml(e)}">${l.move(16)} 移動</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item delete-folder text-danger-soft" href="#" data-folder-id="${this.escapeHtml(e)}">${l.delete(16)} 削除</a></li>
        </ul>
      </div>
    `}createEmptyState(){return`
      <div class="file-manager__empty">
        <div class="file-manager__empty-state">
          <span class="file-manager__empty-icon" aria-hidden="true">${l.move(26)}</span>
          <h3 class="file-manager__empty-title">この場所は空です</h3>
          <p class="file-manager__empty-description">ファイルをドロップするか、新しいフォルダを作成してください。</p>
        </div>
      </div>
    `}createListItem(e){const t=this.core.getState().selectedFiles.has(e.id.toString()),i=this.getFileIcon(e.type||""),s=this.formatFileSize(e.size),n=this.formatDate(e.upload_date||"");return`
      <tr class="file-list-item ${t?"selected":""}" data-file-id="${e.id}">
        <td class="file-list__select">
          <input type="checkbox" ${t?"checked":""} class="file-checkbox" data-file-id="${e.id}">
        </td>
        <td class="file-list__name">
          <span class="file-icon file-icon--${this.getFileTypeClass(e.type||"")}">${i}</span>
          <span class="file-name" title="${this.escapeHtml(e.name||"")}">${this.escapeHtml(e.name||"")}</span>
          ${e.comment?`<div class="file-comment">${this.escapeHtml(e.comment)}</div>`:""}
        </td>
        <td class="file-list__size">${s}</td>
        <td class="file-list__date">${n}</td>
        ${window?.config?.folders_enabled?`<td class="file-list__folder">${this.getFolderPath(e.folder_id)}</td>`:""}
        <td class="file-list__downloads">${this.formatDownloads(e)}</td>
        <td class="file-list__actions">
          <button class="btn btn-xs btn-primary file-action-btn file-action-btn--download" data-action="download" data-file-id="${e.id}" title="ダウンロード">
            ${l.download(18)}
          </button>
          <button class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有">
            ${l.share(18)}
          </button>
          ${window?.config?.allow_comment_edit?`
          <button class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${e.id}" title="編集">
            ${l.edit(18)}
          </button>
          `:""}
          ${window?.config?.folders_enabled?`
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${e.id}" title="移動">
            ${l.move(18)}
          </button>
          `:""}
          ${window?.config?.allow_file_replace?`
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${e.id}" title="差し替え">
            ${l.replace(18)}
          </button>
          `:""}
          <button class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除">
            ${l.delete(18)}
          </button>
        </td>
      </tr>
    `}renderPagination(){const e=this.core.getStats(),t=this.core.getCurrentPage(),i=this.core.getMaxPage(),s=this.core.container.querySelector(".pagination__info"),n=this.core.container.querySelector(".pagination__controls"),a=(t-1)*this.core.getState().itemsPerPage+1,o=Math.min(t*this.core.getState().itemsPerPage,e.filteredFiles);if(s.textContent=`${a}-${o} / ${e.filteredFiles}件`,i<=1){n.innerHTML="";return}let r="";r+=`
      <button class="pagination-btn pagination-btn--prev" ${t<=1?"disabled":""} data-page="${t-1}">
        ← 前
      </button>
    `;const c=Math.max(1,t-2),h=Math.min(i,t+2);for(let u=c;u<=h;u++)r+=`
        <button class="pagination-btn pagination-btn--number ${u===t?"active":""}" data-page="${u}">
          ${u}
        </button>
      `;r+=`
      <button class="pagination-btn pagination-btn--next" ${t>=i?"disabled":""} data-page="${t+1}">
        次 →
      </button>
    `,n.innerHTML=r}renderStats(){const e=this.core.getStats(),t=this.core.container.querySelector(".file-manager__stats-text");let s=`${this.getVisibleFolders().length}フォルダ・${e.totalFiles}ファイル`;e.filteredFiles!==e.totalFiles&&(s+=` (${e.filteredFiles}件表示)`),e.selectedFiles>0&&(s+=` | ${e.selectedFiles}件選択中`),t.textContent=s}renderBulkActions(){const e=this.core.getStats().selectedFiles,t=this.core.container.querySelector(".file-manager__bulk-actions");e>0?t.style.display="block":t.style.display="none"}getFileIcon(e){return""}getVisibleFolders(){if(!window.config?.folders_enabled||!Array.isArray(window.folderData))return[];const e=new URLSearchParams(window.location.search).get("folder"),t=this.core.getState().searchQuery.trim().toLocaleLowerCase("ja");return window.folderData.filter(i=>(i.parent_id===void 0||i.parent_id===null||i.parent_id===""?null:String(i.parent_id))===e).filter(i=>!t||i.name.toLocaleLowerCase("ja").includes(t)).sort((i,s)=>i.name.localeCompare(s.name,"ja",{numeric:!0,sensitivity:"base"}))}getFileTypeClass(e){return e?e.startsWith("image/")?"image":e.startsWith("video/")?"video":e.startsWith("audio/")?"audio":e.includes("pdf")?"pdf":e.includes("zip")||e.includes("archive")||e.includes("compressed")?"archive":e.includes("text")||e.includes("plain")?"text":e.includes("javascript")||e.includes("json")?"code":e.includes("html")||e.includes("xml")?"web":e.includes("word")||e.includes("document")?"document":e.includes("excel")||e.includes("sheet")?"spreadsheet":e.includes("powerpoint")||e.includes("presentation")?"presentation":"file":"file"}formatFileSize(e){if(!e||e===0)return"0 B";const t=["B","KB","MB","GB","TB","PB"];let i=e,s=0;for(;i>=1024&&s<t.length-1;)i/=1024,s++;let n=0;return s>0&&(i<10?n=2:i<100&&(n=1)),`${i.toFixed(n)} ${t[s]}`}formatDate(e){if(!e)return"不明";let t;if(typeof e=="number"||/^\d+$/.test(e)){const i=typeof e=="number"?e:parseInt(e);t=new Date(i<1e10?i*1e3:i)}else if(typeof e=="string")if(e.includes(" ")){const i=e.split(" ");if(i.length===2){const[s,n]=i,a=`${s}T${n}`;t=new Date(a)}else t=new Date(e)}else t=new Date(e);else t=new Date(e);if(isNaN(t.getTime()))return console.warn("Invalid date format:",e),"不明";try{return t.toLocaleDateString("ja-JP",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch(i){return console.error("Date formatting error:",i,e),"不明"}}escapeHtml(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}splitFileName(e){const t=e.lastIndexOf(".");return t<=0||t===e.length-1?{baseName:e,extension:""}:{baseName:e.slice(0,t),extension:e.slice(t)}}getFolderPath(e){if(!e)return"ルート";const t=window.folderData||[],i=(n,a)=>{for(const o of n){const r=o;if(String(r.id)===String(a))return r;if(r.children){const c=i(r.children,a);if(c)return c}}return null};return i(t,String(e))?.name||"不明なフォルダ"}formatDownloads(e){return e.count&&typeof e.count=="number"?`${e.count}回`:e.share_downloads&&typeof e.share_downloads=="number"?`${e.share_downloads}回`:e.share_key?"共有中":"0回"}}class A{core;eventListeners=[];processingActions=new Set;constructor(e){this.core=e}init(){this.bindEvents()}reinitializeEvents(){this.core.container.querySelector(".file-action-btn")||console.warn("FileManagerEvents: アクションボタンが見つかりません"),this.destroy(),this.init()}bindEvents(){this.addListener(this.core.container,"input",this.handleDelegatedInput.bind(this)),this.addListener(this.core.container,"keyup",this.handleDelegatedKeyup.bind(this)),this.addListener(this.core.container,"click",this.handleDelegatedClick.bind(this)),this.addListener(this.core.container,"change",this.handleDelegatedChange.bind(this)),this.addListener(this.core.container,"dblclick",this.handleDelegatedDoubleClick.bind(this)),this.addListener(document,"keydown",this.handleKeyboard.bind(this))}handleDelegatedInput(e){e.target.classList.contains("file-manager__search-input")&&this.handleSearch(e)}handleDelegatedKeyup(e){e.target.classList.contains("file-manager__search-input")&&this.handleSearchKeyup(e)}handleDelegatedClick(e){const t=e.target;if(t.classList.contains("file-manager__view-btn")||t.closest(".file-manager__view-btn")){this.handleViewToggle(e);return}if(t.classList.contains("file-manager__refresh-btn")||t.closest(".file-manager__refresh-btn")){this.handleRefresh(e);return}if(t.classList.contains("file-action-btn")||t.closest(".file-action-btn")){this.handleFileAction(e);return}if(t.classList.contains("bulk-action-btn")||t.closest(".bulk-action-btn")){this.handleBulkAction(e);return}if(t.classList.contains("pagination-btn")||t.closest(".pagination-btn")){this.handlePagination(e);return}if(t.classList.contains("sortable")||t.closest(".sortable")){this.handleSort(e);return}if(t.classList.contains("file-grid-item")||t.closest(".file-grid-item")){this.handleItemClick(e);return}if(t.classList.contains("file-list-item")||t.closest(".file-list-item")){this.handleItemClick(e);return}}handleDelegatedChange(e){const t=e.target;t.classList.contains("file-checkbox")?this.handleFileSelection(e):t.classList.contains("select-all-checkbox")?this.handleSelectAll(e):t.classList.contains("file-manager__sort-select")&&this.handleSortSelectChange(e)}handleDelegatedDoubleClick(e){const t=e.target;t.classList.contains("file-grid-item")||t.closest(".file-grid-item")?this.handleItemDoubleClick(e):(t.classList.contains("file-list-item")||t.closest(".file-list-item"))&&this.handleItemDoubleClick(e)}handleSortSelectChange(e){const t=e.target,[i,s]=t.value.split("_");this.core.setSortBy(i,s)}handleSearch(e){const t=e.target;this.core.setSearchQuery(t.value)}handleSearchKeyup(e){const t=e;if(t.key==="Enter"){const i=t.target;this.core.setSearchQuery(i.value)}}handleViewToggle(e){e.preventDefault();const i=e.target.closest(".file-manager__view-btn")?.dataset.view;i&&this.core.setViewMode(i)}async handleRefresh(e){if(e.preventDefault(),this.core.isRefreshing())return;const t=e.target.closest(".file-manager__refresh-btn");t&&(t.disabled=!0,t.classList.add("disabled"));try{window.folderManager&&typeof window.folderManager.refreshAll=="function"?await window.folderManager.refreshAll():window.fileManagerInstance&&typeof window.fileManagerInstance.refreshFromServer=="function"?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(i){console.error("手動更新に失敗:",i)}finally{t&&(t.disabled=!1,t.classList.remove("disabled"))}}handleFileSelection(e){e.stopPropagation();const i=e.target.dataset.fileId;i&&this.core.toggleFileSelection(i)}handleSelectAll(e){e.stopPropagation(),this.core.toggleAllSelection()}async handleFileAction(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();const t=e.target.closest(".file-action-btn"),i=t?.dataset.action,s=t?.dataset.fileId;if(!i||!s){console.warn("FileManagerEvents: action または fileId が見つかりません",{action:i,fileId:s});return}if(this.core.isRefreshing()||t.disabled||t.classList.contains("disabled"))return;const n=`${i}:${s}`;if(this.processingActions.has(n))return;this.processingActions.add(n),t.disabled=!0,t.classList.add("disabled");const a=this.core.getCurrentPageFiles(),o=this.core.getFiles();let r=a.find(c=>c.id.toString()===s);if(!r)if(o.find(h=>h.id.toString()===s))if(this.core.goToPageContainingFile(s)){if(r=this.core.getCurrentPageFiles().find(g=>g.id.toString()===s),!r){console.error("FileManagerEvents: ページ移動後もファイルが見つかりません",{fileId:s}),this.processingActions.delete(n),t.disabled=!1,t.classList.remove("disabled");return}}else{console.error("FileManagerEvents: ページ移動に失敗しました",{fileId:s}),this.processingActions.delete(n),t.disabled=!1,t.classList.remove("disabled");return}else{console.error("FileManagerEvents: ファイルが見つかりません",{searchFileId:s,searchFileIdType:typeof s,currentPageAvailableIds:a.map(h=>h.id),allAvailableIds:o.map(h=>h.id),isRefreshing:this.core.isRefreshing(),note:"ファイルが完全に存在しません"}),this.processingActions.delete(n),t.disabled=!1,t.classList.remove("disabled");return}try{switch(i){case"download":await this.downloadFile(r.id.toString());break;case"share":window.openShareModal&&window.openShareModal(s,r.name,r.comment||"");break;case"delete":await this.deleteFile(r.id.toString());break;case"edit":await this.editFile(r.id.toString());break;case"move":await this.moveFile(r.id.toString());break;case"replace":await this.replaceFile(r.id.toString());break}}finally{this.processingActions.delete(n),t.isConnected&&(t.disabled=!1,t.classList.remove("disabled"))}}handleBulkAction(e){switch(e.preventDefault(),e.target.closest(".bulk-action-btn")?.dataset.action){case"select-all":this.selectAllFiles();break;case"delete":this.deleteSelectedFiles();break;case"cancel":this.core.clearSelection();break}}handlePagination(e){e.preventDefault();const t=e.target.closest(".pagination-btn"),i=parseInt(t?.dataset.page||"1");isNaN(i)||this.core.setPage(i)}handleSort(e){e.preventDefault();const i=e.target.closest("[data-sort]")?.dataset.sort;if(!i)return;const s=this.core.getState().sortBy,[n,a]=s.split("_");let o="asc";n===i&&a==="asc"&&(o="desc"),this.core.setSortBy(i,o)}handleItemClick(e){const t=e.target;if(t.tagName==="INPUT"||t.tagName==="BUTTON"||t.closest(".file-action-btn"))return;const i=t.closest(".file-grid-item, .file-list-item");if(!i||i.dataset.doubleClickProcessing==="true")return;const s=i.dataset.fileId;s&&setTimeout(()=>{if(i.dataset.doubleClickProcessing!=="true"){const n=e;n.ctrlKey||n.metaKey?this.core.toggleFileSelection(s):(this.core.clearSelection(),this.core.toggleFileSelection(s))}},200)}async handleItemDoubleClick(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();const t=e.target.closest(".file-grid-item, .file-list-item");if(!t)return;const i=t.dataset.fileId,s=i?`download:${i}`:"";if(!(!i||this.processingActions.has(s))){this.processingActions.add(s);try{await this.downloadFile(i)}finally{this.processingActions.delete(s)}}}handleKeyboard(e){const t=e;if(this.core.container.contains(document.activeElement))switch(t.key){case"Delete":t.preventDefault(),this.deleteSelectedFiles();break;case"Enter":t.preventDefault();break;case"Escape":t.preventDefault(),this.core.clearSelection();break;case"a":(t.ctrlKey||t.metaKey)&&(t.preventDefault(),this.core.toggleAllSelection());break}}async downloadFile(e){const t=this.core.getFiles().find(s=>s.id.toString()===e);if(!t)return;let i="";for(;;)try{const s=await y.verifyDownload(e,i);if(s.success&&s.data?.token){const a=document.createElement("a");a.href=`./download.php?id=${encodeURIComponent(e)}&key=${encodeURIComponent(s.data.token)}`,a.download=t.name||"download",a.style.display="none",document.body.appendChild(a),a.click(),document.body.removeChild(a);return}const n=typeof s.error=="string"?s.error:void 0;if(n==="AUTH_REQUIRED"||n==="INVALID_KEY"){const a=await this.showDownloadAuthModal(t.name||"download",e);if(!a||(i=(a.masterKey||a.downloadKey||"").trim(),!i))return;continue}await d(s.message||(typeof s.error=="string"?s.error:"ダウンロードエラー"));return}catch(s){console.error("verifyDownload error",s),await d("ダウンロード処理でエラーが発生しました。");return}}async showDownloadAuthModal(e,t){return new Promise(i=>{const s=document.getElementById("downloadAuthModal");if(!s){i(null);return}const n=s.querySelector("#downloadTargetName"),a=s.querySelector("#downloadAuthMasterKey"),o=s.querySelector("#downloadAuthDlKey"),r=s.querySelector("#downloadAuthFileId"),c=s.querySelector("#downloadAuthConfirmBtn");n&&(n.textContent=e),a&&(a.value=""),o&&(o.value=""),r&&(r.value=t);const h=()=>{const m=a?.value.trim()||void 0,p=o?.value.trim()||void 0;if(!m&&!p){window.showError?.("マスターキーまたはダウンロードキーのどちらか一方を入力してください。");return}g(),b("downloadAuthModal"),i({masterKey:m,downloadKey:p})},u=()=>{g(),b("downloadAuthModal"),i(null)},g=()=>{c?.removeEventListener("click",h),s.removeEventListener("hidden.bs.modal",u)};c?.addEventListener("click",h),s.addEventListener("hidden.bs.modal",u,{once:!0}),_("downloadAuthModal")})}selectAllFiles(){this.core.getFiles().forEach(t=>{this.core.getState().selectedFiles.add(t.id.toString())}),this.core.refresh()}async deleteFile(e){const t=this.core.getFiles().find(s=>s.id===e);if(!t)return;const i=await this.showDeleteAuthModal(t.name||`ファイル${e}`,e);if(i)try{const s=this.showProgressMessage("削除中..."),n=i.masterKey||i.deleteKey||"",a=await y.verifyDelete(e,n);if(a.success&&a.data?.token){const o=await fetch(`./delete.php?id=${e}&key=${a.data.token}`,{method:"GET",headers:{"X-Requested-With":"XMLHttpRequest"}});if(this.hideProgressMessage(s),o.ok){const r=await o.json();r.success?(setTimeout(async()=>{try{window.folderManager?await window.folderManager.refreshAll():window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(c){console.error("個別削除: 更新処理エラー:",c),window.location.reload()}},1e3),await d("ファイルを削除しました。")):await d(r.message||"ファイルの削除に失敗しました。")}else await d("削除処理でエラーが発生しました。")}else{this.hideProgressMessage(s);const o=typeof a.error=="object"&&a.error?a.error.code:a.error;let r="ファイルの削除に失敗しました。";o==="AUTH_REQUIRED"?r="マスターキーまたは削除キーの入力が必要です。":o==="INVALID_KEY"?r="マスターキーまたは削除キーが正しくありません。":a.message&&(r=a.message),await d(r)}}catch(s){console.error("削除エラー:",s),await d("削除処理でシステムエラーが発生しました。")}}async deleteSelectedFiles(){const e=this.core.getSelectedFiles();if(e.length===0){await d("削除するファイルを選択してください。");return}if(!await L(`選択した${e.length}件のファイルを削除しますか？この操作は取り消せません。`))return;const t=await I("管理者マスターキーを入力してください:");if(!t){await d("削除処理がキャンセルされました。");return}try{const i=this.showProgressMessage(`削除中... (0/${e.length})`),s=e.map(a=>a.id.toString()),n=await F.bulkDeleteFiles(s,t);if(this.hideProgressMessage(i),n.success&&n.data){const{summary:a,details:o}=n.data;let r=`削除処理が完了しました。
`;r+=`成功: ${a.deleted_count}件
`,a.failed_count>0&&(r+=`失敗: ${a.failed_count}件
`),a.not_found_count>0&&(r+=`見つからない: ${a.not_found_count}件
`),o.failed_files.length>0&&(r+=`
失敗したファイル:
`,o.failed_files.slice(0,5).forEach(c=>{r+=`- ${c.name}: ${c.reason}
`}),o.failed_files.length>5&&(r+=`... 他${o.failed_files.length-5}件
`)),setTimeout(async()=>{try{window.folderManager?await window.folderManager.refreshAll():window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(c){console.error("一括削除: 更新処理エラー:",c),window.location.reload()}},1e3),await d(r),this.core.clearSelection()}else{const a=typeof n.error=="object"&&n.error?n.error.code:n.error;let o="ファイルの削除に失敗しました。";a==="MASTER_KEY_REQUIRED"?o="マスターキーの入力が必要です。":a==="INVALID_MASTER_KEY"?o="マスターキーが正しくありません。":a==="BULK_DELETE_DISABLED"?o="一括削除機能が無効になっています。":n.message&&(o=n.message),await d(o)}}catch(i){console.error("一括削除エラー:",i),await d("削除処理でシステムエラーが発生しました。")}}showProgressMessage(e){const t=document.createElement("div");return t.id="bulk-delete-progress",t.style.cssText=`
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
    `,t.textContent=e,document.body.appendChild(t),t}hideProgressMessage(e){e&&e.parentNode&&e.parentNode.removeChild(e)}async showDeleteAuthModal(e,t){return new Promise(i=>{const s=document.getElementById("deleteAuthModal");if(!s){i(null);return}const n=s.querySelector("#deleteTargetName"),a=s.querySelector("#deleteAuthMasterKey"),o=s.querySelector("#deleteAuthDelKey"),r=s.querySelector("#deleteAuthFileId"),c=s.querySelector("#deleteAuthConfirmBtn");n&&(n.textContent=e),a&&(a.value=""),o&&(o.value=""),r&&(r.value=t);const h=()=>{const m=a?.value.trim()||void 0,p=o?.value.trim()||void 0;if(!m&&!p){alert("マスターキーまたは削除キーのどちらか一方を入力してください。");return}g(),b("deleteAuthModal"),i({masterKey:m,deleteKey:p})},u=()=>{g(),b("deleteAuthModal"),i(null)},g=()=>{c?.removeEventListener("click",h),s.removeEventListener("hidden.bs.modal",u)};c?.addEventListener("click",h),s.addEventListener("hidden.bs.modal",u,{once:!0}),_("deleteAuthModal")})}async editFile(e){const t=this.core.getFiles().find(i=>i.id===e);t&&(typeof window.editFile=="function"?window.editFile(e,t.name,t.comment):await d("編集機能が読み込まれていません。ページを再読み込みしてください。"))}async moveFile(e){this.core.getFiles().find(i=>i.id===e)&&(typeof window.moveFile=="function"?await window.moveFile(e):await d("フォルダマネージャーが読み込まれていません。"))}async replaceFile(e){const t=this.core.getFiles().find(i=>i.id===e);t&&(typeof window.replaceFile=="function"?window.replaceFile(e,t.name):await d("差し替え機能が読み込まれていません。ページを再読み込みしてください。"))}addListener(e,t,i){let s=null;typeof e=="string"?s=this.core.container.querySelector(e)||document.querySelector(e):s=e,s&&(s.addEventListener(t,i),this.eventListeners.push({element:s,event:t,handler:i}))}destroy(){this.eventListeners.forEach(({element:e,event:t,handler:i})=>{e.removeEventListener(t,i)}),this.eventListeners=[]}}class D{core;renderer;events;container;isInitialized=!1;constructor(e,t={}){this.core=new x(e,t),this.renderer=new k(this.core),this.events=new A(this.core),this.core.setDependencies(this.renderer,this.events),this.container=this.core.container}init(){this.isInitialized||(this.core.init(),this.isInitialized=!0)}setFiles(e){this.init(),this.core.setFiles(e)}getFiles(){return this.core.getFiles()}getFilteredFiles(){return this.core.getFilteredFiles()}getCurrentPage(){return this.core.getCurrentPage()}setPage(e){this.core.setPage(e)}setSearchQuery(e){this.core.setSearchQuery(e)}setSortBy(e,t){this.core.setSortBy(e,t)}setViewMode(e){this.core.setViewMode(e)}getViewMode(){return this.core.getViewMode()}getSelectedFiles(){return this.core.getSelectedFiles()}toggleFileSelection(e){this.core.toggleFileSelection(e)}toggleAllSelection(){this.core.toggleAllSelection()}clearSelection(){this.core.clearSelection()}updateFile(e,t){this.core.updateFile(e,t)}removeFile(e){this.core.removeFile(e)}addFile(e){if(!this.validateFileData(e)){console.error("Invalid file data provided to addFile:",e);return}this.core.addFile(e)}validateFileData(e){if(!e||typeof e!="object"||!e.id||typeof e.id!="string"&&typeof e.id!="number"||!e.origin_file_name||typeof e.origin_file_name!="string"||e.origin_file_name.trim()==="")return!1;const t=e.origin_file_name.trim(),i=[/\.\./,/[<>:"|?*]/,/^\./,/\0/,/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i];for(const s of i)if(s.test(t))return console.warn("Dangerous filename pattern detected:",t),!1;return t.length>255?(console.warn("Filename too long:",t.length),!1):e.size!==void 0&&(typeof e.size!="number"||e.size<0||e.size>10*1024*1024*1024)?(console.warn("Invalid file size:",e.size),!1):e.comment!==void 0&&(typeof e.comment!="string"||e.comment.length>1024)?(console.warn("Invalid comment:",e.comment),!1):!0}refresh(){this.core.refresh()}async refreshFromServer(){await this.core.refreshFromServer()}getStats(){return this.core.getStats()}getState(){return this.core.getState()}destroy(){this.events.destroy(),this.core.destroy()}loadViewMode(){return this.core.loadViewMode()||"grid"}}$(()=>{M(),P(),C(),E(),z()});function C(){const f=document.getElementById("fileManagerContainer");if(window.fileData&&f){const e=new D(f,{itemsPerPage:12,defaultSort:"date_desc"});e.setFiles(window.fileData),window.fileManagerInstance=e}else H()}function E(){const f=document.getElementById("statusMessage");f&&setTimeout(()=>{f.style.opacity="0",setTimeout(()=>{f.style.display="none"},300)},5e3)}function z(){const e=new URLSearchParams(window.location.search).get("error");if(e){let t="",i="エラー";switch(e){case"expired":i="共有リンクエラー",t="この共有リンクは有効期限が切れています。";break;case"limit_exceeded":i="ダウンロード制限エラー",t="このファイルは最大ダウンロード数に達しているため、ダウンロードできません。";break;default:t="不明なエラーが発生しました。";break}v(`${i}: ${t}`,"error"),B()}}function B(){if(window.history&&window.history.replaceState){const f=window.location.pathname+window.location.search.replace(/[?&]error=[^&]*/,"").replace(/^&/,"?");window.history.replaceState({},document.title,f)}}function H(){console.error("❌ FileManager initialization failed: missing container or data"),v("ファイル一覧の表示に問題があります。ページを再読み込みしてください。","error")}
