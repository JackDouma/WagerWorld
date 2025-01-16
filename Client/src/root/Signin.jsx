import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Header from '../page/header.jsx'
import Signin from '../page/signin.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <Signin />
  </StrictMode>,
)