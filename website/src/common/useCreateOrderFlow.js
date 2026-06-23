import { useState } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';
import usePostalCode from './usePostalCode';
import useMapLogic from './useMapLogic';
import useConfirmMap from './useConfirmMap';

const useCreateOrderFlow = (form, loadOrders) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [hasConfirmedPin, setHasConfirmedPin] = useState(false);
  const [confirmedCoords, setConfirmedCoords] = useState(null);

  // States from the old useCreateOrder
  const [submitting, setSubmitting] = useState(false);
  const [isSubmittingFlow, setIsSubmittingFlow] = useState(false);
  const [formValuesToSubmit, setFormValuesToSubmit] = useState(null);

  const {
    loadingPostalCode,
    setLoadingPostalCode,
    postalCodeStatus,
    setPostalCodeStatus,
    postalCodeErrorMsg,
    setPostalCodeErrorMsg,
    handlePostalCodeChange
  } = usePostalCode(form);

  const {
    mapRef,
    mapInstanceRef,
    markerInstanceRef,
    reverseGeocode
  } = useMapLogic({
    form,
    isMapModalOpen,
    setPostalCodeStatus,
    setPostalCodeErrorMsg,
    setLoadingPostalCode,
    setHasConfirmedPin,
    confirmedCoords
  });

  const {
    searchingMap,
    searchQuery,
    setSearchQuery,
    handleMapSearch,
    handleConfirmLocation,
    handleOpenMapModal,
    locateAddressOnMap
  } = useConfirmMap({
    form,
    setIsMapModalOpen,
    setHasConfirmedPin,
    markerInstanceRef,
    mapInstanceRef,
    reverseGeocode,
    setConfirmedCoords
  });

  const handleCloseModal = () => {
    form.resetFields();
    setPostalCodeStatus('none');
    setPostalCodeErrorMsg('');
    setLoadingPostalCode(false);
    setHasConfirmedPin(false);
    
    // reset CreateOrderFlow states
    setIsSubmittingFlow(false);
    setFormValuesToSubmit(null);
    setConfirmedCoords(null);

    setIsModalOpen(false);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

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

  const executeSubmitOnConfirm = (logout, lat, lng) => {
    if (isSubmittingFlow && formValuesToSubmit) {
      const extraCoords = { latitude: lat, longitude: lng };
      submitOrder(formValuesToSubmit, logout, extraCoords);
      setIsSubmittingFlow(false);
      setFormValuesToSubmit(null);
    }
  };

  return {
    isModalOpen,
    handleOpenModal,
    handleCloseModal,
    isMapModalOpen,
    setIsMapModalOpen,
    hasConfirmedPin,
    setHasConfirmedPin,
    submitting,
    handleCreateOrder,
    executeSubmitOnConfirm,
    
    // Postal code status
    postalCodeStatus,
    postalCodeErrorMsg,
    loadingPostalCode,
    handlePostalCodeChange,
    
    // Map status
    mapRef,
    searchingMap,
    searchQuery,
    setSearchQuery,
    handleMapSearch,
    handleConfirmLocation,
    handleOpenMapModal
  };
};

export default useCreateOrderFlow;
