import { useState, useEffect } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

const useCouriers = (form, sessionLoading) => {
  const [couriers, setCouriers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    const token = localStorage.getItem('user_session_token');
    setLoading(true);
    _service({
      url: '/estafetas',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json }) => {
        if (json.result === true) {
          setCouriers(json.couriers || []);
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Não foi possível carregar os estafetas.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro',
          description: 'Houve uma falha ao carregar a lista de estafetas.'
        });
      },
      end: () => {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    if (sessionLoading) return;

    loadData();
    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/estafetas/meta',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json: metaJson }) => {
        if (metaJson.result === true) {
          setVehicles(metaJson.vehicles || []);
          setStates(metaJson.states || []);
        }
      }
    });
  }, [sessionLoading]);

  const handleFinish = (values) => {
    const token = localStorage.getItem('user_session_token');
    const formattedValues = {
      nome: values.nome,
      telefone: values.telefone,
      data_nascimento: values.data_nascimento ? values.data_nascimento.format('YYYY-MM-DD') : null,
      veiculo_id: values.veiculo_id
    };

    _service({
      url: '/estafetas',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: formattedValues,
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Sucesso',
            description: 'Estafeta adicionado com sucesso.'
          });
          form.resetFields();
          loadData();
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Não foi possível registar o estafeta.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro',
          description: 'Houve uma falha ao registar o estafeta.'
        });
      }
    });
  };

  const handleUpdateStatus = (id, newStatus) => {
    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/estafetas/update-status',
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        id: id,
        estado: newStatus
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Sucesso',
            description: 'Estado do estafeta atualizado com sucesso.'
          });
          loadData();
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Não foi possível atualizar o estado do estafeta.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Houve um problema de ligação ao servidor.'
        });
      }
    });
  };

  return {
    couriers,
    vehicles,
    states,
    loading,
    handleFinish,
    handleUpdateStatus,
    loadData
  };
};

export default useCouriers;
