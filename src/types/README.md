# TypeScript型定義集約

このディレクトリはプロジェクト内で使用されるTypeScript型定義を集中管理するためのものです。

## ファイル構成

### `index.ts`
- 全ての型定義の中央エクスポート
- 他のファイルから `import { SomeType } from '../types'` で利用可能

### `global.ts`
- アプリケーション全体で使用されるグローバル型定義
- FileData, FolderData, AppConfig, ApiResponse等

### `fileManager.ts`
- FileManagerコンポーネント関連の型定義
- SortDirection, ViewMode, FileManagerState等

### `upload.ts`
- ファイルアップロード関連の型定義
- Tus.io, ドラッグ&ドロップ, アップロードオプション等

### `ui.ts`
- UI関連の型定義
- Bootstrap コンポーネント、モーダル、アラート等

### `api.ts`
- API関連の型定義
- APIレスポンス、エンドポイント定義等

## 使用方法

```typescript
// 個別にimport
import { FileData, ApiResponse } from '../types/global';
import { UploadOptions } from '../types/upload';

// まとめてimport（推奨）
import { FileData, ApiResponse, UploadOptions } from '../types';
```

## 型定義移行の履歴

以下のファイルから型定義を集約しました：

- `src/utils/bootstrap.ts` → `types/ui.ts`
- `src/resumable-upload.ts` → `types/upload.ts`
- `src/drag-drop.ts` → `types/upload.ts`
- `src/api/client.ts` → `types/api.ts`

重複していた型定義は統合され、一貫性のある型システムになりました。