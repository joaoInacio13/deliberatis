import { useState, useEffect } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

const useOrderDetails = (uid, sessionLoading, isOperator) => {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const fetchAvailableCouriers = (token) => {
    _service({
      url: '/estafetas',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json }) => {
        if (json.result === true) {
          setAvailableCouriers(json.couriers || []);
        }
      }
    });
  };

  const loadOrderDetails = (token, orderUid) => {
    _service({
      url: '/order',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: { uid: orderUid },
      success: ({ json }) => {
        if (json.result === true && json.order) {
          setOrder(json.order);
        } else {
          notification.error({
            message: 'Erro',
            description: 'Encomenda não encontrada.'
          });
          setTimeout(() => {
            window.location.href = "/public/home.html";
          }, 2000);
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Não foi possível carregar os detalhes da encomenda.'
        });
      },
      end: () => {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    if (sessionLoading) return;
    
    const token = localStorage.getItem('user_session_token');
    if (!token || !uid) return;

    loadOrderDetails(token, uid);
    if (isOperator) {
      fetchAvailableCouriers(token);
    }
  }, [sessionLoading, uid, isOperator]);

  const handleOperatorDecision = (status, estafetaId, reason) => {
    const token = localStorage.getItem('user_session_token');

    _service({
      url: '/order/update-status',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        uid: uid,
        status: status,
        estafeta_id: status === 'Em Trânsito' ? estafetaId : null,
        motivo_rejeicao: status === 'Rejeitada' ? reason : null
      },
      start: () => {
        setDecisionSubmitting(true);
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Sucesso',
            description: `Encomenda atualizada com sucesso para '${status}'.`
          });
          loadOrderDetails(token, uid);
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Não foi possível atualizar a encomenda.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro',
          description: 'Houve uma falha ao enviar a decisão.'
        });
      },
      end: () => {
        setDecisionSubmitting(false);
      }
    });
  };

  return {
    loading,
    order,
    availableCouriers,
    decisionSubmitting,
    handleOperatorDecision,
    loadOrderDetails
  };
};

export default useOrderDetails;
