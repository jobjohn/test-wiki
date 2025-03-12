import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPageById, createPage, updatePage, getAllPages, getAllTags } from '../services/wikiService';
import { WikiPage } from '../types';

const WikiForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [availableParents, setAvailableParents] = useState<WikiPage[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!id;

  useEffect(() => {
    // 編集モードの場合、既存のページデータを取得
    if (isEditing && id) {
      const page = getPageById(id);
      if (page) {
        setTitle(page.title);
        setContent(page.content);
        setParentId(page.parentId);
        setTags(page.tags || []);
      } else {
        setError('編集するページが見つかりませんでした。');
      }
    }

    // 親ページとして選択可能なページのリストを取得
    const allPages = getAllPages();
    
    // 編集モードの場合、自分自身と子孫ページは親として選択できないようにする
    if (isEditing && id) {
      // 自分自身と子孫ページのIDを取得する関数
      const getSelfAndDescendantIds = (pageId: string): string[] => {
        const page = allPages.find(p => p.id === pageId);
        if (!page) return [pageId];
        
        const descendantIds = page.children.flatMap(childId => getSelfAndDescendantIds(childId));
        return [pageId, ...descendantIds];
      };
      
      const excludeIds = getSelfAndDescendantIds(id);
      setAvailableParents(allPages.filter(page => !excludeIds.includes(page.id)));
    } else {
      setAvailableParents(allPages);
    }

    // 既存のタグを取得
    setSuggestedTags(getAllTags());
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }

    if (!content.trim()) {
      setError('内容を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isEditing && id) {
        const updatedPage = updatePage(id, title, content, parentId, tags);
        navigate(`/page/${updatedPage.id}`);
      } else {
        const newPage = createPage(title, content, parentId, tags);
        navigate(`/page/${newPage.id}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ページの保存中にエラーが発生しました。');
      }
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="wiki-form">
      <h1>{isEditing ? 'ページを編集' : '新規ページ作成'}</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">タイトル</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ページタイトル"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="parentId">親ページ</label>
          <select
            id="parentId"
            value={parentId || ''}
            onChange={(e) => setParentId(e.target.value || null)}
            disabled={isSubmitting}
          >
            <option value="">なし（ルートページ）</option>
            {availableParents.map(page => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="tags">タグ</label>
          <div className="tags-input-container">
            <div className="tags-list">
              {tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="tag-input-wrapper">
              <input
                type="text"
                id="tagInput"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="タグを入力..."
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="add-tag-button"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || isSubmitting}
              >
                追加
              </button>
            </div>
          </div>
          {suggestedTags.length > 0 && (
            <div className="suggested-tags">
              <span>おすすめタグ: </span>
              {suggestedTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className="suggested-tag"
                  onClick={() => {
                    if (!tags.includes(tag)) {
                      setTags([...tags, tag]);
                    }
                  }}
                  disabled={tags.includes(tag) || isSubmitting}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="content">内容 (Markdown形式)</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdown形式で内容を入力してください"
            rows={15}
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="save-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => navigate(isEditing && id ? `/page/${id}` : '/')}
            disabled={isSubmitting}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
};

export default WikiForm; 