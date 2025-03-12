import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { marked } from 'marked';
import { getPageById, deletePage, getChildPages } from '../services/wikiService';
import { WikiPage as WikiPageType } from '../types';

const WikiPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<WikiPageType | null>(null);
  const [parentPage, setParentPage] = useState<WikiPageType | null>(null);
  const [childPages, setChildPages] = useState<WikiPageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPage = getPageById(id);
      if (foundPage) {
        setPage(foundPage);
        
        // 親ページを取得
        if (foundPage.parentId) {
          const parent = getPageById(foundPage.parentId);
          if (parent) {
            setParentPage(parent);
          }
        } else {
          setParentPage(null);
        }
        
        // 子ページを取得
        const children = getChildPages(id);
        setChildPages(children);
      } else {
        setError('ページが見つかりませんでした。');
      }
    } else {
      setError('無効なページIDです。');
    }
    setLoading(false);
  }, [id]);

  const handleDelete = () => {
    if (id) {
      try {
        deletePage(id);
        navigate('/');
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('ページの削除中にエラーが発生しました。');
        }
        setShowDeleteConfirm(false);
      }
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <Link to="/" className="back-link">ホームに戻る</Link>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="not-found">
        <p>ページが見つかりませんでした。</p>
        <Link to="/" className="back-link">ホームに戻る</Link>
      </div>
    );
  }

  return (
    <div className="wiki-page">
      <div className="page-header">
        <div className="page-breadcrumb">
          {parentPage && (
            <div className="parent-page">
              <Link to={`/page/${parentPage.id}`}>
                <i className="breadcrumb-icon">↑</i> {parentPage.title}
              </Link>
            </div>
          )}
        </div>
        <h1>{page.title}</h1>
        <div className="page-meta">
          <span>作成日: {page.createdAt.toLocaleDateString()}</span>
          <span>最終更新: {page.updatedAt.toLocaleDateString()}</span>
        </div>
        {page.tags && page.tags.length > 0 && (
          <div className="page-tags">
            {page.tags.map(tag => (
              <Link key={tag} to={`/?tag=${tag}`} className="tag">
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div 
        className="page-content"
        dangerouslySetInnerHTML={{ __html: marked(page.content) }}
      />

      {childPages.length > 0 && (
        <div className="child-pages">
          <h3>子ページ</h3>
          <ul className="child-pages-list">
            {childPages.map(childPage => (
              <li key={childPage.id}>
                <Link to={`/page/${childPage.id}`}>
                  {childPage.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="page-actions">
        <Link to={`/edit/${page.id}`} className="edit-button">
          編集
        </Link>
        <button 
          className="delete-button"
          onClick={() => setShowDeleteConfirm(true)}
        >
          削除
        </button>
        <Link to="/" className="back-button">
          戻る
        </Link>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm">
          <p>本当にこのページを削除しますか？{childPages.length > 0 && ' 子ページも全て削除されます。'}</p>
          <div className="confirm-actions">
            <button 
              className="confirm-yes" 
              onClick={handleDelete}
            >
              はい
            </button>
            <button 
              className="confirm-no"
              onClick={() => setShowDeleteConfirm(false)}
            >
              いいえ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WikiPage; 