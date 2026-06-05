import React, { useState } from 'react';
import Login from './login';
import Register from './register';

const AuthContainer = ({ onLoginSuccess }) => {
  const [screen, setScreen] = useState('login'); // Pode ser 'login' ou 'register'

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#141414' // Fundo escuro para condizer com o teu darkAlgorithm
    }}>
      {screen === 'login' ? (
        <Login onNavigate={setScreen} onLoginFake={onLoginSuccess} />
      ) : (
        <Register onNavigate={setScreen} />
      )}
    </div>
  );
};

export default AuthContainer;