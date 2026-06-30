import React, { useState } from 'react';
import Login from './login';
import Register from './register';
import './index.less';

/**
 * Contentor principal de Autenticação (regula a alternância entre ecrãs de Login e Registo)
 */
const AuthContainer = ({ onLoginSuccess }) => {
  const [screen, setScreen] = useState('login');

  return (
    <div className="auth">
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
