import { useState } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

export default function useConfirmMap({
  form,
  setIsMapModalOpen,
  setHasConfirmedPin,
  markerInstanceRef,
  mapInstanceRef,
  reverseGeocode,
  setConfirmedCoords
}) {
  const [searchingMap, setSearchingMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleMapSearch = () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    setSearchingMap(true);

    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/map-search',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: { q: searchQuery },
      success: ({ json }) => {
        if (json && json.length > 0) {
          const { lat, lon } = json[0];
          const latFloat = parseFloat(lat);
          const lonFloat = parseFloat(lon);
          mapInstanceRef.current.setView([latFloat, lonFloat], 12);
        } else {
          notification.warning({
            message: 'Pesquisa no Mapa',
            description: 'Localização não encontrada em Portugal.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Pesquisa no Mapa',
          description: 'Houve uma falha ao comunicar com o serviço de pesquisa.'
        });
      },
      end: () => {
        setSearchingMap(false);
      }
    });
  };

  const locateAddressOnMap = (values) => {
    const { rua, cidade, codigo_postal } = values;
    
    // Constrói uma pesquisa altamente precisa usando o código postal se disponível
    const searchTerms = [rua, codigo_postal, cidade, 'Portugal'].filter(Boolean).join(', ');

    setTimeout(() => {
      if (mapInstanceRef.current) {
        const L = window.L;
        if (!L) return;

        const token = localStorage.getItem('user_session_token');
        _service({
          url: '/map-search',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token
          },
          data: { q: searchTerms },
          success: ({ json }) => {
            if (json && json.length > 0) {
              const { lat, lon } = json[0];
              const latFloat = parseFloat(lat);
              const lonFloat = parseFloat(lon);
              const latlng = L.latLng(latFloat, lonFloat);

              if (markerInstanceRef.current) {
                markerInstanceRef.current.setLatLng(latlng);
              } else {
                markerInstanceRef.current = L.marker(latlng).addTo(mapInstanceRef.current);
              }
              mapInstanceRef.current.setView(latlng, 16);
              reverseGeocode(latFloat, lonFloat);
            }
          }
        });
      }
    }, 500);
  };

  const handleConfirmLocation = (confirmCallback) => {
    if (!markerInstanceRef.current) {
      notification.warning({
        message: 'Aviso',
        description: 'Por favor, clica no mapa para colocar o pin antes de confirmar a localização.'
      });
      return;
    }
    const latlng = markerInstanceRef.current.getLatLng();
    setConfirmedCoords({ lat: latlng.lat, lng: latlng.lng });
    setHasConfirmedPin(true);
    setIsMapModalOpen(false);

    if (confirmCallback) {
      confirmCallback(latlng.lat, latlng.lng);
    }
  };

  const handleOpenMapModal = (hasConfirmedPin) => {
    setIsMapModalOpen(true);

    const rua = form.getFieldValue('rua');
    const cidade = form.getFieldValue('cidade');
    const codigo_postal = form.getFieldValue('codigo_postal');

    if (!hasConfirmedPin && (rua || cidade || codigo_postal)) {
      locateAddressOnMap({ rua, cidade, codigo_postal });
    }
  };

  return {
    searchingMap,
    setSearchingMap,
    searchQuery,
    setSearchQuery,
    handleMapSearch,
    handleConfirmLocation,
    handleOpenMapModal,
    locateAddressOnMap
  };
}
