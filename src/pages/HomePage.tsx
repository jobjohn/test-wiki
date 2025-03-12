import WikiList from '../components/WikiList';

const HomePage = () => {
  return (
    <div className="home-page">
      <header className="app-header">
        <h1>Wiki App</h1>
        <p>シンプルなWikiアプリケーション</p>
      </header>
      <main>
        <WikiList />
      </main>
    </div>
  );
};

export default HomePage; 