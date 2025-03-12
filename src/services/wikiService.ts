import { v4 as uuidv4 } from 'uuid';
import { WikiPage } from '../types';

// ローカルストレージのキー
const STORAGE_KEY = 'wiki_pages';

// ローカルストレージからWikiページを取得
const getPages = (): WikiPage[] => {
  const pagesJson = localStorage.getItem(STORAGE_KEY);
  if (!pagesJson) return [];
  
  try {
    const pages = JSON.parse(pagesJson);
    return pages.map((page: any) => ({
      ...page,
      createdAt: new Date(page.createdAt),
      updatedAt: new Date(page.updatedAt),
      parentId: page.parentId || null,
      children: page.children || [],
      tags: page.tags || []
    }));
  } catch (error) {
    console.error('Failed to parse wiki pages from localStorage:', error);
    return [];
  }
};

// ローカルストレージにWikiページを保存
const savePages = (pages: WikiPage[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
};

// 全てのWikiページを取得
export const getAllPages = (): WikiPage[] => {
  return getPages();
};

// ルートページ（親を持たないページ）のみを取得
export const getRootPages = (): WikiPage[] => {
  const pages = getPages();
  return pages.filter(page => page.parentId === null);
};

// 特定の親ページの子ページを取得
export const getChildPages = (parentId: string): WikiPage[] => {
  const pages = getPages();
  return pages.filter(page => page.parentId === parentId);
};

// IDでWikiページを取得
export const getPageById = (id: string): WikiPage | undefined => {
  const pages = getPages();
  return pages.find(page => page.id === id);
};

// タイトルでWikiページを取得
export const getPageByTitle = (title: string): WikiPage | undefined => {
  const pages = getPages();
  return pages.find(page => page.title.toLowerCase() === title.toLowerCase());
};

// 新しいWikiページを作成
export const createPage = (
  title: string, 
  content: string, 
  parentId: string | null = null,
  tags: string[] = []
): WikiPage => {
  const pages = getPages();
  
  // 同じタイトルのページが存在するかチェック
  if (pages.some(page => page.title.toLowerCase() === title.toLowerCase())) {
    throw new Error(`Page with title "${title}" already exists`);
  }
  
  const newPage: WikiPage = {
    id: uuidv4(),
    title,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    parentId,
    children: [],
    tags
  };
  
  pages.push(newPage);
  
  // 親ページが指定されている場合、親ページの子リストに追加
  if (parentId) {
    const parentIndex = pages.findIndex(page => page.id === parentId);
    if (parentIndex !== -1) {
      pages[parentIndex].children.push(newPage.id);
    }
  }
  
  savePages(pages);
  
  return newPage;
};

// Wikiページを更新
export const updatePage = (
  id: string, 
  title: string, 
  content: string, 
  parentId: string | null = null,
  tags: string[] = []
): WikiPage => {
  const pages = getPages();
  const pageIndex = pages.findIndex(page => page.id === id);
  
  if (pageIndex === -1) {
    throw new Error(`Page with id "${id}" not found`);
  }
  
  // 同じタイトルの別のページが存在するかチェック
  const existingPageWithTitle = pages.find(page => 
    page.title.toLowerCase() === title.toLowerCase() && page.id !== id
  );
  
  if (existingPageWithTitle) {
    throw new Error(`Another page with title "${title}" already exists`);
  }
  
  const oldParentId = pages[pageIndex].parentId;
  
  // 親ページが変更された場合
  if (oldParentId !== parentId) {
    // 古い親ページから子リストを削除
    if (oldParentId) {
      const oldParentIndex = pages.findIndex(page => page.id === oldParentId);
      if (oldParentIndex !== -1) {
        pages[oldParentIndex].children = pages[oldParentIndex].children.filter(childId => childId !== id);
      }
    }
    
    // 新しい親ページの子リストに追加
    if (parentId) {
      const newParentIndex = pages.findIndex(page => page.id === parentId);
      if (newParentIndex !== -1) {
        // 循環参照をチェック
        if (isDescendant(pages, id, parentId)) {
          throw new Error('Cannot set a descendant as a parent (circular reference)');
        }
        pages[newParentIndex].children.push(id);
      }
    }
  }
  
  const updatedPage: WikiPage = {
    ...pages[pageIndex],
    title,
    content,
    parentId,
    tags,
    updatedAt: new Date()
  };
  
  pages[pageIndex] = updatedPage;
  savePages(pages);
  
  return updatedPage;
};

// Wikiページを削除
export const deletePage = (id: string): void => {
  const pages = getPages();
  const pageToDelete = pages.find(page => page.id === id);
  
  if (!pageToDelete) {
    throw new Error(`Page with id "${id}" not found`);
  }
  
  // 子ページを再帰的に削除
  const deleteChildrenRecursively = (parentId: string) => {
    const childrenIds = pages.find(p => p.id === parentId)?.children || [];
    
    for (const childId of childrenIds) {
      deleteChildrenRecursively(childId);
    }
    
    // このページのIDを持つページを配列から削除
    const index = pages.findIndex(p => p.id === parentId);
    if (index !== -1) {
      pages.splice(index, 1);
    }
  };
  
  // 親ページの子リストからこのページを削除
  if (pageToDelete.parentId) {
    const parentIndex = pages.findIndex(page => page.id === pageToDelete.parentId);
    if (parentIndex !== -1) {
      pages[parentIndex].children = pages[parentIndex].children.filter(childId => childId !== id);
    }
  }
  
  // このページとその子孫を削除
  deleteChildrenRecursively(id);
  
  savePages(pages);
};

// ページの階層構造を取得（ツリー形式）
export const getPageHierarchy = (): WikiPage[] => {
  const pages = getPages();
  return pages.filter(page => page.parentId === null);
};

// 指定したページが別のページの子孫かどうかをチェック（循環参照防止用）
const isDescendant = (pages: WikiPage[], pageId: string, potentialDescendantId: string): boolean => {
  if (pageId === potentialDescendantId) return true;
  
  const page = pages.find(p => p.id === pageId);
  if (!page) return false;
  
  for (const childId of page.children) {
    if (isDescendant(pages, childId, potentialDescendantId)) {
      return true;
    }
  }
  
  return false;
};

// タグでWikiページを検索
export const getPagesByTag = (tag: string): WikiPage[] => {
  const pages = getPages();
  return pages.filter(page => page.tags.includes(tag));
};

// 全てのタグを取得
export const getAllTags = (): string[] => {
  const pages = getPages();
  const tagsSet = new Set<string>();
  
  pages.forEach(page => {
    page.tags.forEach(tag => tagsSet.add(tag));
  });
  
  return Array.from(tagsSet).sort();
}; 