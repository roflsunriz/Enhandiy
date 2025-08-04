import{r as g,i as y}from"./errorHandling.js";import{F as c}from"./api-client.js";import{p as F}from"./http.js";import{c as u,a as i,b as w}from"./modal.js";class v{currentFolderId=null;constructor(){this.init()}init(){const t=new URLSearchParams(window.location.search);this.currentFolderId=t.get("folder")||null,this.setupEventListeners(),this.loadFolderOptions()}setupEventListeners(){this.bindCreateFolderButton(),document.addEventListener("click",t=>{const r=t.target;if(r.classList.contains("rename-folder")){t.preventDefault();const e=r.dataset.folderId;e&&this.showRenameFolderDialog(e)}if(r.classList.contains("move-folder")){t.preventDefault();const e=r.dataset.folderId;e&&this.showMoveFolderDialog(e)}if(r.classList.contains("delete-folder")){t.preventDefault();const e=r.dataset.folderId;e&&this.showDeleteFolderDialog(e)}})}bindCreateFolderButton(){const t=document.getElementById("create-folder-btn");t?t.addEventListener("click",()=>this.showCreateFolderDialog()):setTimeout(()=>this.bindCreateFolderButton(),500)}async loadFolderOptions(){try{const r=(await c.getFolders()).folders||[];this.updateFolderSelect(r)}catch(t){console.error("フォルダ読み込みエラー:",t)}}async refreshAll(){try{await this.loadFolderOptions(),window.fileManagerInstance&&await window.fileManagerInstance.refreshFromServer(),await this.refreshFolderNavigation()}catch(t){console.error("フォルダとファイル表示の更新に失敗:",t)}}async refreshFolderNavigation(){try{const t=this.currentFolderId,r=t?`./app/api/refresh-files.php?folder=${encodeURIComponent(t)}`:"./app/api/refresh-files.php",e=await fetch(r);if(!e.ok)throw new Error(`HTTP ${e.status}: ${e.statusText}`);const o=await e.json();o.success?(this.updateBreadcrumb(o.breadcrumb||[]),this.updateFolderDisplay(o.folders||[])):console.error("フォルダデータの取得に失敗:",o)}catch(t){console.error("フォルダナビゲーション更新エラー:",t)}}updateBreadcrumb(t){const r=document.querySelector(".breadcrumb");if(r){let e='<li><a href="?folder=" class="breadcrumb-link">🏠 ルート</a></li>';t.forEach((o,n)=>{n+1===t.length?e+=`<li class="active">${this.escapeHtml(o.name)}</li>`:e+=`
            <li>
              <a href="?folder=${o.id}" class="breadcrumb-link">
                ${this.escapeHtml(o.name)}
              </a>
            </li>
          `}),r.innerHTML=e}}updateFolderDisplay(t){const r=document.getElementById("folder-grid");if(r){const e=this.getChildFolders(t,this.currentFolderId);if(e.length===0){r.innerHTML="";const o=r.parentElement;if(o&&!o.querySelector(".text-center.text-muted")){const s=document.createElement("div");s.className="text-center text-muted",s.style.padding="20px",s.innerHTML=`
              <span class="glyphicon glyphicon-folder-open" 
                    style="font-size: 2em; margin-bottom: 10px; display: block;"></span>
              フォルダがありません
            `,o.appendChild(s)}}else{const o=r.parentElement;if(o){const s=o.querySelector(".text-center.text-muted");s&&s.remove()}let n="";e.forEach(s=>{n+=`
            <div class="col-sm-3 col-xs-6" style="margin-bottom: 15px;" data-folder-id="${s.id}">
              <div class="folder-item-wrapper" style="position: relative;">
                <a href="?folder=${s.id}" class="folder-item">
                  <span class="folder-icon">📁</span>
                  <span class="folder-name">${this.escapeHtml(s.name)}</span>
                </a>
                <div class="folder-menu" style="position: absolute; top: 5px; right: 5px; opacity: 0; transition: opacity 0.2s;">
                  <div class="dropdown">
                    <button class="btn btn-sm btn-secondary dropdown-toggle" type="button"
                            data-bs-toggle="dropdown" aria-expanded="false"
                            style="padding: 2px 6px; border-radius: 50%; width: 24px; height: 24px; font-size: 10px;">
                      ⋮
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" style="min-width: 120px;">
                      <li>
                        <a class="dropdown-item rename-folder" href="#" data-folder-id="${s.id}">
                          ✏️ 名前変更
                        </a>
                      </li>
                      <li>
                        <a class="dropdown-item move-folder" href="#" data-folder-id="${s.id}">
                          📁 移動
                        </a>
                      </li>
                      <li><hr class="dropdown-divider"></li>
                      <li>
                        <a class="dropdown-item delete-folder" href="#" data-folder-id="${s.id}" style="color: #d9534f;">
                          🗑 削除
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          `}),r.innerHTML=n}}}getChildFolders(t,r){const e=r?parseInt(r):null;return t.filter(o=>(o.parent_id??null)===e)}escapeHtml(t){const r=document.createElement("div");return r.textContent=t,r.innerHTML}updateFolderSelect(t){const r=document.getElementById("folder-select");if(!r)return;const e=r.value;r.innerHTML='<option value="">ルートフォルダ</option>';const o=(n,s=0)=>{n.forEach(a=>{const f=document.createElement("option");f.value=a.id,f.textContent="　".repeat(s)+a.name,r.appendChild(f);const d=a;"children"in a&&d.children&&d.children.length>0&&o(d.children,s+1)})};o(t),r.value=e}async showCreateFolderDialog(){const t=await u("新しいフォルダ名を入力してください:");!t||!t.trim()||this.createFolder(t.trim(),this.currentFolderId)}async createFolder(t,r=null){try{await c.createFolder(t,r||void 0),i("フォルダを作成しました: "+t).catch(e=>{console.warn("アラート表示エラー:",e)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500)}catch(e){console.error("フォルダ作成エラー:",e);const o=e instanceof Error?e.message:"フォルダ作成に失敗しました";await i("エラー: "+o)}}async showRenameFolderDialog(t){const r=document.querySelector(`[data-folder-id="${t}"] .folder-item`),e=r?r.textContent?.trim().replace("📁","").trim():"",o=await u("新しいフォルダ名を入力してください:",e);!o||!o.trim()||o.trim()===e||this.renameFolder(t,o.trim())}async renameFolder(t,r){try{const e=await c.updateFolder(t,r);if(e.success)i("フォルダ名を変更しました: "+r).catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500);else throw new Error(e.error||"フォルダ名変更に失敗しました")}catch(e){console.error("フォルダ名変更エラー:",e);const o=e instanceof Error?e.message:"フォルダ名変更に失敗しました";await i("エラー: "+o)}}async showMoveFolderDialog(t){try{const e=(await c.getFolders()).folders||[],o=["移動先フォルダを選択してください:","","0: ルートフォルダ（最上位）"],n=(f,d=0)=>{f.forEach(l=>{if(String(l.id)!==String(t)){const m="　".repeat(d+1);o.push(`${m}${l.id}: ${l.name}`)}const p=l;"children"in l&&p.children&&p.children.length>0&&n(p.children,d+1)})};n(e),o.push(""),o.push("移動先のフォルダ番号を入力してください（0でルート）:");const s=await u(o.join(`
`));if(s===null)return;const a=s==="0"?null:s;this.moveFolder(t,a)}catch(r){console.error("フォルダ移動ダイアログエラー:",r);const e=r instanceof Error?r.message:"フォルダ移動の準備に失敗しました";await i("エラー: "+e)}}async moveFolder(t,r){try{const e=await c.moveFolder(t,r);if(e.success)i("フォルダを移動しました").catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500);else throw new Error(e.error||"フォルダ移動に失敗しました")}catch(e){console.error("フォルダ移動エラー:",e);const o=e instanceof Error?e.message:"フォルダ移動に失敗しました";await i("エラー: "+o)}}async showDeleteFolderDialog(t){const r=document.querySelector(`[data-folder-id="${t}"] .folder-item`),e=r?r.textContent?.trim().replace("📁","").trim():"フォルダ";try{const n=(await c.getFolderFileCount(t)).data?.count||0,s=0;if(n===0&&s===0)await w(`フォルダ「${e}」を削除しますか？`)&&this.deleteFolder(t,!1);else{let a=`フォルダ「${e}」には以下が含まれています：
`;n>0&&(a+=`・ファイル: ${n}個
`),s>0,a+=`
削除方法を選択してください：
`,a+=`「OK」= 中身をルートフォルダに移動して削除
`,a+="「キャンセル」= 削除を中止",await w(a)&&this.deleteFolder(t,!0)}}catch(o){console.error("フォルダ削除確認エラー:",o);const n=o instanceof Error?o.message:"フォルダ情報の取得に失敗しました";await i("エラー: "+n)}}async deleteFolder(t,r=!1){try{const e=await c.deleteFolder(t);if(e.success)i("フォルダを削除しました").catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500);else throw new Error(e.error||"フォルダ削除に失敗しました")}catch(e){console.error("フォルダ削除エラー:",e);const o=e instanceof Error?e.message:"フォルダ削除に失敗しました";await i("エラー: "+o)}}}async function b(h){const t=window.config;if(!t||!t.folders_enabled){await i("フォルダ機能が無効になっています。設定を確認してください。");return}try{const e=(await c.getFolders()).folders||[],o=["ファイルの移動先フォルダを選択してください:","","0: ルートフォルダ（最上位）"],n=(f,d=0)=>{f.forEach(l=>{const p="　".repeat(d+1);o.push(`${p}${l.id}: ${l.name}`);const m=l;"children"in l&&m.children&&m.children.length>0&&n(m.children,d+1)})};n(e),o.push(""),o.push("移動先のフォルダ番号を入力してください（0でルート）:");const s=await u(o.join(`
`));if(s===null)return;await F("./app/api/move-file.php",{file_id:h,folder_id:s==="0"?null:s}),await i("ファイルを移動しました"),window.fileManagerInstance&&await window.fileManagerInstance.refreshFromServer(),window.folderManager&&await window.folderManager.refreshAll()}catch(r){console.error("ファイル移動エラー:",r);const e=r instanceof Error?r.message:"ファイル移動に失敗しました";await i("エラー: "+e)}}g(()=>{y();const h=window.config;if(h&&h.folders_enabled){const t=new v;window.folderManager=t}});window.moveFile=b;
