export interface WikiPage {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null; // 親ページのID（ルートページの場合はnull）
  children: string[]; // 子ページのIDリスト
  tags: string[]; // タグのリスト
} 