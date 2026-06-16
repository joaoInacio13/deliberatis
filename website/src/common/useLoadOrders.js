import { useState, useCallback } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

export default function useLoadOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback((token) => {
    setLoading(true);
    _service({
      url: '/orders',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json }) => {
        if (json.result === true) {
          setOrders(json.orders || []);
        } else {
          notification.error({
            message: 'Erro ao carregar encomendas',
            description: json.error || 'Ocorreu um erro inesperado.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Não foi possível obter a lista de encomendas do servidor.'
        });
      },
      end: () => {
        setLoading(false);
      }
    });
  }, []);

  return {
    orders,
    setOrders,
    loading,
    setLoading,
    loadOrders
  };
}
