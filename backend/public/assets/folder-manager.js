import{r as F,i as v}from"./error-handling.js";import{a as p}from"./bootstrap.js";import{a as h,F as y}from"./api-client.js";import{c as w,s as i,a as g}from"./modal.js";import"./http.js";class b{currentFolderId=null;constructor(){this.init()}init(){const e=new URLSearchParams(window.location.search);this.currentFolderId=e.get("folder")||null,this.setupEventListeners(),this.loadFolderOptions()}setupEventListeners(){this.bindCreateFolderButton(),document.addEventListener("click",e=>{const r=e.target;if(r.classList.contains("rename-folder")){e.preventDefault();const t=r.dataset.folderId;t&&this.showRenameFolderDialog(t)}if(r.classList.contains("move-folder")){e.preventDefault();const t=r.dataset.folderId;t&&this.showMoveFolderDialog(t)}if(r.classList.contains("delete-folder")){e.preventDefault();const t=r.dataset.folderId;t&&this.showDeleteFolderDialog(t)}})}bindCreateFolderButton(){const e=document.getElementById("create-folder-btn");e?e.addEventListener("click",()=>this.showCreateFolderDialog()):setTimeout(()=>this.bindCreateFolderButton(),500)}async loadFolderOptions(){try{const e=await h.getFolders();if(!e){console.error("フォルダAPI応答が null または undefined です");return}if(!e.success){console.error("フォルダAPI応答でエラー:",e.error||"Unknown error");return}const r=e.data?.folders||[];if(!Array.isArray(r)){console.error("フォルダデータが配列ではありません:",typeof r);return}this.updateFolderSelect(r)}catch(e){console.error("フォルダ読み込みエラー:",e)}}async refreshAll(){try{await this.loadFolderOptions(),window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():console.warn("FolderManager.refreshAll: FileManagerが見つかりません"),await this.refreshFolderNavigation()}catch(e){console.error("フォルダとファイル表示の更新に失敗:",e)}}async refreshFolderNavigation(){try{const e=this.currentFolderId,r=await y.getFiles(e||void 0,{includeFolders:!0,includeBreadcrumb:!0});if(r.success&&r.data){const t=r.data;this.updateBreadcrumb(t.breadcrumb||[]),this.updateFolderDisplay(t.folders||[]),Array.isArray(t.folders)&&(window.folderData=t.folders)}else console.error("フォルダデータの取得に失敗:",r.error||r.message)}catch(e){console.error("フォルダナビゲーション更新エラー:",e)}}updateBreadcrumb(e){const r=document.querySelector(".breadcrumb");if(r){const t=window.location.pathname+window.location.hash;let o=`<li><a href="${this.cleanUrlForRoot(t)}" class="breadcrumb-link">${p.home(16)} ルート</a></li>`;e.forEach((s,n)=>{n+1===e.length?o+=`<li class="active">${this.escapeHtml(s.name)}</li>`:o+=`
            <li>
              <a href="?folder=${s.id}" class="breadcrumb-link">
                ${this.escapeHtml(s.name)}
              </a>
            </li>
          `}),r.innerHTML=o}}cleanUrlForRoot(e){try{const r=new URL(window.location.href);return r.pathname+(r.hash||"")}catch{return e}}updateFolderDisplay(e){const r=document.getElementById("folder-grid");if(r){const t=this.getChildFolders(e,this.currentFolderId);if(t.length===0){r.innerHTML="";const o=r.parentElement;if(o&&!o.querySelector(".text-center.text-muted")){const n=document.createElement("div");n.className="text-center text-muted",n.style.padding="20px",n.innerHTML=`
              <span class="glyphicon glyphicon-folder-open" 
                    style="font-size: 2em; margin-bottom: 10px; display: block;"></span>
              フォルダがありません
            `,o.appendChild(n)}}else{const o=r.parentElement;if(o){const n=o.querySelector(".text-center.text-muted");n&&n.remove()}let s="";t.forEach(n=>{s+=`
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
          `}),r.innerHTML=s}}}getChildFolders(e,r){const t=r?parseInt(r):null;return e.filter(o=>(o.parent_id??null)===t)}escapeHtml(e){const r=document.createElement("div");return r.textContent=e,r.innerHTML}updateFolderSelect(e){const r=document.getElementById("folder-select");if(!r){setTimeout(()=>{document.getElementById("folder-select")&&this.updateFolderSelect(e)},500);return}const t=r.value;r.innerHTML='<option value="">ルートフォルダ</option>';const o=(s,n=0)=>{if(!Array.isArray(s)){console.error("addOptions: folders が配列ではありません:",s);return}s.forEach(a=>{if(!a||typeof a.id>"u"||typeof a.name>"u"){console.error("無効なフォルダデータ:",a);return}const c=document.createElement("option");c.value=String(a.id),c.textContent="　".repeat(n)+a.name,r.appendChild(c);const l=a;"children"in a&&l.children&&Array.isArray(l.children)&&l.children.length>0&&o(l.children,n+1)})};o(e),r.value=t}async showCreateFolderDialog(){const e=await w("新しいフォルダ名を入力してください:");!e||!e.trim()||this.createFolder(e.trim(),this.currentFolderId)}async createFolder(e,r=null){try{await h.createFolder(e,r||void 0),i("フォルダを作成しました: "+e).catch(t=>{console.warn("アラート表示エラー:",t)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},1e3)}catch(t){console.error("フォルダ作成エラー:",t);const o=t instanceof Error?t.message:"フォルダ作成に失敗しました";await i("エラー: "+o)}}async showRenameFolderDialog(e){const r=document.querySelector(`[data-folder-id="${e}"] .folder-item .folder-name`),t=r?r.textContent?.trim():"",o=await w("新しいフォルダ名を入力してください:",t);!o||!o.trim()||o.trim()===t||this.renameFolder(e,o.trim())}async renameFolder(e,r){try{const t=await h.updateFolder(e,r);if(t.success)i("フォルダ名を変更しました: "+r).catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500);else throw new Error(t.error||"フォルダ名変更に失敗しました")}catch(t){console.error("フォルダ名変更エラー:",t);const o=t instanceof Error?t.message:"フォルダ名変更に失敗しました";await i("エラー: "+o)}}async showMoveFolderDialog(e){try{const t=(await h.getFolders()).data?.folders||[],o=["移動先フォルダを選択してください:","","0: ルートフォルダ（最上位）"],s=(c,l=0)=>{c.forEach(d=>{if(String(d.id)!==String(e)){const u="　".repeat(l+1);o.push(`${u}${d.id}: ${d.name}`)}const m=d;"children"in d&&m.children&&m.children.length>0&&s(m.children,l+1)})};s(t),o.push(""),o.push("移動先のフォルダ番号を入力してください（0でルート）:");const n=await w(o.join(`
`));if(n===null)return;const a=n==="0"?null:n;this.moveFolder(e,a)}catch(r){console.error("フォルダ移動ダイアログエラー:",r);const t=r instanceof Error?r.message:"フォルダ移動の準備に失敗しました";await i("エラー: "+t)}}async moveFolder(e,r){try{const t=await h.moveFolder(e,r);if(t.success)i("フォルダを移動しました").catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},700);else throw new Error(t.error||"フォルダ移動に失敗しました")}catch(t){console.error("フォルダ移動エラー:",t);const o=t instanceof Error?t.message:"フォルダ移動に失敗しました";await i("エラー: "+o)}}async showDeleteFolderDialog(e){const r=document.querySelector(`[data-folder-id="${e}"] .folder-item .folder-name`),t=r?r.textContent?.trim():"フォルダ";try{const s=(await h.getFolderFileCount(e)).data?.count||0,n=0;if(s===0&&n===0)await g(`フォルダ「${t}」を削除しますか？`)&&this.deleteFolder(e,!1);else{let a=`フォルダ「${t}」には以下が含まれています：
`;s>0&&(a+=`・ファイル: ${s}個
`),n>0,a+=`
削除方法を選択してください：
`,a+=`「OK」= 中身をルートフォルダに移動して削除
`,a+="「キャンセル」= 削除を中止",await g(a)&&this.deleteFolder(e,!0)}}catch(o){console.error("フォルダ削除確認エラー:",o);const s=o instanceof Error?o.message:"フォルダ情報の取得に失敗しました";await i("エラー: "+s)}}async deleteFolder(e,r=!1){try{const t=await h.deleteFolder(e,{moveFiles:r});if(t.success)i("フォルダを削除しました").catch(o=>{console.warn("アラート表示エラー:",o)}),await this.refreshAll(),setTimeout(async()=>{await this.refreshAll()},500);else throw new Error(t.error||"フォルダ削除に失敗しました")}catch(t){console.error("フォルダ削除エラー:",t);const o=t instanceof Error?t.message:"フォルダ削除に失敗しました";await i("エラー: "+o)}}}async function E(f){const e=window.config;if(!e||!e.folders_enabled){await i("フォルダ機能が無効になっています。設定を確認してください。");return}try{const t=(await h.getFolders()).data?.folders||[],o=["ファイルの移動先フォルダを選択してください:","","0: ルートフォルダ（最上位）"],s=(c,l=0)=>{c.forEach(d=>{const m="　".repeat(l+1);o.push(`${m}${d.id}: ${d.name}`);const u=d;"children"in d&&u.children&&u.children.length>0&&s(u.children,l+1)})};s(t),o.push(""),o.push("移動先のフォルダ番号を入力してください（0でルート）:");const n=await w(o.join(`
`));if(n===null)return;const a=n==="0"?null:n;await y.moveFile(f,a),setTimeout(async()=>{try{window.folderManager?await window.folderManager.refreshAll():window.fileManagerInstance?await window.fileManagerInstance.refreshFromServer():window.location.reload()}catch(c){console.error("ファイル移動: 更新処理エラー:",c),window.location.reload()}},1e3),await i("ファイルを移動しました")}catch(r){console.error("ファイル移動エラー:",r);const t=r instanceof Error?r.message:"ファイル移動に失敗しました";await i("エラー: "+t)}}F(()=>{v();const f=window.config;if(f&&f.folders_enabled){const e=new b;window.folderManager=e}});window.moveFile=E;
