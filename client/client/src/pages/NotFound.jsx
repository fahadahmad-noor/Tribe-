import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="page" id="not-found-page">
    <div className="container text-center" style={{paddingTop:'var(--space-16)'}}>
      <h1 style={{fontSize:'6rem',fontWeight:800,color:'var(--text-muted)',lineHeight:1}}>404</h1>
      <h2 className="mt-4">Page not found</h2>
      <p className="text-secondary mt-2">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary mt-6">Go Home</Link>
    </div>
  </div>
);

export default NotFound;


