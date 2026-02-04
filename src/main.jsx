import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { BlockProvider } from './context/BlockContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BlockProvider>
        <App />
      </BlockProvider>
    </AuthProvider>
  </React.StrictMode>,
)
