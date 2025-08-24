import{r as F,i as v}from"./error-handling.js";import{a as p}from"./bootstrap.js";import{a as f,F as y}from"./api-client.js";import{c as w,s as i,a as g}from"./modal.js";import"./http.js";class b{currentFolderId=null;constructor(){this.init()}init(){const r=new URLSearchParams(window.location.search);this.currentFolderId=r.get("folder")||null,this.setupEventListeners(),this.loadFolderOptions()}setupEventListeners(){this.bindCreateFolderButton(),document.addEventListener("click",r=>{const t=r.target;if(t.classList.contains("rename-folder")){r.preventDefault();const e=t.dataset.folderId;e&&this.showRenameFolderDialog(e)}if(t.classList.contains("move-folder")){r.preventDefault();const e=t.dataset.folderId;e&&this.showMoveFolderDialog(e)}if(t.classList.contains("delete-folder")){r.preventDefault();const e=t.dataset.folderId;e&&this.showDeleteFolderDialog(e)}})}bindCreateFolderButton(){const r=document.getElementById("create-folder-btn");r?r.addEventListener("click",()=>this.showCreateFolderDialog()):setTimeout(()=>this.bindCreateFolderButton(),500)}async loadFolderOptions(){try{const r=await f.getFolders();if(!r){console.error("フォルダAPI応答が null または undefined です");return}if(!r.success){console.error("フォルダAPI応答でエラー:",r.error||"Unknown error");return}const t=r.data?.folders||[];if(!Array.isArray(t)){console.error("フォルダデータが配列ではありません:",typeof t);return}this.updateFolderSelect(t)}catch(r){console.error("フォルダ読み込みエラー:",r)}}async refreshAll(){try{await this.loadFolderOptions(),window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():console.warn("FolderManager.refreshAll: FileManagerが見つかりません"),await this.refreshFolderNavigation()}catch(r){console.error("フォルダとファイル表示の更新に失敗:",r)}}async refreshFolderNavigation(){try{const r=this.currentFolderId,t=await y.getFiles(r||void 0,{includeFolders:!0,includeBreadcrumb:!0});if(t.success&&t.data){const e=t.data;this.updateBreadcrumb(e.breadcrumb||[]),this.updateFolderDisplay(e.folders||[]),Array.isArray(e.folders)&&(window.folderData=e.folders)}else console.error("フォルダデータの取得に失敗:",t.error||t.message)}catch(r){console.error("フォルダナビゲーション更新エラー:",r)}}updateBreadcrumb(r){const t=document.querySelector(".breadcrumb");if(t){let e=`<li><a href="?folder=" class="breadcrumb-link">${p.home(16)} ルート</a></li>`;r.forEach((o,s)=>{s+1===r.length?e+=`<li class="active">${this.escapeHtml(o.name)}</li>`:e+=`
            <li>
              <a href="?folder=${o.id}" class="breadcrumb-link">
                ${this.escapeHtml(o.name)}
              </a>
            </li>
          `}),t.innerHTML=e}}updateFolderDisplay(r){const t=document.getElementById("folder-grid");if(t){const e=this.getChildFolders(r,this.currentFolderId);if(e.length===0){t.innerHTML="";const o=t.parentElement;if(o&&!o.querySelector(".text-center.text-muted")){const n=document.createElement("div");n.className="text-center text-muted",n.style.padding="20px",n.innerHTML=`
              <span class="glyphicon glyphicon-folder-open" 
                    style="font-size: 2em; margin-bottom: 10px; display: block;"></span>
              フォルダがありません
            `,o.appendChild(n)}}else{const o=t.parentElement;if(o){const n=o.querySelector(".text-center.text-muted");n&&n.remove()}let s="";e.forEach(n=>{s+=`
            <div class="col-sm-3 col-xs-6" style="margin-bottom: 15px;" data-folder-id="${n.id}">
              <div class="folder-item-wrapper" style="position: relative;">
                <a href="?folder=${n.id}" class="folder-item">
                  <span class="folder-icon">${p.move(18)}</span>
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
                          ${p.edit(16)} 名前変更
                        </a>
                      </li>
                      <li>
                        <a class="dropdown-item move-folder" href="#" data-folder-id="${n.id}">
                          ${p.move(16)} 移動
                        </a>
                      </li>
                      <li><hr class="dropdown-divider"></li>
                      <li>
                        <a class="dropdown-item delete-folder" href="#" data-folder-id="${n.id}" style="color: #d9534f;">
                          ${p.delete(16)} 削除
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          `}),t.innerHTML=s}}}getChildFolders(r,t){const e=t?parseInt(t):null;return r.filter(o=>(o.parent_id??null)===e)}escapeHtml(r){const t=document.createElement("div");return t.textContent=r,t.innerHTML}updateFolderSelect(r){const t=document.getElementById("folder-select");if(!t){setTimeout(()=>{document.getElementById("folder-select")&&this.updateFolderSelect(r)},500);return}const e=t.value;t.innerHTML='<option value="">ルートフォルダ</option>';const o=(s,n=0)=>{if(!Array.isArray(s)){console.error("addOptions: folders が配列ではありません:",s);return}s.forEach(a=>{if(!a||typeof a.id>"u"||typeof a.name>"u"){console.error("無効なフォルダデータ:",a);return}const c=document.createElement("option");c.value=String(a.id),c.textContent="　".repeat(n)+a.name,t.appendChild(c);const l=a;"children"in a&&l.children&&Array.isArray(l.children)&&l.children.length>0&&o(l.children,n+1)})};o(r),t.value=e}async showCreateFolderDialog(){const r=await w("新しいフォルダ名を入力してください:");!r||!r.trim()||this.createFolder(r.trim(),this.currentFolderId)}async createFolder(r,t=null){try{await f.createFolder(r,t||void 0),i("フォルダを作成しました: "+r).catch(e=>{console.warn("アラート表示エラー:",e)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},1e3)}catch(e){console.error("フォルダ作成エラー:",e);const o=e instanceof Error?e.message:"フォルダ作成に失敗しました";await i("エラー: "+o)}}async showRenameFolderDialog(r){const t=document.querySelector(`[data-folder-id="${r}"] .folder-item .folder-name`),e=t?t.textContent?.trim():"",o=await w("新しいフォルダ名を入力してください:",e);!o||!o.trim()||o.trim()===e||this.renameFolder(r,o.trim())}async renameFolder(r,t){try{const e=await f.updateFolder(r,t);if(e.success)i("フォルダ名を変更しました: "+t).catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500);else throw new Error(e.error||"フォルダ名変更に失敗しました")}catch(e){console.error("フォルダ名変更エラー:",e);const o=e instanceof Error?e.message:"フォルダ名変更に失敗しました";await i("エラー: "+o)}}async showMoveFolderDialog(r){try{const e=(await f.getFolders()).data?.folders||[],o=["移動先フォルダを選択してください:","","0: ルートフォルダ（最上位）"],s=(c,l=0)=>{c.forEach(d=>{if(String(d.id)!==String(r)){const u="　".repeat(l+1);o.push(`${u}${d.id}: ${d.name}`)}const m=d;"children"in d&&m.children&&m.children.length>0&&s(m.children,l+1)})};s(e),o.push(""),o.push("移動先のフォルダ番号を入力してください（0でルート）:");const n=await w(o.join(`
`));if(n===null)return;const a=n==="0"?null:n;this.moveFolder(r,a)}catch(t){console.error("フォルダ移動ダイアログエラー:",t);const e=t instanceof Error?t.message:"フォルダ移動の準備に失敗しました";await i("エラー: "+e)}}async moveFolder(r,t){try{const e=await f.moveFolder(r,t);if(e.success)i("フォルダを移動しました").catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},700);else throw new Error(e.error||"フォルダ移動に失敗しました")}catch(e){console.error("フォルダ移動エラー:",e);const o=e instanceof Error?e.message:"フォルダ移動に失敗しました";await i("エラー: "+o)}}async showDeleteFolderDialog(r){const t=document.querySelector(`[data-folder-id="${r}"] .folder-item .folder-name`),e=t?t.textContent?.trim():"フォルダ";try{const s=(await f.getFolderFileCount(r)).data?.count||0,n=0;if(s===0&&n===0)await g(`フォルダ「${e}」を削除しますか？`)&&this.deleteFolder(r,!1);else{let a=`フォルダ「${e}」には以下が含まれています：
`;s>0&&(a+=`・ファイル: ${s}個
`),n>0,a+=`
削除方法を選択してください：
`,a+=`「OK」= 中身をルートフォルダに移動して削除
`,a+="「キャンセル」= 削除を中止",await g(a)&&this.deleteFolder(r,!0)}}catch(o){console.error("フォルダ削除確認エラー:",o);const s=o instanceof Error?o.message:"フォルダ情報の取得に失敗しました";await i("エラー: "+s)}}async deleteFolder(r,t=!1){try{const e=await f.deleteFolder(r,{moveFiles:t});if(e.success)i("フォルダを削除しました").catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500);else throw new Error(e.error||"フォルダ削除に失敗しました")}catch(e){console.error("フォルダ削除エラー:",e);const o=e instanceof Error?e.message:"フォルダ削除に失敗しました";await i("エラー: "+o)}}}async function E(h){const r=window.config;if(!r||!r.folders_enabled){await i("フォルダ機能が無効になっています。設定を確認してください。");return}try{const e=(await f.getFolders()).data?.folders||[],o=["ファイルの移動先フォルダを選択してください:","","0: ルートフォルダ（最上位）"],s=(c,l=0)=>{c.forEach(d=>{const m="　".repeat(l+1);o.push(`${m}${d.id}: ${d.name}`);const u=d;"children"in d&&u.children&&u.children.length>0&&s(u.children,l+1)})};s(e),o.push(""),o.push("移動先のフォルダ番号を入力してください（0でルート）:");const n=await w(o.join(`
`));if(n===null)return;const a=n==="0"?null:n;await y.moveFile(h,a),setTimeout(async()=>{try{window.folderManager?await window.folderManager.refreshAll():window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(c){console.error("ファイル移動: 更新処理エラー:",c),window.location.reload()}},1e3),await i("ファイルを移動しました")}catch(t){console.error("ファイル移動エラー:",t);const e=t instanceof Error?t.message:"ファイル移動に失敗しました";await i("エラー: "+e)}}F(()=>{v();const h=window.config;if(h&&h.folders_enabled){const r=new b;window.folderManager=r}});window.moveFile=E;
