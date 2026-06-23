import React, { useEffect, useState, useRef } from 'react';
import { Layout, Button, Spin, Row, Col, Form } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import useSession from '../../common/useSession';
import useOrderDetails from '../../common/useOrderDetails';

import OrderTimeline from '../../components/OrderDetailsComponent/OrderTimeline';
import OrderDetailsInfo from '../../components/OrderDetailsComponent/OrderDetailsInfo';
import OrderDetailsMap from '../../components/OrderDetailsComponent/OrderDetailsMap';
import OrderDecisionPanel from '../../components/OrderDetailsComponent/OrderDecisionPanel';
import EditOrderModal from '../../components/EditOrderModalComponent';
import MapModal from '../../components/MapModalComponent';

import usePostalCode from '../../common/usePostalCode';
import useMapLogic from '../../common/useMapLogic';
import useConfirmMap from '../../common/useConfirmMap';
import useUpdateOrder from '../../common/useUpdateOrder';

const { Header, Content } = Layout;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.substring(0, 19).split(' ');
  if (parts.length === 2) {
    const dateParts = parts[0].split('-');
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      return `${day}/${month}/${year} ${parts[1]}`;
    }
  }
  return dateStr;
};


const OrderDetailsContainer = () => {
  const { sessionLoading, userName, userGroup, logout } = useSession();
  const [uid, setUid] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderUid = params.get('uid');
    if (orderUid) {
      setUid(orderUid);
    }
  }, []);

  const isOperator = userGroup === 'operador';

  const {
    loading,
    order,
    availableCouriers,
    decisionSubmitting,
    handleOperatorDecision,
    loadOrderDetails
  } = useOrderDetails(uid, sessionLoading, isOperator);

  const [form] = Form.useForm();
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

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
    isEditModalOpen,
    setIsEditModalOpen,
    hasConfirmedPin,
    setHasConfirmedPin,
    confirmedCoords,
    setConfirmedCoords,
    submitting,
    handleOpenEditModal,
    handleUpdateOrder
  } = useUpdateOrder({
    order,
    form,
    uid,
    loadOrderDetails: () => {
      const token = localStorage.getItem('user_session_token');
      loadOrderDetails(token, uid);
    },
    setPostalCodeStatus,
    setPostalCodeErrorMsg
  });

  const {
    mapRef: editMapRef,
    mapInstanceRef: editMapInstanceRef,
    markerInstanceRef: editMarkerInstanceRef,
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
    markerInstanceRef: editMarkerInstanceRef,
    mapInstanceRef: editMapInstanceRef,
    reverseGeocode,
    setConfirmedCoords
  });

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (order && order.latitude && order.longitude) {
      if (mapRef.current) {
        if (!mapInstanceRef.current) {
          initMap(order.latitude, order.longitude);
        } else {
          const L = window.L;
          if (L) {
            const latlng = L.latLng(order.latitude, order.longitude);
            if (markerInstanceRef.current) {
              markerInstanceRef.current.setLatLng(latlng);
            }
            mapInstanceRef.current.setView(latlng, 15);
          }
        }
      }
    }
  }, [order]);

  const initMap = (lat, lng) => {
    const L = window.L;
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([lat, lng], 15);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markerInstanceRef.current = L.marker([lat, lng]).addTo(map)
      .bindPopup('Morada de Entrega')
      .openPopup();
  };

  const getStatusIndex = (status) => {
    switch (status) {
      case 'Pendente':
        return 0;
      case 'Em Trânsito':
        return 1;
      case 'Entregue':
        return 2;
      default:
        return 0;
    }
  };

  if (sessionLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Spin size="large" tip="A carregar detalhes da encomenda..." />
      </div>
    );
  }

  const statusIndex = order ? getStatusIndex(order.estado) : 0;

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <img src="/public/images/logo_deliberatis.png" alt="Deliberatis Logo" style={{ maxHeight: '38px', width: 'auto' }} />
        </div>
        <div style={{ color: '#666', fontWeight: '500', fontSize: '16px' }}>
          Olá, {userName}
        </div>
      </Header>

      <Content style={{ padding: '40px 24px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', position: 'relative', minHeight: '48px' }}>
          <Button 
            type="primary" 
            size="large"
            icon={<ArrowLeftOutlined />} 
            onClick={() => window.location.href = "/public/home.html"}
            style={{ borderRadius: '6px', backgroundColor: '#5b5ce1', borderColor: '#5b5ce1', position: 'absolute', left: 0, paddingLeft: '20px', paddingRight: '20px' }}
          >
            Voltar
          </Button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2 style={{ margin: 0, color: '#333333', fontSize: '30px', fontWeight: '600' }}>
              Detalhes da Encomenda
            </h2>
            <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '16px' }}>Código único: #{uid}</p>
          </div>
          {order && !isOperator && (
            <Button 
              type="primary"
              size="large"
              icon={<EditOutlined />}
              disabled={order.estado !== 'Pendente'}
              onClick={handleOpenEditModal}
              style={{ borderRadius: '6px', position: 'absolute', right: 0, backgroundColor: order.estado === 'Pendente' ? '#5b5ce1' : undefined, borderColor: order.estado === 'Pendente' ? '#5b5ce1' : undefined }}
            >
              Editar
            </Button>
          )}
        </div>

        {order && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Timeline do Estado */}
            <OrderTimeline statusIndex={statusIndex} statusText={order.estado} rejectionReason={order.motivo_rejeicao} />

            {/* Informações e Mapa */}
            <Row gutter={[32, 32]}>
              <Col xs={24} md={12}>
                <OrderDetailsInfo order={order} formatDate={formatDate} />
              </Col>

              <Col xs={24} md={12}>
                <OrderDetailsMap order={order} mapRef={mapRef} />
              </Col>
            </Row>

            {/* Operator Assignment Panel */}
            {isOperator && order.estado === 'Pendente' && (
              <OrderDecisionPanel
                couriers={availableCouriers}
                submitting={decisionSubmitting}
                onDecision={(status, estafetaId, reason) => handleOperatorDecision(status, estafetaId, reason)}
              />
            )}
          </div>
        )}
      </Content>

      <EditOrderModal
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        form={form}
        submitting={submitting}
        onFinish={handleUpdateOrder}
        openMapModal={() => handleOpenMapModal(hasConfirmedPin)}
        postalCodeStatus={postalCodeStatus}
        postalCodeErrorMsg={postalCodeErrorMsg}
        loadingPostalCode={loadingPostalCode}
        handlePostalCodeChange={handlePostalCodeChange}
      />

      <MapModal
        open={isMapModalOpen}
        onCancel={() => setIsMapModalOpen(false)}
        onConfirmLocation={() => handleConfirmLocation()}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchingMap={searchingMap}
        handleMapSearch={handleMapSearch}
        mapRef={editMapRef}
      />
    </Layout>
  );
};

export default OrderDetailsContainer;
