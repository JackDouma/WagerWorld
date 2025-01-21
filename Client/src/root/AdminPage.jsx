import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminPage from '../page/admin.jsx'
import Header from '../page/header.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <AdminPage />
  </StrictMode>,
)
