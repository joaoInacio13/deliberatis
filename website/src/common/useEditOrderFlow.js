import { useState } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';
import usePostalCode from './usePostalCode';
import useMapLogic from './useMapLogic';
import useConfirmMap from './useConfirmMap';

const useEditOrderFlow = ({ order, form, uid, loadOrderDetails }) => {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [hasConfirmedPin, setHasConfirmedPin] = useState(false);
  const [confirmedCoords, setConfirmedCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    loadingPostalCode,
    setLoadingPostalCode,
    postalCodeStatus,
    setPostalCodeStatus,
    postalCodeErrorMsg,
    setPostalCodeErrorMsg,
    handlePostalCodeChange
  } = usePostalCode(form);

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
    handleOpenMapModal
  } = useConfirmMap({
    form,
    setIsMapModalOpen,
    setHasConfirmedPin,
    markerInstanceRef,
    mapInstanceRef,
    reverseGeocode,
    setConfirmedCoords
  });

  return {
    isEditModalOpen,
    setIsEditModalOpen,
    submitting,
    handleOpenEditModal,
    handleUpdateOrder,

    // Postal code status
    postalCodeStatus,
    postalCodeErrorMsg,
    loadingPostalCode,
    handlePostalCodeChange,

    // Map status
    isMapModalOpen,
    setIsMapModalOpen,
    hasConfirmedPin,
    mapRef,
    searchingMap,
    searchQuery,
    setSearchQuery,
    handleMapSearch,
    handleConfirmLocation,
    handleOpenMapModal
  };
};

export default useEditOrderFlow;
