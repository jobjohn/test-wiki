import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import HomePage from './pages/HomePage';
import ViewPage from './pages/ViewPage';
import EditPage from './pages/EditPage';
import NewPage from './pages/NewPage';
import NotFoundPage from './pages/NotFoundPage';
import { getAllPages } from './services/wikiService';
import { WikiPage } from './types';

function App() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setPages(getAllPages());
  }, []);

  // メニューの開閉を切り替える関数
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // メニューを閉じる関数
  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <Router>
      <div className="app-container">
        <div className="mobile-header">
          <Link to="/" className="mobile-title">
            <h2>Wiki App</h2>
          </Link>
          <button 
            className="menu-toggle" 
            onClick={toggleMenu}
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        
        <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={closeMenu}></div>
        
        <div className="app-content">
          <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <Link to="/" className="sidebar-title" onClick={closeMenu}>
                <h2>Wiki App</h2>
              </Link>
            </div>
            <nav className="sidebar-nav">
              <ul>
                <li>
                  <Link to="/" onClick={closeMenu}>ホーム</Link>
                </li>
                <li>
                  <Link to="/new" onClick={closeMenu}>新規ページ作成</Link>
                </li>
              </ul>
              <h3>最近のページ</h3>
              <ul>
                {pages.slice(0, 5).map(page => (
                  <li key={page.id}>
                    <Link to={`/page/${page.id}`} onClick={closeMenu}>{page.title}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/page/:id" element={<ViewPage />} />
              <Route path="/edit/:id" element={<EditPage />} />
              <Route path="/new" element={<NewPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
