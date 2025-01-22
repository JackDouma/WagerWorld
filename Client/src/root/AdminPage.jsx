import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminPage from '../page/admin.jsx'
import Header from '../page/header.jsx'
import NotFound from '../page/notfound.jsx';
import AdminOnlyRoute from '../component/AdminOnlyRoute.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Header />
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminOnlyRoute>
              <AdminPage />
            </AdminOnlyRoute>
          }
        />
        <Route path="/404" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
