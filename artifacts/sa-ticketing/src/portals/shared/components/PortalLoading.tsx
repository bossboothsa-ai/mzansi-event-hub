import { useState, useEffect } from 'react';

export function PortalLoading() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="portal-loading-screen">
      <div className="loading-spinner" />
      <p>Loading<span>{'.'.repeat(dots)}</span></p>
    </div>
  );
}