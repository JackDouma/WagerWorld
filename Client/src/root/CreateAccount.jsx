import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Header from '../page/header.jsx'
import Signup from '../page/signup.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <Signup />
  </StrictMode>,
)
