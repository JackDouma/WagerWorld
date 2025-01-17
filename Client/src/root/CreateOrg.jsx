import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Header from '../page/header.jsx'
import CreateOrg from '../page/createorg.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <CreateOrg />
  </StrictMode>,
)