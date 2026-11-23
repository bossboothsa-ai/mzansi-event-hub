import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/components/error-boundary';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);