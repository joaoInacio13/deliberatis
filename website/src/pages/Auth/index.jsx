import React, { useState } from 'react';
import Login from './login';
import Register from './register';

/**
 * Contentor principal de Autenticação (regula a alternância entre ecrãs de Login e Registo)
 */
const AuthContainer = ({ onLoginSuccess }) => {
  const [screen, setScreen] = useState('login');

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5' 
    }}>
      {/* Condiciona o render com base no estado 'screen' */}
      {screen === 'login' ? (
        <Login onNavigate={setScreen} onLoginFake={onLoginSuccess} />
      ) : (
        <Register onNavigate={setScreen} />
      )}
    </div>
  );
};

export default AuthContainer;
