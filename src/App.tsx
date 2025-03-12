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

  useEffect(() => {
    setPages(getAllPages());
  }, []);

  // ページが変更されたときに再取得するための関数
  const refreshPages = () => {
    setPages(getAllPages());
  };

  return (
    <Router>
      <div className="app-container">
        <div className="app-content">
          <aside className="sidebar">
            <div className="sidebar-header">
              <Link to="/" className="sidebar-title">
                <h2>Wiki App</h2>
              </Link>
            </div>
            <nav className="sidebar-nav">
              <ul>
                <li>
                  <Link to="/">ホーム</Link>
                </li>
                <li>
                  <Link to="/new">新規ページ作成</Link>
                </li>
              </ul>
              <h3>最近のページ</h3>
              <ul>
                {pages.slice(0, 5).map(page => (
                  <li key={page.id}>
                    <Link to={`/page/${page.id}`}>{page.title}</Link>
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
