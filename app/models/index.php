<?php

class Index
{
    public function index()
    {

        $config = new config();
        $ret = $config->index();
        //配列キーが設定されている配列なら展開
        if (!is_null($ret)) {
            if (is_array($ret)) {
                extract($ret);
            }
        }

        //データベースの作成・オープン
        try {
            $db = new PDO('sqlite:' . $db_directory . '/uploader.db');
        } catch (Exception $e) {
            $error = '500 - データベースの接続に失敗しました: ' . $e->getMessage();
            include('./app/views/header.php');
            include('./app/views/error.php');
            include('./app/views/footer.php');
            exit;
        }

        // デフォルトのフェッチモードを連想配列形式に設定
        // (毎回PDO::FETCH_ASSOCを指定する必要が無くなる)
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        // フォルダ情報を含むファイル一覧取得
        $current_folder_id = isset($_GET['folder']) && $_GET['folder'] !== '' ? (int)$_GET['folder'] : null;

        $query = "
            SELECT 
                u.*,
                f.name as folder_name
            FROM uploaded u
            LEFT JOIN folders f ON u.folder_id = f.id
        ";

        // フォルダフィルタリング
        $params = [];
        if ($current_folder_id !== null) {
            $query .= " WHERE u.folder_id = ?";
            $params[] = $current_folder_id;
        }
        // ルートの場合はフィルタリングしない（すべてのファイルを表示）

        $query .= " ORDER BY u.input_date DESC";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $r = $stmt->fetchAll();
        // 数値フィールドの型を修正
        foreach ($r as &$row) {
            if (isset($row['count'])) {
                $row['count'] = (int)$row['count'];
            }
            if (isset($row['size'])) {
                $row['size'] = (int)$row['size'];
            }
            if (isset($row['input_date'])) {
                $row['input_date'] = (int)$row['input_date'];
            }
        }


        // フォルダ一覧も取得
        $folder_stmt = $db->prepare("SELECT * FROM folders ORDER BY name");
        $folder_stmt->execute();
        $folders = $folder_stmt->fetchAll();

        // 現在のフォルダ情報を取得
        $current_folder = null;
        if ($current_folder_id) {
            $current_stmt = $db->prepare("SELECT * FROM folders WHERE id = ?");
            $current_stmt->execute([$current_folder_id]);
            $current_folder = $current_stmt->fetch();
        }

        // パンくずリスト用にフォルダ階層を取得
        $breadcrumb = [];
        if ($current_folder) {
            $folder = $current_folder;
            $breadcrumb[] = $folder;
            while ($folder && $folder['parent_id']) {
                $stmt = $db->prepare("SELECT * FROM folders WHERE id = ?");
                $stmt->execute([$folder['parent_id']]);
                $folder = $stmt->fetch();
                if ($folder) {
                    $breadcrumb[] = $folder;
                } else {
                    break;
                }
            }
            $breadcrumb = array_reverse($breadcrumb);
        }

        return array(
            'data' => $r,
            'folders' => $folders,
            'current_folder' => $current_folder,
            'current_folder_id' => $current_folder_id,
            'breadcrumb' => $breadcrumb
        );
    }
}
