import{s as r,b as c,p as u,f as m}from"./errorHandling.js";class p{container;state;renderer=null;events=null;constructor(e,t={}){this.container=e,this.state={files:[],filteredFiles:[],currentPage:1,itemsPerPage:t.itemsPerPage||12,searchQuery:"",sortBy:t.defaultSort||"date_desc",viewMode:this.loadViewMode()||t.defaultView||"grid",selectedFiles:new Set,isLoading:!1}}setDependencies(e,t){this.renderer=e,this.events=t}loadViewMode(){try{return localStorage.getItem("fileManager_viewMode")||null}catch{return null}}saveViewMode(){try{localStorage.setItem("fileManager_viewMode",this.state.viewMode)}catch{}}init(){this.renderer&&this.renderer.init(),this.events&&this.events.init()}setFiles(e){this.state.files=[...e],this.applyFiltersAndSort(),this.render()}getFiles(){return[...this.state.files]}getFilteredFiles(){return[...this.state.filteredFiles]}getCurrentPage(){return this.state.currentPage}setPage(e){const t=this.getMaxPage();this.state.currentPage=Math.max(1,Math.min(e,t)),this.render()}getMaxPage(){return Math.ceil(this.state.filteredFiles.length/this.state.itemsPerPage)}setSearchQuery(e){this.state.searchQuery=e,this.state.currentPage=1,this.applyFiltersAndSort(),this.render()}setSortBy(e,t){this.state.sortBy=`${e}_${t}`,this.applyFiltersAndSort(),this.render()}setViewMode(e){this.state.viewMode=e,this.saveViewMode(),this.render()}getViewMode(){return this.state.viewMode}getSelectedFiles(){return this.state.files.filter(e=>this.state.selectedFiles.has(e.id))}toggleFileSelection(e){this.state.selectedFiles.has(e)?this.state.selectedFiles.delete(e):this.state.selectedFiles.add(e),this.render()}toggleAllSelection(){const e=this.getCurrentPageFiles();e.every(i=>this.state.selectedFiles.has(i.id))?e.forEach(i=>this.state.selectedFiles.delete(i.id)):e.forEach(i=>this.state.selectedFiles.add(i.id)),this.render()}clearSelection(){this.state.selectedFiles.clear(),this.render()}updateFile(e,t){const i=this.state.files.findIndex(s=>s.id===e);i!==-1&&(this.state.files[i]={...this.state.files[i],...t},this.applyFiltersAndSort(),this.render())}removeFile(e){this.state.files=this.state.files.filter(t=>t.id!==e),this.state.selectedFiles.delete(e),this.applyFiltersAndSort(),this.render()}addFile(e){this.state.files.push(e),this.applyFiltersAndSort(),this.render()}refresh(){this.applyFiltersAndSort(),this.render()}getStats(){const e=this.getSelectedFiles(),t=this.state.files.reduce((i,s)=>i+s.size,0);return{totalFiles:this.state.files.length,filteredFiles:this.state.filteredFiles.length,selectedFiles:e.length,totalSize:t}}getState(){return{...this.state}}getCurrentPageFiles(){const e=(this.state.currentPage-1)*this.state.itemsPerPage,t=e+this.state.itemsPerPage;return this.state.filteredFiles.slice(e,t)}applyFiltersAndSort(){let e=[...this.state.files];if(this.state.searchQuery){const i=this.state.searchQuery.toLowerCase();e=e.filter(s=>s.name.toLowerCase().includes(i)||s.comment&&s.comment.toLowerCase().includes(i))}e.sort((i,s)=>this.compareFiles(i,s)),this.state.filteredFiles=e;const t=this.getMaxPage();this.state.currentPage>t&&t>0&&(this.state.currentPage=t)}compareFiles(e,t){const[i,s]=this.state.sortBy.split("_"),a=s==="asc"?1:-1;switch(i){case"name":return e.name.localeCompare(t.name)*a;case"size":return(e.size-t.size)*a;case"date":return(new Date(e.upload_date).getTime()-new Date(t.upload_date).getTime())*a;case"type":return e.type.localeCompare(t.type)*a;default:return 0}}render(){this.renderer&&this.renderer.render()}destroy(){this.state.selectedFiles.clear()}}class F{core;constructor(e){this.core=e}init(){this.setupContainer(),this.render()}setupContainer(){this.core.container.classList.contains("file-manager-v2")||this.core.container.classList.add("file-manager-v2"),this.core.container.innerHTML=`
      <div class="file-manager__header">
        <div class="file-manager__controls">
          <div class="file-manager__search">
            <input type="text" class="file-manager__search-input" placeholder="ファイル名または説明で検索...">
          </div>
          <div class="file-manager__view-toggle">
            <button class="file-manager__view-btn" data-view="grid" title="グリッド表示">
              <span class="view-icon view-icon--grid">⊞</span>
            </button>
            <button class="file-manager__view-btn" data-view="list" title="リスト表示">
              <span class="view-icon view-icon--list">☰</span>
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
    `}render(){this.updateViewMode(),this.renderFiles(),this.renderPagination(),this.renderStats(),this.renderBulkActions()}updateViewMode(){const e=this.core.getViewMode();this.core.container.querySelectorAll(".file-manager__view-btn").forEach(a=>{const l=a;l.dataset.view===e?l.classList.add("active"):l.classList.remove("active")});const i=this.core.container.querySelector(".file-manager__grid"),s=this.core.container.querySelector(".file-manager__list");e==="grid"?(i.style.display="grid",s.style.display="none"):(i.style.display="none",s.style.display="block")}renderFiles(){const e=this.core.getCurrentPageFiles();this.core.getViewMode()==="grid"?this.renderGridView(e):this.renderListView(e)}renderGridView(e){const t=this.core.container.querySelector(".file-manager__grid");if(e.length===0){t.innerHTML='<div class="file-manager__empty">ファイルがありません</div>';return}t.innerHTML=e.map(i=>this.createGridItem(i)).join("")}renderListView(e){const t=this.core.container.querySelector(".file-manager__list");if(e.length===0){t.innerHTML='<div class="file-manager__empty">ファイルがありません</div>';return}const i=`
      <table class="file-list-table">
        <thead>
          <tr>
            <th class="file-list__select">
              <input type="checkbox" class="select-all-checkbox">
            </th>
            <th class="file-list__name sortable" data-sort="name">ファイル名</th>
            <th class="file-list__size sortable" data-sort="size">サイズ</th>
            <th class="file-list__date sortable" data-sort="date">アップロード日時</th>
            <th class="file-list__actions">操作</th>
          </tr>
        </thead>
        <tbody>
          ${e.map(s=>this.createListItem(s)).join("")}
        </tbody>
      </table>
    `;t.innerHTML=i}createGridItem(e){const t=this.core.getState().selectedFiles.has(e.id),i=this.getFileIcon(e.type),s=this.formatFileSize(e.size),a=this.formatDate(e.upload_date);return`
      <div class="file-grid-item ${t?"selected":""}" data-file-id="${e.id}">
        <div class="file-grid-item__checkbox">
          <input type="checkbox" ${t?"checked":""} class="file-checkbox" data-file-id="${e.id}">
        </div>
        
        <div class="file-grid-item__icon">
          <span class="file-icon file-icon--${this.getFileTypeClass(e.type)}">${i}</span>
        </div>
        
        <div class="file-grid-item__info">
          <div class="file-grid-item__name" title="${this.escapeHtml(e.name)}">
            ${this.escapeHtml(this.truncateText(e.name,20))}
          </div>
          <div class="file-grid-item__size">${s}</div>
          <div class="file-grid-item__date">${a}</div>
          ${e.comment?`<div class="file-grid-item__comment">${this.escapeHtml(this.truncateText(e.comment,30))}</div>`:""}
        </div>
        
        <div class="file-grid-item__actions">
          <button class="file-action-btn file-action-btn--download" data-action="download" data-file-id="${e.id}" title="ダウンロード">
            ⬇
          </button>
          <button class="file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有">
            🔗
          </button>
          <button class="file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除">
            🗑
          </button>
        </div>
      </div>
    `}createListItem(e){const t=this.core.getState().selectedFiles.has(e.id),i=this.getFileIcon(e.type),s=this.formatFileSize(e.size),a=this.formatDate(e.upload_date);return`
      <tr class="file-list-item ${t?"selected":""}" data-file-id="${e.id}">
        <td class="file-list__select">
          <input type="checkbox" ${t?"checked":""} class="file-checkbox" data-file-id="${e.id}">
        </td>
        <td class="file-list__name">
          <span class="file-icon file-icon--${this.getFileTypeClass(e.type)}">${i}</span>
          <span class="file-name" title="${this.escapeHtml(e.name)}">${this.escapeHtml(e.name)}</span>
          ${e.comment?`<div class="file-comment">${this.escapeHtml(e.comment)}</div>`:""}
        </td>
        <td class="file-list__size">${s}</td>
        <td class="file-list__date">${a}</td>
        <td class="file-list__actions">
          <button class="file-action-btn file-action-btn--download" data-action="download" data-file-id="${e.id}" title="ダウンロード">
            ⬇
          </button>
          <button class="file-action-btn file-action-btn--share" data-action="share" data-file-id="${e.id}" title="共有">
            🔗
          </button>
          <button class="file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${e.id}" title="削除">
            🗑
          </button>
        </td>
      </tr>
    `}renderPagination(){const e=this.core.getStats(),t=this.core.getCurrentPage(),i=this.core.getMaxPage(),s=this.core.container.querySelector(".pagination__info"),a=this.core.container.querySelector(".pagination__controls"),l=(t-1)*this.core.getState().itemsPerPage+1,n=Math.min(t*this.core.getState().itemsPerPage,e.filteredFiles);if(s.textContent=`${l}-${n} / ${e.filteredFiles}件`,i<=1){a.innerHTML="";return}let h="";h+=`
      <button class="pagination-btn pagination-btn--prev" ${t<=1?"disabled":""} data-page="${t-1}">
        ← 前
      </button>
    `;const g=Math.max(1,t-2),f=Math.min(i,t+2);for(let o=g;o<=f;o++)h+=`
        <button class="pagination-btn pagination-btn--number ${o===t?"active":""}" data-page="${o}">
          ${o}
        </button>
      `;h+=`
      <button class="pagination-btn pagination-btn--next" ${t>=i?"disabled":""} data-page="${t+1}">
        次 →
      </button>
    `,a.innerHTML=h}renderStats(){const e=this.core.getStats(),t=this.core.container.querySelector(".file-manager__stats-text");let i=`${e.totalFiles}件のファイル`;e.filteredFiles!==e.totalFiles&&(i+=` (${e.filteredFiles}件表示)`),e.selectedFiles>0&&(i+=` | ${e.selectedFiles}件選択中`),t.textContent=i}renderBulkActions(){const e=this.core.getStats().selectedFiles,t=this.core.container.querySelector(".file-manager__bulk-actions");e>0?t.style.display="block":t.style.display="none"}getFileIcon(e){return e.startsWith("image/")?"🖼":e.startsWith("video/")?"🎥":e.startsWith("audio/")?"🎵":e.includes("pdf")?"📄":e.includes("zip")||e.includes("archive")?"📦":e.includes("text")?"📝":"📁"}getFileTypeClass(e){return e.startsWith("image/")?"image":e.startsWith("video/")?"video":e.startsWith("audio/")?"audio":e.includes("pdf")?"pdf":e.includes("zip")?"archive":e.includes("text")?"text":"file"}formatFileSize(e){const t=["B","KB","MB","GB"];let i=e,s=0;for(;i>=1024&&s<t.length-1;)i/=1024,s++;return`${i.toFixed(s>0?1:0)} ${t[s]}`}formatDate(e){return new Date(e).toLocaleDateString("ja-JP",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}truncateText(e,t){return e.length>t?e.substring(0,t)+"...":e}}class b{core;eventListeners=[];constructor(e){this.core=e}init(){this.bindEvents()}bindEvents(){this.addListener(".file-manager__search-input","input",this.handleSearch.bind(this)),this.addListener(".file-manager__search-input","keyup",this.handleSearchKeyup.bind(this)),this.addListenerAll(".file-manager__view-btn","click",this.handleViewToggle.bind(this)),this.addListenerAll(".file-checkbox","change",this.handleFileSelection.bind(this)),this.addListener(".select-all-checkbox","change",this.handleSelectAll.bind(this)),this.addListenerAll(".file-action-btn","click",this.handleFileAction.bind(this)),this.addListenerAll(".bulk-action-btn","click",this.handleBulkAction.bind(this)),this.addListenerAll(".pagination-btn","click",this.handlePagination.bind(this)),this.addListenerAll(".sortable","click",this.handleSort.bind(this)),this.addListenerAll(".file-grid-item","click",this.handleItemClick.bind(this)),this.addListenerAll(".file-list-item","click",this.handleItemClick.bind(this)),this.addListenerAll(".file-grid-item","dblclick",this.handleItemDoubleClick.bind(this)),this.addListenerAll(".file-list-item","dblclick",this.handleItemDoubleClick.bind(this)),this.addListener(document,"keydown",this.handleKeyboard.bind(this))}handleSearch(e){const t=e.target;this.core.setSearchQuery(t.value)}handleSearchKeyup(e){const t=e;if(t.key==="Enter"){const i=t.target;this.core.setSearchQuery(i.value)}}handleViewToggle(e){e.preventDefault();const i=e.target.dataset.view;i&&this.core.setViewMode(i)}handleFileSelection(e){e.stopPropagation();const i=e.target.dataset.fileId;i&&this.core.toggleFileSelection(i)}handleSelectAll(e){e.stopPropagation(),this.core.toggleAllSelection()}handleFileAction(e){e.preventDefault(),e.stopPropagation();const t=e.target,i=t.dataset.action,s=t.dataset.fileId;if(!i||!s)return;const a=this.core.getFiles().find(l=>l.id===s);if(a)switch(i){case"download":this.downloadFile(a.id);break;case"share":this.shareFile(a.id);break;case"delete":this.deleteFile(a.id);break;case"edit":this.editFile(a.id);break}}handleBulkAction(e){switch(e.preventDefault(),e.target.dataset.action){case"download":this.downloadSelectedFiles();break;case"delete":this.deleteSelectedFiles();break;case"cancel":this.core.clearSelection();break}}handlePagination(e){e.preventDefault();const t=e.target,i=parseInt(t.dataset.page||"1");isNaN(i)||this.core.setPage(i)}handleSort(e){e.preventDefault();const i=e.target.dataset.sort;if(!i)return;const s=this.core.getState().sortBy,[a,l]=s.split("_");let n="asc";a===i&&l==="asc"&&(n="desc"),this.core.setSortBy(i,n)}handleItemClick(e){const t=e.target;if(t.tagName==="INPUT"||t.tagName==="BUTTON"||t.closest(".file-action-btn"))return;const s=e.currentTarget.dataset.fileId;if(s){const a=e;a.ctrlKey||a.metaKey?this.core.toggleFileSelection(s):(this.core.clearSelection(),this.core.toggleFileSelection(s))}}handleItemDoubleClick(e){e.preventDefault();const i=e.currentTarget.dataset.fileId;i&&this.downloadFile(i)}handleKeyboard(e){const t=e;if(this.core.container.contains(document.activeElement))switch(t.key){case"Delete":t.preventDefault(),this.deleteSelectedFiles();break;case"Enter":t.preventDefault(),this.downloadSelectedFiles();break;case"Escape":t.preventDefault(),this.core.clearSelection();break;case"a":(t.ctrlKey||t.metaKey)&&(t.preventDefault(),this.core.toggleAllSelection());break}}downloadFile(e){const t=this.core.getFiles().find(s=>s.id===e);if(!t)return;const i=document.createElement("a");i.href=`./download.php?id=${encodeURIComponent(e)}`,i.download=t.name,i.style.display="none",document.body.appendChild(i),i.click(),document.body.removeChild(i),console.log("ダウンロード:",t.name)}downloadSelectedFiles(){const e=this.core.getSelectedFiles();if(e.length===0){alert("ダウンロードするファイルを選択してください。");return}e.length===1?this.downloadFile(e[0].id):(console.log("複数ファイルダウンロード:",e.length,"件"),alert("複数ファイルのダウンロード機能は実装中です。"))}shareFile(e){const t=this.core.getFiles().find(i=>i.id===e);t&&(console.log("共有:",t.name),alert("共有機能は実装中です。"))}deleteFile(e){const t=this.core.getFiles().find(i=>i.id===e);t&&confirm(`「${t.name}」を削除しますか？この操作は取り消せません。`)&&(console.log("削除:",t.name),this.core.removeFile(e))}deleteSelectedFiles(){const e=this.core.getSelectedFiles();if(e.length===0){alert("削除するファイルを選択してください。");return}confirm(`選択した${e.length}件のファイルを削除しますか？この操作は取り消せません。`)&&e.forEach(t=>{this.core.removeFile(t.id)})}editFile(e){const t=this.core.getFiles().find(i=>i.id===e);t&&(console.log("編集:",t.name),alert("編集機能は実装中です。"))}addListener(e,t,i){let s=null;typeof e=="string"?s=this.core.container.querySelector(e)||document.querySelector(e):s=e,s&&(s.addEventListener(t,i),this.eventListeners.push({element:s,event:t,handler:i}))}addListenerAll(e,t,i){this.core.container.querySelectorAll(e).forEach(a=>{a.addEventListener(t,i),this.eventListeners.push({element:a,event:t,handler:i})})}destroy(){this.eventListeners.forEach(({element:e,event:t,handler:i})=>{e.removeEventListener(t,i)}),this.eventListeners=[]}}class v{core;constructor(e){this.core=e}async downloadSelected(){const e=this.core.getSelectedFiles();if(e.length===0){r("ダウンロードするファイルを選択してください。");return}if(e.length===1){this.downloadSingleFile(e[0]);return}await this.downloadMultipleFiles(e)}async deleteSelected(){const e=this.core.getSelectedFiles();if(e.length===0){r("削除するファイルを選択してください。");return}if(confirm(`選択した${e.length}件のファイルを削除しますか？

削除されるファイル:
${e.map(i=>i.name).slice(0,5).join(`
`)}${e.length>5?`
...他${e.length-5}件`:""}

この操作は取り消せません。`))try{const i=e.map(n=>this.deleteFile(n.id)),s=await Promise.allSettled(i),a=s.filter(n=>n.status==="fulfilled").length,l=s.filter(n=>n.status==="rejected").length;a>0&&(c(`${a}件のファイルを削除しました。`),e.forEach(n=>{this.core.removeFile(n.id)})),l>0&&r(`${l}件のファイルの削除に失敗しました。`)}catch(i){console.error("一括削除エラー:",i),r("ファイルの削除中にエラーが発生しました。")}}async moveSelected(e){const t=this.core.getSelectedFiles();if(t.length===0){r("移動するファイルを選択してください。");return}try{const i=t.map(n=>this.moveFile(n.id,e)),s=await Promise.allSettled(i),a=s.filter(n=>n.status==="fulfilled").length,l=s.filter(n=>n.status==="rejected").length;a>0&&(c(`${a}件のファイルを移動しました。`),t.forEach(n=>{this.core.updateFile(n.id,{folder_id:e})})),l>0&&r(`${l}件のファイルの移動に失敗しました。`)}catch(i){console.error("一括移動エラー:",i),r("ファイルの移動中にエラーが発生しました。")}}async shareSelected(e){const t=this.core.getSelectedFiles();if(t.length===0){r("共有設定するファイルを選択してください。");return}try{const i=t.map(n=>this.setFileSharing(n.id,e)),s=await Promise.allSettled(i),a=s.filter(n=>n.status==="fulfilled").length,l=s.filter(n=>n.status==="rejected").length;a>0&&(c(`${a}件のファイルの共有設定を更新しました。`),this.core.refresh()),l>0&&r(`${l}件のファイルの共有設定に失敗しました。`)}catch(i){console.error("一括共有設定エラー:",i),r("共有設定中にエラーが発生しました。")}}async editSelectedMetadata(e){const t=this.core.getSelectedFiles();if(t.length===0){r("編集するファイルを選択してください。");return}try{const i=t.map(n=>this.updateFileMetadata(n.id,e)),s=await Promise.allSettled(i),a=s.filter(n=>n.status==="fulfilled").length,l=s.filter(n=>n.status==="rejected").length;a>0&&(c(`${a}件のファイル情報を更新しました。`),t.forEach(n=>{this.core.updateFile(n.id,e)})),l>0&&r(`${l}件のファイル更新に失敗しました。`)}catch(i){console.error("一括メタデータ更新エラー:",i),r("ファイル情報の更新中にエラーが発生しました。")}}getSelectionStats(){const e=this.core.getSelectedFiles(),t={count:e.length,totalSize:0,types:{},oldestDate:null,newestDate:null};return e.forEach(i=>{t.totalSize+=i.size;const s=i.type.split("/")[0];t.types[s]=(t.types[s]||0)+1;const a=new Date(i.upload_date);(!t.oldestDate||a<t.oldestDate)&&(t.oldestDate=a),(!t.newestDate||a>t.newestDate)&&(t.newestDate=a)}),t}downloadSingleFile(e){const t=document.createElement("a");t.href=`./download.php?id=${encodeURIComponent(e.id)}`,t.download=e.name,t.style.display="none",document.body.appendChild(t),t.click(),document.body.removeChild(t)}async downloadMultipleFiles(e){try{const t=e.map(s=>s.id),i=await u("/api/files/zip",{file_ids:t});if(i.success&&i.data&&typeof i.data=="object"&&"download_url"in i.data){const s=document.createElement("a");s.href=i.data.download_url,s.download=`files_${new Date().toISOString().slice(0,10)}.zip`,s.style.display="none",document.body.appendChild(s),s.click(),document.body.removeChild(s),c(`${e.length}件のファイルをZIP化してダウンロードしました。`)}else throw new Error(i.error||"ZIP化に失敗しました")}catch(t){console.error("複数ファイルダウンロードエラー:",t),r("複数ファイルのダウンロードに失敗しました。")}}async deleteFile(e){const t=await m(`/api/files/${e}`);if(!t.success)throw new Error(t.error||"ファイルの削除に失敗しました")}async moveFile(e,t){const i=await u(`/api/files/${e}/move`,{folder_id:t});if(!i.success)throw new Error(i.error||"ファイルの移動に失敗しました")}async setFileSharing(e,t){const i=await u(`/api/files/${e}/share`,t);if(!i.success)throw new Error(i.error||"共有設定に失敗しました")}async updateFileMetadata(e,t){const i=await u(`/api/files/${e}/metadata`,t);if(!i.success)throw new Error(i.error||"メタデータの更新に失敗しました")}}class S{core;renderer;events;container;constructor(e,t={}){this.core=new p(e,t),this.renderer=new F(this.core),this.events=new b(this.core),new v(this.core),this.core.setDependencies(this.renderer,this.events),this.container=this.core.container,this.init()}init(){this.core.init()}setFiles(e){this.core.setFiles(e)}getFiles(){return this.core.getFiles()}getFilteredFiles(){return this.core.getFilteredFiles()}getCurrentPage(){return this.core.getCurrentPage()}setPage(e){this.core.setPage(e)}setSearchQuery(e){this.core.setSearchQuery(e)}setSortBy(e,t){this.core.setSortBy(e,t)}setViewMode(e){this.core.setViewMode(e)}getViewMode(){return this.core.getViewMode()}getSelectedFiles(){return this.core.getSelectedFiles()}toggleFileSelection(e){this.core.toggleFileSelection(e)}toggleAllSelection(){this.core.toggleAllSelection()}clearSelection(){this.core.clearSelection()}updateFile(e,t){this.core.updateFile(e,t)}removeFile(e){this.core.removeFile(e)}addFile(e){this.core.addFile(e)}refresh(){this.core.refresh()}getStats(){return this.core.getStats()}getState(){return this.core.getState()}destroy(){this.events.destroy(),this.core.destroy()}loadViewMode(){return this.core.loadViewMode()||"grid"}}export{S as F};
