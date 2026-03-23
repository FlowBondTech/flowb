import React from 'react'
import { usePrivy } from '@privy-io/react-auth'

function SimplePrivyTest() {
  const { ready, authenticated, user, login, logout } = usePrivy()

  if (!ready) {
    return <div style={{ padding: '20px', color: 'white' }}>Loading Privy...</div>
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      padding: '20px',
      background: 'rgba(0,0,0,0.8)',
      border: '1px solid #FF6EC7',
      borderRadius: '10px',
      color: 'white',
      zIndex: 10000
    }}>
      <h3>Privy Debug Panel</h3>
      <p>Ready: {ready ? 'Yes' : 'No'}</p>
      <p>Authenticated: {authenticated ? 'Yes' : 'No'}</p>
      {user && (
        <div>
          <p>User ID: {user.id}</p>
          <p>Email: {user.email?.address || 'None'}</p>
        </div>
      )}
      {!authenticated ? (
        <button 
          onClick={login}
          style={{ 
            padding: '10px 20px', 
            background: '#FF6EC7',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Test Login
        </button>
      ) : (
        <button 
          onClick={logout}
          style={{ 
            padding: '10px 20px', 
            background: '#666',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      )}
    </div>
  )
}

export default SimplePrivyTest