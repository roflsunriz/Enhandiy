import{r as w,i as g}from"./errorHandling.js";import{F as p}from"./api-client.js";import{p as y}from"./http.js";import{c as h,a as i,b as u}from"./modal.js";class F{currentFolderId=null;constructor(){this.init()}init(){const e=new URLSearchParams(window.location.search);this.currentFolderId=e.get("folder")||null,this.setupEventListeners(),this.loadFolderOptions()}setupEventListeners(){this.bindCreateFolderButton(),document.addEventListener("click",e=>{const r=e.target;if(r.classList.contains("rename-folder")){e.preventDefault();const t=r.dataset.folderId;t&&this.showRenameFolderDialog(t)}if(r.classList.contains("move-folder")){e.preventDefault();const t=r.dataset.folderId;t&&this.showMoveFolderDialog(t)}if(r.classList.contains("delete-folder")){e.preventDefault();const t=r.dataset.folderId;t&&this.showDeleteFolderDialog(t)}})}bindCreateFolderButton(){const e=document.getElementById("create-folder-btn");e?(e.addEventListener("click",()=>this.showCreateFolderDialog()),console.log("Create folder button bound")):(console.log("Create folder button not found, retrying in 500ms"),setTimeout(()=>this.bindCreateFolderButton(),500))}async loadFolderOptions(){try{const e=await p.getFolders();this.updateFolderSelect(e.data||[])}catch(e){console.error("フォルダ読み込みエラー:",e)}}async refreshAll(){try{await this.loadFolderOptions(),window.fileManagerInstance&&await window.fileManagerInstance.refreshFromServer(),await this.refreshFolderNavigation()}catch(e){console.error("フォルダとファイル表示の更新に失敗:",e)}}async refreshFolderNavigation(){try{const e=this.currentFolderId,r=e?`./app/api/refresh-files.php?folder=${encodeURIComponent(e)}`:"./app/api/refresh-files.php",t=await fetch(r);if(!t.ok)throw new Error(`HTTP ${t.status}: ${t.statusText}`);const o=await t.json();o.success?(this.updateBreadcrumb(o.breadcrumb||[]),this.updateFolderDisplay(o.folders||[])):console.error("フォルダデータの取得に失敗:",o)}catch(e){console.error("フォルダナビゲーション更新エラー:",e)}}updateBreadcrumb(e){const r=document.querySelector(".breadcrumb");if(r){let t='<li><a href="?folder=" class="breadcrumb-link">🏠 ルート</a></li>';e.forEach((o,a)=>{a+1===e.length?t+=`<li class="active">${this.escapeHtml(o.name)}</li>`:t+=`
            <li>
              <a href="?folder=${o.id}" class="breadcrumb-link">
                ${this.escapeHtml(o.name)}
              </a>
            </li>
          `}),r.innerHTML=t}}updateFolderDisplay(e){const r=document.getElementById("folder-grid");if(r){const t=this.getChildFolders(e,this.currentFolderId);if(t.length===0){r.innerHTML="";const o=r.parentElement;if(o&&!o.querySelector(".text-center.text-muted")){const n=document.createElement("div");n.className="text-center text-muted",n.style.padding="20px",n.innerHTML=`
              <span class="glyphicon glyphicon-folder-open" 
                    style="font-size: 2em; margin-bottom: 10px; display: block;"></span>
              フォルダがありません
            `,o.appendChild(n)}}else{const o=r.parentElement;if(o){const n=o.querySelector(".text-center.text-muted");n&&n.remove()}let a="";t.forEach(n=>{a+=`
            <div class="col-sm-3 col-xs-6" style="margin-bottom: 15px;" data-folder-id="${n.id}">
              <div class="folder-item-wrapper" style="position: relative;">
                <a href="?folder=${n.id}" class="folder-item">
                  <span class="folder-icon">📁</span>
                  <span class="folder-name">${this.escapeHtml(n.name)}</span>
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
                        <a class="dropdown-item rename-folder" href="#" data-folder-id="${n.id}">
                          ✏️ 名前変更
                        </a>
                      </li>
                      <li>
                        <a class="dropdown-item move-folder" href="#" data-folder-id="${n.id}">
                          📁 移動
                        </a>
                      </li>
                      <li><hr class="dropdown-divider"></li>
                      <li>
                        <a class="dropdown-item delete-folder" href="#" data-folder-id="${n.id}" style="color: #d9534f;">
                          🗑 削除
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          `}),r.innerHTML=a}}}getChildFolders(e,r){const t=r?parseInt(r):null;return e.filter(o=>(o.parent_id??null)===t)}escapeHtml(e){const r=document.createElement("div");return r.textContent=e,r.innerHTML}updateFolderSelect(e){const r=document.getElementById("folder-select");if(!r)return;const t=r.value;r.innerHTML='<option value="">ルートフォルダ</option>';const o=(a,n=0)=>{a.forEach(s=>{const c=document.createElement("option");c.value=s.id,c.textContent="　".repeat(n)+s.name,r.appendChild(c);const d=s;"children"in s&&d.children&&d.children.length>0&&o(d.children,n+1)})};o(e),r.value=t}async showCreateFolderDialog(){const e=await h("新しいフォルダ名を入力してください:");!e||!e.trim()||this.createFolder(e.trim(),this.currentFolderId)}async createFolder(e,r=null){try{await p.createFolder(e,r||void 0),i("フォルダを作成しました: "+e).catch(t=>{console.warn("アラート表示エラー:",t)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500)}catch(t){console.error("フォルダ作成エラー:",t);const o=t instanceof Error?t.message:"フォルダ作成に失敗しました";await i("エラー: "+o)}}async showRenameFolderDialog(e){const r=document.querySelector(`[data-folder-id="${e}"] .folder-item`),t=r?r.textContent?.trim().replace("📁","").trim():"",o=await h("新しいフォルダ名を入力してください:",t);!o||!o.trim()||o.trim()===t||this.renameFolder(e,o.trim())}async renameFolder(e,r){try{await p.updateFolder(e,r),await i("フォルダ名を変更しました: "+r),await this.refreshAll()}catch(t){console.error("フォルダ名変更エラー:",t);const o=t instanceof Error?t.message:"フォルダ名変更に失敗しました";await i("エラー: "+o)}}async showMoveFolderDialog(e){try{const t=(await p.getFolders()).data||[];let o=`ルートフォルダに移動する場合は「root」と入力してください。

利用可能なフォルダ:
`;const a=(c,d=0)=>{c.forEach(l=>{l.id!==e&&(o+="　".repeat(d)+`${l.id}: ${l.name}
`);const f=l;"children"in l&&f.children&&f.children.length>0&&a(f.children,d+1)})};a(t);const n=await h(o+`
移動先のフォルダIDを入力してください:`);if(n===null)return;const s=n.toLowerCase()==="root"?null:n;this.moveFolder(e,s)}catch(r){console.error("フォルダ移動ダイアログエラー:",r);const t=r instanceof Error?r.message:"フォルダ移動の準備に失敗しました";await i("エラー: "+t)}}async moveFolder(e,r){try{console.warn("フォルダ移動機能は未実装です",{folderId:e,newParentId:r}),await i("フォルダ移動機能は現在実装中です。");return}catch(t){console.error("フォルダ移動エラー:",t);const o=t instanceof Error?t.message:"フォルダ移動に失敗しました";await i("エラー: "+o)}}async showDeleteFolderDialog(e){const r=document.querySelector(`[data-folder-id="${e}"] .folder-item`),t=r?r.textContent?.trim().replace("📁","").trim():"フォルダ";try{const a=(await p.getFolderFileCount(e)).data?.count||0,n=0;if(a===0&&n===0)await u(`フォルダ「${t}」を削除しますか？`)&&this.deleteFolder(e,!1);else{let s=`フォルダ「${t}」には以下が含まれています：
`;a>0&&(s+=`・ファイル: ${a}個
`),n>0,s+=`
削除方法を選択してください：
`,s+=`「OK」= 中身をルートフォルダに移動して削除
`,s+="「キャンセル」= 削除を中止",await u(s)&&this.deleteFolder(e,!0)}}catch(o){console.error("フォルダ削除確認エラー:",o);const a=o instanceof Error?o.message:"フォルダ情報の取得に失敗しました";await i("エラー: "+a)}}async deleteFolder(e,r=!1){try{const t=await p.deleteFolder(e);if(t.success)await i("フォルダを削除しました");else throw new Error(t.error||"フォルダ削除に失敗しました");await this.refreshAll()}catch(t){console.error("フォルダ削除エラー:",t);const o=t instanceof Error?t.message:"フォルダ削除に失敗しました";await i("エラー: "+o)}}}async function v(m){const e=window.config;if(!e||!e.folders_enabled){await i("フォルダ機能が無効になっています。設定を確認してください。");return}try{const t=(await p.getFolders()).data||[];let o=`ルートフォルダに移動する場合は「root」と入力してください。

利用可能なフォルダ:
`;const a=(c,d=0)=>{c.forEach(l=>{o+="　".repeat(d)+`${l.id}: ${l.name}
`;const f=l;"children"in l&&f.children&&f.children.length>0&&a(f.children,d+1)})};a(t);const n=await h(o+`
移動先のフォルダIDを入力してください:`);if(n===null)return;const s=n.toLowerCase()==="root"?null:n;await y("./app/api/move-file.php",{file_id:m,folder_id:s}),await i("ファイルを移動しました"),window.location.reload()}catch(r){console.error("ファイル移動エラー:",r);const t=r instanceof Error?r.message:"ファイル移動に失敗しました";await i("エラー: "+t)}}w(()=>{console.log("Folder Manager functionality initialized (TypeScript)"),g();const m=window.config;if(m&&m.folders_enabled){const e=new F;window.folderManager=e,console.log("SimpleFolderManager initialized")}else console.log("Folder functionality is disabled or config not available")});window.moveFile=v;
