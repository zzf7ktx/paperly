import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PdfEditor from '../features/pdf-editor/pdf-editor';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PdfEditor />
  </StrictMode>,
);
