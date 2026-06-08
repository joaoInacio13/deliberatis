import React, { useState } from 'react';
import Login from './login';
import Register from './register';

/**
 * Contentor principal de Autenticação (regula a alternância entre ecrãs de Login e Registo)
 */
const AuthContainer = ({ onLoginSuccess }) => {
  // Estado que determina qual o ecrã ativo: 'login' ou 'register'
  const [screen, setScreen] = useState('login');

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5' // Fundo claro a condizer com o tema claro
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
