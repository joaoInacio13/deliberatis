import { useState, useEffect, useRef } from 'react';
import { notification } from 'antd';
import _service from '@netuno/service-client';

const DISTRITOS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", 
  "Évora", "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", 
  "Porto", "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu"
];

export default function useMapLogic({
  form,
  isMapModalOpen,
  setPostalCodeStatus,
  setPostalCodeErrorMsg,
  setLoadingPostalCode,
  setHasConfirmedPin,
  confirmedCoords
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const reverseGeocode = (lat, lng) => {
    setLoadingPostalCode(true);
    setPostalCodeStatus('none');
    setPostalCodeErrorMsg('');

    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/map-reverse',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: { lat, lng },
      success: ({ json }) => {
        if (json && json.address) {
          const addr = json.address;
          if (addr.country_code !== 'pt') {
            notification.warning({
              message: 'Localização Inválida',
              description: 'Não podes selecionar uma morada fora de Portugal.'
            });
            if (markerInstanceRef.current) {
              markerInstanceRef.current.remove();
              markerInstanceRef.current = null;
            }
            return;
          }
          const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.cycleway || '';
          const postcode = addr.postcode || '';
          
          const districtVal = addr.state || addr.county || addr.city || '';
          const matchedDistrict = DISTRITOS.find(d => 
            districtVal.toLowerCase().includes(d.toLowerCase()) || 
            d.toLowerCase().includes(districtVal.toLowerCase())
          ) || '';

          form.setFieldsValue({
            rua: road,
            codigo_postal: postcode,
            cidade: matchedDistrict || undefined
          });

          setHasConfirmedPin(true);

          if (postcode) {
            setPostalCodeStatus('success');
          } else {
            setPostalCodeStatus('none');
          }
        } else {
          notification.warning({
            message: 'Localização Inválida',
            description: 'Não podes selecionar uma morada fora de Portugal.'
          });
          if (markerInstanceRef.current) {
            markerInstanceRef.current.remove();
            markerInstanceRef.current = null;
          }
        }
      },
      fail: () => {
        setPostalCodeStatus('error');
        setPostalCodeErrorMsg('Houve uma falha ao obter a morada do mapa. Preencha os campos abaixo.');
      },
      end: () => {
        setLoadingPostalCode(false);
      }
    });
  };

  useEffect(() => {
    if (isMapModalOpen) {
      const timer = setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          const L = window.L;
          if (!L) return;

          const defaultCenter = confirmedCoords ? [confirmedCoords.lat, confirmedCoords.lng] : [39.5, -8.0];
          const defaultZoom = confirmedCoords ? 16 : 6;

          const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);
          mapInstanceRef.current = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          // Se já existirem coordenadas confirmadas, desenha o pin inicial imediatamente
          if (confirmedCoords) {
            markerInstanceRef.current = L.marker([confirmedCoords.lat, confirmedCoords.lng]).addTo(map);
          }

          map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            
            if (markerInstanceRef.current) {
              markerInstanceRef.current.setLatLng(e.latlng);
            } else {
              markerInstanceRef.current = L.marker(e.latlng).addTo(map);
            }

            reverseGeocode(lat, lng);
          });
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    }
  }, [isMapModalOpen, confirmedCoords]);

  return {
    mapRef,
    mapInstanceRef,
    markerInstanceRef,
    reverseGeocode
  };
}
