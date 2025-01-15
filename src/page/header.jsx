import { useState } from 'react'
import '../css/header.css'

function Header() {

  return (
    <header>
        <nav>
            <ul>
                <li><a href="#">Home</a></li>
                <li><a href="#">About</a></li>
                <div class="right">
                    <li><a href="#"><i class="fas fa-sign-in-alt"></i>Login</a></li>
                    <li><a href="#"><i class="fas fa-user-plus"></i>Sign Up</a></li>
                </div>
            </ul>
        </nav>
    </header>
  )
}

export default Header
