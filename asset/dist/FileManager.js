import{A as m,S as _}from"./api-client.js";import{s as h,a as o,b as v,c as w}from"./modal.js";import{p}from"./http.js";import{b as c,c as f}from"./errorHandling.js";class F{container;state;renderer=null;events=null;constructor(e,t={}){this.container=e,this.state={files:[],filteredFiles:[],currentPage:1,itemsPerPage:t.itemsPerPage||12,searchQuery:"",sortBy:t.defaultSort||"date_desc",viewMode:this.loadViewMode()||t.defaultView||"grid",selectedFiles:new Set,isLoading:!1}}setDependencies(e,t){this.renderer=e,this.events=t}loadViewMode(){try{return localStorage.getItem("fileManager_viewMode")||null}catch{return null}}saveViewMode(){try{localStorage.setItem("fileManager_viewMode",this.state.viewMode)}catch{}}init(){this.renderer&&this.renderer.init(),this.events&&this.events.init()}setFiles(e){this.state.files=e.map(t=>this.normalizeFileData(t)),this.applyFiltersAndSort(),this.render()}normalizeFileData(e){const t={...e};return!t.name&&t.origin_file_name&&(t.name=t.origin_file_name),!t.upload_date&&t.input_date&&(t.upload_date=new Date(t.input_date*1e3).toISOString()),typeof t.id=="number"&&(t.id=t.id.toString()),!t.type&&t.name&&(t.type=this.guessFileTypeFromName(t.name)),t}guessFileTypeFromName(e){const t=e.split(".").pop()?.toLowerCase()||"";return{jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",pdf:"application/pdf",txt:"text/plain",json:"application/json",js:"application/javascript",html:"text/html",css:"text/css",xml:"application/xml",zip:"application/zip",rar:"application/x-rar-compressed","7z":"application/x-7z-compressed",mp4:"video/mp4",avi:"video/x-msvideo",mp3:"audio/mpeg",wav:"audio/wav",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"}[t]||"application/octet-stream"}getFiles(){return[...this.state.files]}getFilteredFiles(){return[...this.state.filteredFiles]}getCurrentPage(){return this.state.currentPage}setPage(e){const t=this.getMaxPage();this.state.currentPage=Math.max(1,Math.min(e,t)),this.render()}getMaxPage(){return Math.ceil(this.state.filteredFiles.length/this.state.itemsPerPage)}setSearchQuery(e){this.state.searchQuery=e,this.state.currentPage=1,this.applyFiltersAndSort(),this.render()}setSortBy(e,t){this.state.sortBy=`${e}_${t}`,this.applyFiltersAndSort(),this.render()}setViewMode(e){this.state.viewMode=e,this.saveViewMode(),this.render()}getViewMode(){return this.state.viewMode}getSelectedFiles(){return this.state.files.filter(e=>this.state.selectedFiles.has(e.id.toString()))}toggleFileSelection(e){const t=e.toString();this.state.selectedFiles.has(t)?this.state.selectedFiles.delete(t):this.state.selectedFiles.add(t),this.render()}toggleAllSelection(){const e=this.getCurrentPageFiles();e.every(i=>this.state.selectedFiles.has(i.id.toString()))?e.forEach(i=>this.state.selectedFiles.delete(i.id.toString())):e.forEach(i=>this.state.selectedFiles.add(i.id.toString())),this.render()}clearSelection(){this.state.selectedFiles.clear(),this.render()}updateFile(e,t){const i=this.state.files.findIndex(s=>s.id===e);i!==-1&&(this.state.files[i]={...this.state.files[i],...t},this.applyFiltersAndSort(),this.render())}removeFile(e){this.state.files=this.state.files.filter(t=>t.id!==e),this.state.selectedFiles.delete(e),this.applyFiltersAndSort(),this.render()}addFile(e){this.state.files.push(e),this.applyFiltersAndSort(),this.render()}refresh(){this.applyFiltersAndSort(),this.render()}getStats(){const e=this.getSelectedFiles(),t=this.state.files.reduce((i,s)=>i+s.size,0);return{totalFiles:this.state.files.length,filteredFiles:this.state.filteredFiles.length,selectedFiles:e.length,totalSize:t}}getState(){return{...this.state}}getCurrentPageFiles(){const e=(this.state.currentPage-1)*this.state.itemsPerPage,t=e+this.state.itemsPerPage;return this.state.filteredFiles.slice(e,t)}applyFiltersAndSort(){let e=[...this.state.files];if(this.state.searchQuery){const i=this.state.searchQuery.toLowerCase();e=e.filter(s=>{if(!s||typeof s.name!="string")return console.warn("Invalid file data (missing name):",s),!1;const n=s.name.toLowerCase().includes(i),a=s.comment&&typeof s.comment=="string"?s.comment.toLowerCase().includes(i):!1;return n||a})}e.sort((i,s)=>this.compareFiles(i,s)),this.state.filteredFiles=e;const t=this.getMaxPage();this.state.currentPage>t&&t>0&&(this.state.currentPage=t)}compareFiles(e,t){if(!e||!t)return console.warn("Invalid file data in comparison:",{a:e,b:t}),0;const[i,s]=this.state.sortBy.split("_"),n=s==="asc"?1:-1;try{switch(i){case"name":{const a=e.name||"",r=t.name||"";return a.localeCompare(r)*n}case"size":{const a=typeof e.size=="number"?e.size:0,r=typeof t.size=="number"?t.size:0;return(a-r)*n}case"date":{const a=new Date(e.upload_date||0).getTime(),r=new Date(t.upload_date||0).getTime();return(a-r)*n}case"type":{const a=e.type||"",r=t.type||"";return a.localeCompare(r)*n}default:return 0}}catch(a){return console.error("Error in file comparison:",a,{a:e,b:t}),0}}render(){this.renderer&&this.renderer.render()}destroy(){this.state.selectedFiles.clear()}}class y{core;constructor(e){this.core=e}init(){this.setupContainer(),this.render()}setupContainer(){this.core.container.classList.contains("file-manager-v2")||this.core.container.classList.add("file-manager-v2"),this.core.container.innerHTML=`
      <div class="file-manager__header">
        <div class="file-manager__controls">
          <div class="file-manager__search">
            <input type="text" class="file-manager__search-input" placeholder="ファイル名・コメントで検索">
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
            <button class="file-manager__view-btn" data-view="grid" title="グリッド表示">
              グリッド
            </button>
            <button class="file-manager__view-btn" data-view="list" title="リスト表示">
              リスト
            </button>
          </div>
        </div>
        <div class="file-manager__stats">
          <span class="file-manager__stats-text"></span>
        </div>
      </div>
      
      <div class="file-manager__bulk-actions" style="display: none;">
        <div class="bulk-actions__controls">
          <button class="bulk-action-btn bulk-action-btn--download" data-action="download">
            ダウンロード
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
    `}render(){this.updateViewMode(),this.renderFiles(),this.renderPagination(),this.renderStats(),this.renderBulkActions()}updateViewMode(){const e=this.core.getViewMode(),t=this.core.getState();this.core.container.querySelectorAll(".file-manager__view-btn").forEach(r=>{const l=r;l.dataset.view===e?l.classList.add("active"):l.classList.remove("active")});const s=this.core.container.querySelector(".file-manager__sort-select");s&&(s.value=t.sortBy);const n=this.core.container.querySelector(".file-manager__grid"),a=this.core.container.querySelector(".file-manager__list");e==="grid"?(n.style.display="grid",a.style.display="none"):(n.style.display="none",a.style.display="block"),this.updateSortIcons()}updateSortIcons(){const e=this.core.getState(),[t,i]=e.sortBy.split("_");this.core.container.querySelectorAll(".sort-icon").forEach(a=>{a.textContent=""});const n=this.core.container.querySelector(`[data-sort="${t}"] .sort-icon`);n&&(n.textContent=i==="asc"?" ↑":" ↓")}renderFiles(){const e=this.core.getCurrentPageFiles();this.core.getViewMode()==="grid"?this.renderGridView(e):this.renderListView(e)}renderGridView(e){const t=this.core.container.querySelector(".file-manager__grid");if(e.length===0){t.innerHTML='<div class="file-manager__empty">ファイルがありません</div>';return}t.innerHTML=e.map(i=>this.createGridItem(i)).join("")}renderListView(e){const t=this.core.container.querySelector(".file-manager__list");if(e.length===0){t.innerHTML='<div class="file-manager__empty">ファイルがありません</div>';return}const i=`
      <table class="file-list-table">
        <thead>
          <tr>
            <th class="file-list__select">
              <input type="checkbox" class="select-all-checkbox">
            </th>
            <th class="file-list__name sortable" data-sort="name">
              ファイル名 <span class="sort-icon"></span>
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
        <tbody>
          ${e.map(s=>this.createListItem(s)).join("")}
        </tbody>
      </table>
    `;t.innerHTML=i}createGridItem(e){const t=this.core.getState().selectedFiles.has(e.id.toString()),i=this.getFileIcon(e.type||""),s=this.formatFileSize(e.size),n=this.formatDate(e.upload_date||"");return`
      <div class="file-grid-item ${t?"selected":""}" data-file-id="${e.id}">
        <div class="file-grid-item__checkbox">
          <input type="checkbox" ${t?"checked":""} class="file-checkbox" data-file-id="${e.id}">
        </div>
        
        <!-- アイコンとコメント部分（薄いねずみ色背景） -->
        <div class="file-grid-item__header">
          <div class="file-grid-item__icon">
            <span class="file-icon file-icon--${this.getFileTypeClass(e.type||"")}">${i}</span>
          </div>
          <div class="file-grid-item__name" title="${this.escapeHtml(e.name||"")}">
            ${this.escapeHtml(this.truncateText(e.name||"",20))}
          </div>
          ${e.comment?`<div class="file-grid-item__comment">${this.escapeHtml(this.truncateText(e.comment,50))}</div>`:""}
        </div>
        
        <!-- メタデータ部分（白背景、二段構成） -->
        <div class="file-grid-item__metadata">
          <div class="file-grid-item__metadata-row">
            <div class="file-grid-item__size"><span class="meta-label">サイズ:</span> ${s}</div>
            <div class="file-grid-item__downloads"><span class="meta-label">DL:</span> ${this.formatDownloads(e)}</div>
          </div>
          <div class="file-grid-item__metadata-row">
            <div class="file-grid-item__date"><span class="meta-label">投稿:</span> ${n}</div>
            ${window?.config?.folders_enabled?`<div class="file-grid-item__folder"><span class="meta-label">場所:</span> ${this.getFolderPath(e.folder_id)}</div>`:""}
          </div>
        </div>
        
        <!-- アクションボタン部分（二段構成） -->
        <div class="file-grid-item__actions">
          <div class="file-grid-item__actions-row">
            <button class="btn btn-xs btn-primary file-action-btn file-action-btn--download" data-action="download" data-file-id="${e.id}" title="ダウンロード">
              ダウンロード
            </button>
            <button class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有">
              共有
            </button>
            ${window?.config?.folders_enabled?`
            <button class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${e.id}" title="移動">
              移動
            </button>
            `:""}
            ${window?.config?.allow_comment_edit?`
            <button class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${e.id}" title="編集">
              編集
            </button>
            `:""}
          </div>
          <div class="file-grid-item__actions-row">
            ${window?.config?.allow_file_replace?`
            <button class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${e.id}" title="差し替え">
              差し替え
            </button>
            `:""}
            <button class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除">
              削除
            </button>
          </div>
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
            ⬇
          </button>
          <button class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有">
            🔗
          </button>
          ${window?.config?.allow_comment_edit?`
          <button class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${e.id}" title="編集">
            ✏
          </button>
          `:""}
          ${window?.config?.folders_enabled?`
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${e.id}" title="移動">
            📁
          </button>
          `:""}
          ${window?.config?.allow_file_replace?`
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${e.id}" title="差し替え">
            🔄
          </button>
          `:""}
          <button class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除">
            🗑
          </button>
        </td>
      </tr>
    `}renderPagination(){const e=this.core.getStats(),t=this.core.getCurrentPage(),i=this.core.getMaxPage(),s=this.core.container.querySelector(".pagination__info"),n=this.core.container.querySelector(".pagination__controls"),a=(t-1)*this.core.getState().itemsPerPage+1,r=Math.min(t*this.core.getState().itemsPerPage,e.filteredFiles);if(s.textContent=`${a}-${r} / ${e.filteredFiles}件`,i<=1){n.innerHTML="";return}let l="";l+=`
      <button class="pagination-btn pagination-btn--prev" ${t<=1?"disabled":""} data-page="${t-1}">
        ← 前
      </button>
    `;const d=Math.max(1,t-2),b=Math.min(i,t+2);for(let u=d;u<=b;u++)l+=`
        <button class="pagination-btn pagination-btn--number ${u===t?"active":""}" data-page="${u}">
          ${u}
        </button>
      `;l+=`
      <button class="pagination-btn pagination-btn--next" ${t>=i?"disabled":""} data-page="${t+1}">
        次 →
      </button>
    `,n.innerHTML=l}renderStats(){const e=this.core.getStats(),t=this.core.container.querySelector(".file-manager__stats-text");let i=`${e.totalFiles}件のファイル`;e.filteredFiles!==e.totalFiles&&(i+=` (${e.filteredFiles}件表示)`),e.selectedFiles>0&&(i+=` | ${e.selectedFiles}件選択中`),t.textContent=i}renderBulkActions(){const e=this.core.getStats().selectedFiles,t=this.core.container.querySelector(".file-manager__bulk-actions");e>0?t.style.display="block":t.style.display="none"}getFileIcon(e){return e?e.startsWith("image/")?"🖼":e.startsWith("video/")?"🎥":e.startsWith("audio/")?"🎵":e.includes("pdf")?"📄":e.includes("zip")||e.includes("archive")||e.includes("compressed")?"📦":e.includes("text")||e.includes("plain")?"📝":e.includes("javascript")||e.includes("json")?"📜":e.includes("html")||e.includes("xml")?"🌐":e.includes("word")||e.includes("document")?"📝":e.includes("excel")||e.includes("sheet")?"📊":e.includes("powerpoint")||e.includes("presentation")?"📽":"📄":"📄"}getFileTypeClass(e){return e?e.startsWith("image/")?"image":e.startsWith("video/")?"video":e.startsWith("audio/")?"audio":e.includes("pdf")?"pdf":e.includes("zip")||e.includes("archive")||e.includes("compressed")?"archive":e.includes("text")||e.includes("plain")?"text":e.includes("javascript")||e.includes("json")?"code":e.includes("html")||e.includes("xml")?"web":e.includes("word")||e.includes("document")?"document":e.includes("excel")||e.includes("sheet")?"spreadsheet":e.includes("powerpoint")||e.includes("presentation")?"presentation":"file":"file"}formatFileSize(e){if(!e||e===0)return"0 B";const t=["B","KB","MB","GB","TB","PB"];let i=e,s=0;for(;i>=1024&&s<t.length-1;)i/=1024,s++;let n=0;return s>0&&(i<10?n=2:i<100&&(n=1)),`${i.toFixed(n)} ${t[s]}`}formatDate(e){if(!e)return"不明";let t;if(typeof e=="string")if(e.includes(" ")){const i=e.split(" ");if(i.length===2){const[s,n]=i,a=`${s}T${n}`;t=new Date(a)}else t=new Date(e)}else t=new Date(e);else t=new Date(e);if(isNaN(t.getTime()))return console.warn("Invalid date format:",e),"不明";try{return t.toLocaleDateString("ja-JP",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch(i){return console.error("Date formatting error:",i,e),"不明"}}escapeHtml(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}truncateText(e,t){return e?e.length>t?e.substring(0,t)+"...":e:""}getFolderPath(e){if(!e)return"ルート";const t=window.folderData||[],i=(n,a)=>{for(const r of n){const l=r;if(l.id===a)return l;if(l.children){const d=i(l.children,a);if(d)return d}}return null};return i(t,e)?.name||"不明なフォルダ"}formatDownloads(e){return e.count&&typeof e.count=="number"?`${e.count}回`:e.share_downloads&&typeof e.share_downloads=="number"?`${e.share_downloads}回`:e.share_key?"共有中":"0回"}}class S{core;eventListeners=[];constructor(e){this.core=e}init(){this.bindEvents()}bindEvents(){this.addListener(this.core.container,"input",this.handleDelegatedInput.bind(this)),this.addListener(this.core.container,"keyup",this.handleDelegatedKeyup.bind(this)),this.addListener(this.core.container,"click",this.handleDelegatedClick.bind(this)),this.addListener(this.core.container,"change",this.handleDelegatedChange.bind(this)),this.addListener(this.core.container,"dblclick",this.handleDelegatedDoubleClick.bind(this)),this.addListener(document,"keydown",this.handleKeyboard.bind(this))}handleDelegatedInput(e){e.target.classList.contains("file-manager__search-input")&&this.handleSearch(e)}handleDelegatedKeyup(e){e.target.classList.contains("file-manager__search-input")&&this.handleSearchKeyup(e)}handleDelegatedClick(e){const t=e.target;if(t.classList.contains("file-manager__view-btn")||t.closest(".file-manager__view-btn")){this.handleViewToggle(e);return}if(t.classList.contains("file-action-btn")||t.closest(".file-action-btn")){this.handleFileAction(e);return}if(t.classList.contains("bulk-action-btn")||t.closest(".bulk-action-btn")){this.handleBulkAction(e);return}if(t.classList.contains("pagination-btn")||t.closest(".pagination-btn")){this.handlePagination(e);return}if(t.classList.contains("sortable")||t.closest(".sortable")){this.handleSort(e);return}if(t.classList.contains("file-grid-item")||t.closest(".file-grid-item")){this.handleItemClick(e);return}if(t.classList.contains("file-list-item")||t.closest(".file-list-item")){this.handleItemClick(e);return}}handleDelegatedChange(e){const t=e.target;t.classList.contains("file-checkbox")?this.handleFileSelection(e):t.classList.contains("select-all-checkbox")?this.handleSelectAll(e):t.classList.contains("file-manager__sort-select")&&this.handleSortSelectChange(e)}handleDelegatedDoubleClick(e){const t=e.target;t.classList.contains("file-grid-item")||t.closest(".file-grid-item")?this.handleItemDoubleClick(e):(t.classList.contains("file-list-item")||t.closest(".file-list-item"))&&this.handleItemDoubleClick(e)}handleSortSelectChange(e){const t=e.target,[i,s]=t.value.split("_");this.core.setSortBy(i,s)}handleSearch(e){const t=e.target;this.core.setSearchQuery(t.value)}handleSearchKeyup(e){const t=e;if(t.key==="Enter"){const i=t.target;this.core.setSearchQuery(i.value)}}handleViewToggle(e){e.preventDefault();const i=e.target.dataset.view;i&&this.core.setViewMode(i)}handleFileSelection(e){e.stopPropagation();const i=e.target.dataset.fileId;i&&this.core.toggleFileSelection(i)}handleSelectAll(e){e.stopPropagation(),this.core.toggleAllSelection()}handleFileAction(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();const t=e.target,i=t.dataset.action,s=t.dataset.fileId;if(!i||!s||t.dataset.processing==="true")return;t.dataset.processing="true";const n=this.core.getFiles().find(a=>a.id===s);if(!n){t.dataset.processing="false";return}try{switch(i){case"download":this.downloadFile(n.id.toString());break;case"share":this.shareFile(n.id.toString());break;case"delete":this.deleteFile(n.id.toString());break;case"edit":this.editFile(n.id.toString());break;case"move":this.moveFile(n.id.toString());break;case"replace":this.replaceFile(n.id.toString());break}}finally{setTimeout(()=>{t.dataset.processing="false"},1e3)}}handleBulkAction(e){switch(e.preventDefault(),e.target.dataset.action){case"download":this.downloadSelectedFiles();break;case"delete":this.deleteSelectedFiles();break;case"cancel":this.core.clearSelection();break}}handlePagination(e){e.preventDefault();const t=e.target,i=parseInt(t.dataset.page||"1");isNaN(i)||this.core.setPage(i)}handleSort(e){e.preventDefault();const i=e.target.dataset.sort;if(!i)return;const s=this.core.getState().sortBy,[n,a]=s.split("_");let r="asc";n===i&&a==="asc"&&(r="desc"),this.core.setSortBy(i,r)}handleItemClick(e){const t=e.target;if(t.tagName==="INPUT"||t.tagName==="BUTTON"||t.closest(".file-action-btn"))return;const i=e.currentTarget;if(i.dataset.doubleClickProcessing==="true")return;const s=i.dataset.fileId;s&&setTimeout(()=>{if(i.dataset.doubleClickProcessing!=="true"){const n=e;n.ctrlKey||n.metaKey?this.core.toggleFileSelection(s):(this.core.clearSelection(),this.core.toggleFileSelection(s))}},200)}handleItemDoubleClick(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();const t=e.currentTarget,i=t.dataset.fileId;t.dataset.doubleClickProcessing!=="true"&&(t.dataset.doubleClickProcessing="true",i&&this.downloadFile(i),setTimeout(()=>{t.dataset.doubleClickProcessing="false"},1e3))}handleKeyboard(e){const t=e;if(this.core.container.contains(document.activeElement))switch(t.key){case"Delete":t.preventDefault(),this.deleteSelectedFiles();break;case"Enter":t.preventDefault(),this.downloadSelectedFiles();break;case"Escape":t.preventDefault(),this.core.clearSelection();break;case"a":(t.ctrlKey||t.metaKey)&&(t.preventDefault(),this.core.toggleAllSelection());break}}async downloadFile(e){const t=this.core.getFiles().find(s=>s.id===e);if(!t)return;let i="";for(;;)try{const s=await m.verifyDownload(e,i);if(s.success&&s.data?.token){const a=document.createElement("a");a.href=`./download.php?id=${encodeURIComponent(e)}&key=${encodeURIComponent(s.data.token)}`,a.download=t.name||"download",a.style.display="none",document.body.appendChild(a),a.click(),document.body.removeChild(a),console.log("ダウンロード:",t.name);return}const n=typeof s.error=="object"&&s.error?s.error.code:s.error;if(n==="AUTH_REQUIRED"||n==="INVALID_KEY"){if(i=await h("ダウンロードキーを入力してください:")??"",!i)return;continue}await o(s.message||"ダウンロードエラー");return}catch(s){console.error("verifyDownload error",s),await o("ダウンロード処理でエラーが発生しました。");return}}async downloadSelectedFiles(){const e=this.core.getSelectedFiles();if(e.length===0){await o("ダウンロードするファイルを選択してください。");return}e.length===1?await this.downloadFile(e[0].id.toString()):(console.log("複数ファイルダウンロード:",e.length,"件"),await o("複数ファイルのダウンロード機能は実装中です。"))}async shareFile(e){if(this.core.getFiles().find(i=>i.id===e))try{const i=await _.generateShareLink({fileId:e});if(i.success&&i.data?.share_url){const s=i.data.share_url;navigator.clipboard?(await navigator.clipboard.writeText(s),await o(`共有リンクをクリップボードにコピーしました:
${s}`)):await v("共有リンク（Ctrl+Cでコピー）:",s)}else await o("共有リンクの生成に失敗しました: "+(i.error||"不明なエラー"))}catch(i){console.error("共有エラー:",i),await o("共有機能でエラーが発生しました。")}}async deleteFile(e){const t=this.core.getFiles().find(s=>s.id===e);if(!t)return;let i="";if(!(t.del_key_hash&&(i=await h("削除キーを入力してください:")??"",!i))&&await w(`「${t.name}」を削除しますか？この操作は取り消せません。`))for(;;)try{const s=await m.verifyDelete(e,i);if(s.success&&s.data?.token){window.location.href=`./delete.php?id=${encodeURIComponent(e)}&key=${encodeURIComponent(s.data.token)}`;return}const n=typeof s.error=="object"&&s.error?s.error.code:s.error;if(n==="AUTH_REQUIRED"){if(i===""&&(i=await h("削除キーを入力してください（選択した全ファイルに適用されます）:")??"",!i)){await o("削除処理がキャンセルされました。");return}continue}if(n==="INVALID_KEY"){if(i=await h("削除キーが正しくありません。再入力してください:")??"",!i){await o("削除処理がキャンセルされました。");return}continue}await o(s.message||"削除検証エラー");return}catch(s){console.error("削除検証エラー:",t.name,s),await o("削除処理でエラーが発生しました。");return}}async deleteSelectedFiles(){const e=this.core.getSelectedFiles();if(e.length===0){await o("削除するファイルを選択してください。");return}if(await w(`選択した${e.length}件のファイルを削除しますか？この操作は取り消せません。`))try{let t="",i=[];for(const s of e)for(;;)try{const n=await m.verifyDelete(s.id.toString(),t);if(n.success&&n.data?.token){i.push(`./delete.php?id=${encodeURIComponent(s.id.toString())}&key=${encodeURIComponent(n.data.token)}`);break}const a=typeof n.error=="object"&&n.error?n.error.code:n.error;if(a==="AUTH_REQUIRED"){if(t===""&&(t=await h("削除キーを入力してください（選択した全ファイルに適用されます）:")??"",!t)){await o("削除処理がキャンセルされました。");return}continue}if(a==="INVALID_KEY"){if(t=await h("削除キーが正しくありません。再入力してください:")??"",!t){await o("削除処理がキャンセルされました。");return}continue}await o(n.message||"削除検証エラー");return}catch(n){console.error("削除検証エラー:",s.name,n),await o("削除処理でエラーが発生しました。");return}if(i.length>0)for(let s=0;s<i.length;s++)if(s===i.length-1)window.location.href=i[s];else{const n=document.createElement("iframe");n.style.display="none",n.src=i[s],document.body.appendChild(n),setTimeout(()=>{n.parentNode&&n.parentNode.removeChild(n)},2e3)}}catch(t){console.error("一括削除エラー:",t),await o("ファイル削除でエラーが発生しました。")}}async editFile(e){const t=this.core.getFiles().find(i=>i.id===e);t&&(typeof window.editFile=="function"?window.editFile(e,t.name,t.comment):await o("編集機能が読み込まれていません。ページを再読み込みしてください。"))}async moveFile(e){this.core.getFiles().find(i=>i.id===e)&&(typeof window.moveFile=="function"?await window.moveFile(e):await o("フォルダマネージャーが読み込まれていません。"))}async replaceFile(e){const t=this.core.getFiles().find(i=>i.id===e);t&&(typeof window.replaceFile=="function"?window.replaceFile(e,t.name):await o("差し替え機能が読み込まれていません。ページを再読み込みしてください。"))}addListener(e,t,i){let s=null;typeof e=="string"?s=this.core.container.querySelector(e)||document.querySelector(e):s=e,s&&(s.addEventListener(t,i),this.eventListeners.push({element:s,event:t,handler:i}))}destroy(){this.eventListeners.forEach(({element:e,event:t,handler:i})=>{e.removeEventListener(t,i)}),this.eventListeners=[]}}class ${core;constructor(e){this.core=e}async downloadSelected(){const e=this.core.getSelectedFiles();if(e.length===0){c("ダウンロードするファイルを選択してください。");return}if(e.length===1){this.downloadSingleFile(e[0]);return}await this.downloadMultipleFiles(e)}async deleteSelected(){const e=this.core.getSelectedFiles();if(e.length===0){c("削除するファイルを選択してください。");return}if(await w(`選択した${e.length}件のファイルを削除しますか？

削除されるファイル:
${e.map(i=>i.name).slice(0,5).join(`
`)}${e.length>5?`
...他${e.length-5}件`:""}

この操作は取り消せません。`))try{let i="",s=0,n=0;for(const a of e)try{await this.deleteFile(a.id.toString(),i),this.core.removeFile(a.id.toString()),s++}catch(r){const l=r instanceof Error?r.message:"Unknown error";if(l==="DELETE_KEY_REQUIRED"){if(i===""){if(i=await h("削除キーを入力してください（選択した全ファイルに適用されます）:")??"",!i){c("削除処理がキャンセルされました。");return}try{await this.deleteFile(a.id.toString(),i),this.core.removeFile(a.id.toString()),s++}catch(d){console.error("削除再試行エラー:",a.name,d),n++}}}else if(l==="INVALID_DELETE_KEY"){if(i=await h("削除キーが正しくありません。再入力してください:")??"",!i){c("削除処理がキャンセルされました。");return}try{await this.deleteFile(a.id.toString(),i),this.core.removeFile(a.id.toString()),s++}catch(d){console.error("削除再試行エラー:",a.name,d),n++}}else console.error("ファイル削除エラー:",a.name,r),n++}s>0&&f(`${s}件のファイルを削除しました。`),n>0&&c(`${n}件のファイルの削除に失敗しました。`)}catch(i){console.error("一括削除エラー:",i),c("ファイルの削除中にエラーが発生しました。")}}async moveSelected(e){const t=this.core.getSelectedFiles();if(t.length===0){c("移動するファイルを選択してください。");return}try{const i=t.map(r=>this.moveFile(r.id.toString(),e)),s=await Promise.allSettled(i),n=s.filter(r=>r.status==="fulfilled").length,a=s.filter(r=>r.status==="rejected").length;n>0&&(f(`${n}件のファイルを移動しました。`),t.forEach(r=>{this.core.updateFile(r.id.toString(),{folder_id:e})})),a>0&&c(`${a}件のファイルの移動に失敗しました。`)}catch(i){console.error("一括移動エラー:",i),c("ファイルの移動中にエラーが発生しました。")}}async shareSelected(e){const t=this.core.getSelectedFiles();if(t.length===0){c("共有設定するファイルを選択してください。");return}try{const i=t.map(r=>this.setFileSharing(r.id.toString(),e)),s=await Promise.allSettled(i),n=s.filter(r=>r.status==="fulfilled").length,a=s.filter(r=>r.status==="rejected").length;n>0&&(f(`${n}件のファイルの共有設定を更新しました。`),this.core.refresh()),a>0&&c(`${a}件のファイルの共有設定に失敗しました。`)}catch(i){console.error("一括共有設定エラー:",i),c("共有設定中にエラーが発生しました。")}}async editSelectedMetadata(e){const t=this.core.getSelectedFiles();if(t.length===0){c("編集するファイルを選択してください。");return}try{const i=t.map(r=>this.updateFileMetadata(r.id.toString(),e)),s=await Promise.allSettled(i),n=s.filter(r=>r.status==="fulfilled").length,a=s.filter(r=>r.status==="rejected").length;n>0&&(f(`${n}件のファイル情報を更新しました。`),t.forEach(r=>{this.core.updateFile(r.id.toString(),e)})),a>0&&c(`${a}件のファイル更新に失敗しました。`)}catch(i){console.error("一括メタデータ更新エラー:",i),c("ファイル情報の更新中にエラーが発生しました。")}}getSelectionStats(){const e=this.core.getSelectedFiles(),t={count:e.length,totalSize:0,types:{},oldestDate:null,newestDate:null};return e.forEach(i=>{t.totalSize+=i.size;const s=(i.type||"").split("/")[0];t.types[s]=(t.types[s]||0)+1;const n=new Date(i.upload_date||0);(!t.oldestDate||n<t.oldestDate)&&(t.oldestDate=n),(!t.newestDate||n>t.newestDate)&&(t.newestDate=n)}),t}downloadSingleFile(e){const t=document.createElement("a");t.href=`./download.php?id=${encodeURIComponent(e.id)}`,t.download=e.name||"download",t.style.display="none",document.body.appendChild(t),t.click(),document.body.removeChild(t)}async downloadMultipleFiles(e){try{const t=e.map(s=>s.id),i=await p("/api/files/zip",{file_ids:t});if(i.success&&i.data&&typeof i.data=="object"&&"download_url"in i.data){const s=document.createElement("a");s.href=i.data.download_url,s.download=`files_${new Date().toISOString().slice(0,10)}.zip`,s.style.display="none",document.body.appendChild(s),s.click(),document.body.removeChild(s),f(`${e.length}件のファイルをZIP化してダウンロードしました。`)}else throw new Error(i.error||"ZIP化に失敗しました")}catch(t){console.error("複数ファイルダウンロードエラー:",t),c("複数ファイルのダウンロードに失敗しました。")}}async deleteFile(e,t=""){const i=await m.verifyDelete(e,t);if(!i.success){const s=typeof i.error=="object"&&i.error?i.error.code:i.error;throw s==="AUTH_REQUIRED"?new Error("DELETE_KEY_REQUIRED"):s==="INVALID_KEY"?new Error("INVALID_DELETE_KEY"):new Error(i.message||"ファイルの削除に失敗しました")}if(!i.data?.token)throw new Error("削除トークンの取得に失敗しました");return new Promise((s,n)=>{const a=document.createElement("iframe");a.style.display="none",a.src=`./delete.php?id=${encodeURIComponent(e)}&key=${encodeURIComponent(i.data.token)}`,a.onload=()=>{document.body.removeChild(a),s()},a.onerror=()=>{document.body.removeChild(a),n(new Error("ファイルの削除に失敗しました"))},setTimeout(()=>{a.parentNode&&(document.body.removeChild(a),s())},5e3),document.body.appendChild(a)})}async moveFile(e,t){const i=await p(`/api/files/${e}/move`,{folder_id:t});if(!i.success)throw new Error(i.error||"ファイルの移動に失敗しました")}async setFileSharing(e,t){const i=await p(`/api/files/${e}/share`,t);if(!i.success)throw new Error(i.error||"共有設定に失敗しました")}async updateFileMetadata(e,t){const i=await p(`/api/files/${e}/metadata`,t);if(!i.success)throw new Error(i.error||"メタデータの更新に失敗しました")}}class C{core;renderer;events;container;constructor(e,t={}){this.core=new F(e,t),this.renderer=new y(this.core),this.events=new S(this.core),new $(this.core),this.core.setDependencies(this.renderer,this.events),this.container=this.core.container,this.init()}init(){this.core.init()}setFiles(e){this.core.setFiles(e)}getFiles(){return this.core.getFiles()}getFilteredFiles(){return this.core.getFilteredFiles()}getCurrentPage(){return this.core.getCurrentPage()}setPage(e){this.core.setPage(e)}setSearchQuery(e){this.core.setSearchQuery(e)}setSortBy(e,t){this.core.setSortBy(e,t)}setViewMode(e){this.core.setViewMode(e)}getViewMode(){return this.core.getViewMode()}getSelectedFiles(){return this.core.getSelectedFiles()}toggleFileSelection(e){this.core.toggleFileSelection(e)}toggleAllSelection(){this.core.toggleAllSelection()}clearSelection(){this.core.clearSelection()}updateFile(e,t){this.core.updateFile(e,t)}removeFile(e){this.core.removeFile(e)}addFile(e){this.core.addFile(e)}refresh(){this.core.refresh()}getStats(){return this.core.getStats()}getState(){return this.core.getState()}destroy(){this.events.destroy(),this.core.destroy()}loadViewMode(){return this.core.loadViewMode()||"grid"}}export{C as F};
