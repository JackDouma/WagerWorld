import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Header from '../page/header.jsx'
import JoinOrg from '../page/joinorg.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <JoinOrg />
  </StrictMode>,
)