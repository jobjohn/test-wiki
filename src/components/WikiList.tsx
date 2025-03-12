import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WikiPage } from '../types';
import { getAllPages, getRootPages, getChildPages, getPagesByTag, getAllTags } from '../services/wikiService';

// URLからクエリパラメータを取得するヘルパー関数
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

// 再帰的にページツリーを表示するコンポーネント
const PageTreeItem = ({ page, searchTerm, level = 0 }: { page: WikiPage, searchTerm: string, level?: number }) => {
  const [expanded, setExpanded] = useState(true);
  const [childPages, setChildPages] = useState<WikiPage[]>([]);
  
  useEffect(() => {
    if (page.children.length > 0) {
      setChildPages(getChildPages(page.id));
    }
  }, [page.id, page.children.length]);
  
  const hasChildren = childPages.length > 0;
  const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase());
  
  // 検索語がある場合、一致するものだけを表示
  if (searchTerm && !matchesSearch) {
    // 子ページが検索に一致するかチェック
    const hasMatchingChild = childPages.some(child => 
      child.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!hasMatchingChild) {
      return null;
    }
  }
  
  return (
    <li className="page-tree-item">
      <div className="page-tree-item-content" style={{ paddingLeft: `${level * 20}px` }}>
        {hasChildren && (
          <button 
            className={`expand-button ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        <Link to={`/page/${page.id}`} className="page-link">
          {page.title}
        </Link>
        {page.tags && page.tags.length > 0 && (
          <div className="page-item-tags">
            {page.tags.map(tag => (
              <Link key={tag} to={`/?tag=${tag}`} className="tag-small">
                {tag}
              </Link>
            ))}
          </div>
        )}
        <span className="page-date">
          最終更新: {page.updatedAt.toLocaleDateString()}
        </span>
      </div>
      
      {expanded && hasChildren && (
        <ul className="page-tree-children">
          {childPages.map(childPage => (
            <PageTreeItem 
              key={childPage.id} 
              page={childPage} 
              searchTerm={searchTerm}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const WikiList = () => {
  const query = useQuery();
  const tagFilter = query.get('tag');
  
  const [rootPages, setRootPages] = useState<WikiPage[]>([]);
  const [allPages, setAllPages] = useState<WikiPage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (tagFilter) {
      // タグでフィルタリング
      const filteredPages = getPagesByTag(tagFilter);
      setAllPages(filteredPages);
      
      // ルートページのみをフィルタリング
      const filteredRootPages = filteredPages.filter(page => page.parentId === null);
      setRootPages(filteredRootPages);
    } else {
      // 通常の取得
      setRootPages(getRootPages());
      setAllPages(getAllPages());
    }
    
    // 全てのタグを取得
    setAllTags(getAllTags());
  }, [tagFilter]);

  // フラットビューでの検索結果
  const filteredPages = allPages.filter(page => 
    page.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="wiki-list">
      <div className="search-container">
        <input
          type="text"
          placeholder="ページを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="view-toggle">
          <button 
            className={`view-toggle-button ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => setViewMode('tree')}
          >
            ツリー表示
          </button>
          <button 
            className={`view-toggle-button ${viewMode === 'flat' ? 'active' : ''}`}
            onClick={() => setViewMode('flat')}
          >
            フラット表示
          </button>
        </div>
      </div>

      {tagFilter && (
        <div className="tag-filter-info">
          <p>タグ「{tagFilter}」でフィルタリング中</p>
          <Link to="/" className="clear-filter">フィルタをクリア</Link>
        </div>
      )}

      {allTags.length > 0 && (
        <div className="all-tags">
          <h3>タグ一覧</h3>
          <div className="tags-cloud">
            {allTags.map(tag => (
              <Link 
                key={tag} 
                to={`/?tag=${tag}`} 
                className={`tag ${tagFilter === tag ? 'active' : ''}`}
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'tree' ? (
        // ツリービュー
        rootPages.length > 0 ? (
          <ul className="page-tree">
            {rootPages.map(page => (
              <PageTreeItem key={page.id} page={page} searchTerm={searchTerm} />
            ))}
          </ul>
        ) : (
          <p className="no-pages">
            {searchTerm || tagFilter ? 
              `"${searchTerm || tagFilter}"に一致するページはありません。` : 
              'ページがありません。新しいページを作成してください。'
            }
          </p>
        )
      ) : (
        // フラットビュー
        filteredPages.length > 0 ? (
          <ul className="page-list">
            {filteredPages.map(page => (
              <li key={page.id} className="page-item">
                <div className="page-item-content">
                  <Link to={`/page/${page.id}`} className="page-link">
                    {page.title}
                  </Link>
                  {page.tags && page.tags.length > 0 && (
                    <div className="page-item-tags">
                      {page.tags.map(tag => (
                        <Link key={tag} to={`/?tag=${tag}`} className="tag-small">
                          {tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <span className="page-date">
                  最終更新: {page.updatedAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-pages">
            {searchTerm || tagFilter ? 
              `"${searchTerm || tagFilter}"に一致するページはありません。` : 
              'ページがありません。新しいページを作成してください。'
            }
          </p>
        )
      )}

      <div className="actions">
        <Link to="/new" className="create-button">
          新規ページ作成
        </Link>
      </div>
    </div>
  );
};

export default WikiList; 