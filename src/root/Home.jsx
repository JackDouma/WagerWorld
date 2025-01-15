import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../css/index.css'
import Header from '../page/header.jsx'
import Index from '../page/index.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <Index />
  </StrictMode>,
)
