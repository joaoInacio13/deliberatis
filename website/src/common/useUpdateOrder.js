import { useState } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

export default function useUpdateOrder({
  order,
  form,
  uid,
  loadOrderDetails,
  setPostalCodeStatus,
  setPostalCodeErrorMsg
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [hasConfirmedPin, setHasConfirmedPin] = useState(false);
  const [confirmedCoords, setConfirmedCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenEditModal = () => {
    if (order) {
      form.setFieldsValue({
        telefone: order.telefone,
        codigo_postal: order.codigo_postal,
        rua: order.rua,
        cidade: order.cidade,
        porta: order.porta,
        andar: order.andar
      });
      setConfirmedCoords({ lat: order.latitude, lng: order.longitude });
      setHasConfirmedPin(true);
      setPostalCodeStatus('success');
      setPostalCodeErrorMsg('');
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateOrder = (values) => {
    const token = localStorage.getItem('user_session_token');
    setSubmitting(true);
    _service({
      url: '/order',
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        uid: order.uid,
        telefone: values.telefone,
        codigo_postal: values.codigo_postal,
        rua: values.rua,
        cidade: values.cidade,
        porta: values.porta,
        andar: values.andar || '',
        latitude: confirmedCoords ? confirmedCoords.lat : 0.0,
        longitude: confirmedCoords ? confirmedCoords.lng : 0.0
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Sucesso',
            description: 'Encomenda atualizada com sucesso.'
          });
          setIsEditModalOpen(false);
          loadOrderDetails(token, uid);
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Falha ao atualizar a encomenda.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Houve um problema ao comunicar com o servidor.'
        });
      },
      end: () => {
        setSubmitting(false);
      }
    });
  };

  return {
    isEditModalOpen,
    setIsEditModalOpen,
    hasConfirmedPin,
    setHasConfirmedPin,
    confirmedCoords,
    setConfirmedCoords,
    submitting,
    handleOpenEditModal,
    handleUpdateOrder
  };
}
