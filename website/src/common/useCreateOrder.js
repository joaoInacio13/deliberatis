import { useState } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

export default function useCreateOrder({
  loadOrders,
  handleCloseModal,
  setIsMapModalOpen,
  locateAddressOnMap,
  setConfirmedCoords
}) {
  const [submitting, setSubmitting] = useState(false);
  const [isSubmittingFlow, setIsSubmittingFlow] = useState(false);
  const [formValuesToSubmit, setFormValuesToSubmit] = useState(null);

  const handleCreateOrder = (values) => {
    setFormValuesToSubmit(values);
    setIsSubmittingFlow(true);
    setIsMapModalOpen(true);

    notification.info({
      message: 'Confirmação de Morada',
      description: 'Por favor, confirme no mapa se o pin azul está no local exato da sua morada e clique em "Confirmar Localização".'
    });

    locateAddressOnMap(values);
  };

  const submitOrder = (values, logout, extraCoords = {}) => {
    const token = localStorage.getItem('user_session_token');
    if (!token) {
      logout();
      return;
    }

    const payload = {
      ...values,
      ...extraCoords
    };

    _service({
      url: '/orders',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: payload,
      start: () => {
        setSubmitting(true);
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Encomenda Criada!',
            description: 'A tua encomenda foi submetida com sucesso!'
          });
          handleCloseModal();
          loadOrders(token);
        } else {
          notification.error({
            message: 'Erro ao criar encomenda',
            description: json.error || 'Não foi possível submeter a encomenda.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Houve uma falha na ligação ao servidor.'
        });
      },
      end: () => {
        setSubmitting(false);
      }
    });
  };

  const handleConfirmLocation = (logout, lat, lng) => {
    if (isSubmittingFlow && formValuesToSubmit) {
      const extraCoords = { latitude: lat, longitude: lng };
      submitOrder(formValuesToSubmit, logout, extraCoords);
      setIsSubmittingFlow(false);
      setFormValuesToSubmit(null);
    }
  };

  const resetCreateOrderFlow = () => {
    setIsSubmittingFlow(false);
    setFormValuesToSubmit(null);
    setConfirmedCoords(null);
  };

  return {
    submitting,
    isSubmittingFlow,
    formValuesToSubmit,
    handleCreateOrder,
    submitOrder,
    handleConfirmLocation,
    resetCreateOrderFlow
  };
}
