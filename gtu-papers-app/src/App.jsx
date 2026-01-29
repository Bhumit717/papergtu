import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useLocation } from 'react-router-dom';
import './App.css';

function App() {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/papers_metadata.json')
      .then(res => res.json())
      .then(data => {
        setMetadata(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading metadata:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
    );
  }

  if (!metadata) return <div className="empty-state">Failed to load data.</div>;

  return (
    <Router>
      <div className="app">
        <Header />
        <Breadcrumbs />
        <div className="container">
          <Routes>
            <Route path="/" element={<Home metadata={metadata} />} />
            <Route path="/:branchName" element={<BranchView metadata={metadata} />} />
            <Route path="/:branchName/:semName" element={<SemesterView metadata={metadata} />} />
            <Route path="/:branchName/:semName/:subjectName" element={<SubjectView metadata={metadata} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

// --- Components ---

function Header() {
  return (
    <header className="header">
      <h1>GTU Papers Archive</h1>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
        <p style={{ margin: 0 }}>Browse and download GTU BE examination papers</p>
        <span className="live-badge" style={{
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ display: 'block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
          LIVE
        </span>
      </div>
    </header>
  );
}

function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <div className="breadcrumb">
      <Link to="/">Home</Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const decodedValue = decodeURIComponent(value);
        return (
          <div key={to} style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <Link to={to}>{decodedValue}</Link>
          </div>
        );
      })}
    </div>
  );
}

function Home({ metadata }) {
  const branches = metadata?.branches || [];

  return (
    <div className="neu-card">
      <h2>Select Branch</h2>
      <div className="options-grid">
        {branches.map((branch, idx) => (
          <Link key={idx} to={`/${encodeURIComponent(branch.name)}`} className="neu-btn">
            <span>{branch.name}</span>
            <span className="code">{branch.code}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BranchView({ metadata }) {
  const { branchName } = useParams();
  const branch = metadata.branches.find(b => b.name === decodeURIComponent(branchName));

  if (!branch) return <div className="empty-state">Branch not found</div>;

  return (
    <div className="neu-card">
      <h2>Select Semester</h2>
      <div className="options-grid">
        {branch.semesters.map((sem, idx) => {
          if (sem.subjects.length === 0) return null;
          const semName = sem.number === 1 ? "First Year" : `Semester ${sem.number}`;
          return (
            <Link key={idx} to={`/${encodeURIComponent(branchName)}/${encodeURIComponent(semName)}`} className="neu-btn">
              <span>{semName}</span>
              <span className="code">{sem.subjects.length} Subjects</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SemesterView({ metadata }) {
  const { branchName, semName } = useParams();
  const decodedBranch = decodeURIComponent(branchName);
  const decodedSem = decodeURIComponent(semName);

  const branch = metadata.branches.find(b => b.name === decodedBranch);

  // Logic to find semester based on name or number
  let semester = null;
  if (branch) {
    if (decodedSem === "First Year") {
      semester = branch.semesters.find(s => s.number === 1);
    } else {
      const match = decodedSem.match(/\d+/);
      if (match) {
        const semNum = parseInt(match[0]);
        semester = branch.semesters.find(s => s.number === semNum);
      }
    }
  }

  if (!branch || !semester) return <div className="empty-state">Semester not found</div>;

  return (
    <div className="neu-card">
      <h2>Select Subject</h2>
      <div className="options-grid">
        {semester.subjects.map((subj, idx) => (
          <Link key={idx} to={`/${encodeURIComponent(branchName)}/${encodeURIComponent(semName)}/${encodeURIComponent(subj.name)}`} className="neu-btn">
            <span>{subj.name}</span>
            <span className="code">{subj.code}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SubjectView({ metadata }) {
  const { branchName, semName, subjectName } = useParams();
  const decodedBranch = decodeURIComponent(branchName);
  const decodedSem = decodeURIComponent(semName);
  const decodedSubject = decodeURIComponent(subjectName);

  const branch = metadata.branches.find(b => b.name === decodedBranch);
  let semester = null;
  if (branch) {
    if (decodedSem === "First Year") {
      semester = branch.semesters.find(s => s.number === 1);
    } else {
      const match = decodedSem.match(/\d+/);
      if (match) {
        const semNum = parseInt(match[0]);
        semester = branch.semesters.find(s => s.number === semNum);
      }
    }
  }
  const subject = semester?.subjects.find(s => s.name === decodedSubject);

  if (!subject) return <div className="empty-state">Subject not found</div>;

  const handleView = (paper) => {
    // Construct the GitHub raw URL directly using the relative path structure
    // paper.localPath is something like "01/1/3110001/Summer_2025.pdf"
    // We need: /papers/01/1/3110001/Summer_2025.pdf (which proxies to GitHub raw)

    let path = paper.localPath;
    if (path) {
      // Ensure path uses forward slashes
      path = path.replace(/\\/g, '/');
      const pdfUrl = `/papers/${path}`;
      window.open(pdfUrl, '_blank');
    } else if (paper.downloadUrl) {
      window.open(paper.downloadUrl, '_blank');
    }
  };

  const handleDownload = (paper) => {
    const pdfUrl = paper.downloadUrl || (paper.localPath ? `/papers/${paper.localPath}` : null);
    if (!pdfUrl) return;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${subject.code}_${paper.year}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="neu-card">
      <h2>Available Papers - {subject.name}</h2>
      {subject.papers.length === 0 ? (
        <p className="empty-state">No papers available yet.</p>
      ) : (
        <div className="papers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {subject.papers.map((paper, idx) => (
            <div key={idx} className="paper-card">
              <div className="paper-info">
                <span className="paper-name">{subject.name}</span>
                <span className="paper-year">{paper.year} Paper</span>
              </div>
              <div className="paper-actions">
                <button className="action-btn btn-primary" onClick={() => handleView(paper)}>
                  View
                </button>
                <button className="action-btn btn-secondary" onClick={() => handleDownload(paper)}>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
