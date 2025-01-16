import { useState } from 'react'
import '../css/header.css'

function Header() {

  return (
    <header>
        <nav>
            <ul>
                <li><a href="/index">Home</a></li>
                <div class="right">
                    <li><a href="/signin"><i class="fas fa-sign-in-alt"></i>Login</a></li>
                    <li><a href="/signup"><i class="fas fa-user-plus"></i>Sign Up</a></li>
                </div>
            </ul>
        </nav>
    </header>
  )
}

export default Header
