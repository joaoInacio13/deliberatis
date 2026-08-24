import { useState, useEffect } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

const useSession = (allowedGroups = null) => {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userGroup, setUserGroup] = useState('');

  const logout = () => {
    localStorage.removeItem('user_session_token');
    window.location.href = "/auth";
  };

  useEffect(() => {
    const token = localStorage.getItem('user_session_token');
    if (!token) {
      window.location.href = "/auth";
      return;
    }

    _service({
      url: '/check-session',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json }) => {
        if (json.result === true) {
          setUserName(json.primeiro_nome);
          setUserGroup(json.group || 'cliente');
          
          if (allowedGroups && !allowedGroups.includes(json.group)) {
            notification.error({
              message: 'Não Autorizado',
              description: 'Não tens permissão para aceder a esta página.'
            });
            window.location.href = "/home";
          } else {
            setSessionLoading(false);
          }
        } else {
          logout();
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Sessão',
          description: 'Houve uma falha ao verificar a tua sessão.'
        });
        logout();
      }
    });
  }, []);

  return {
    sessionLoading,
    userName,
    userGroup,
    logout
  };
};

export default useSession;
