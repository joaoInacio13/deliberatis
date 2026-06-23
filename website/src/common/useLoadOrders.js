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

  const handleStatusChange = (orderUid, newStatus) => {
    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/order/status',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        uid: orderUid,
        estado: newStatus
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Sucesso',
            description: 'Estado da encomenda atualizado para ' + newStatus + '.'
          });
          loadOrders(token);
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Não foi possível atualizar o estado.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Falha ao comunicar com o servidor.'
        });
      }
    });
  };

  return {
    orders,
    setOrders,
    loading,
    setLoading,
    loadOrders,
    handleStatusChange
  };
}
