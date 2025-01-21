import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminPage from '../page/admin.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminPage />
  </StrictMode>,
)
