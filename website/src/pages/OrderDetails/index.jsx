import React, { useEffect, useState, useRef } from 'react';
import { Layout, Button, Spin, Row, Col, notification, Form, Card, Select, Input } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';

import OrderTimeline from '../../components/OrderDetailsComponent/OrderTimeline';
import OrderDetailsInfo from '../../components/OrderDetailsComponent/OrderDetailsInfo';
import OrderDetailsMap from '../../components/OrderDetailsComponent/OrderDetailsMap';
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
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [order, setOrder] = useState(null);
  const [uid, setUid] = useState('');

  const [form] = Form.useForm();
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Operator states
  const [isOperator, setIsOperator] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [selectedCourierId, setSelectedCourierId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [isRejectedAction, setIsRejectedAction] = useState(false);

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
    loadOrderDetails: (token, orderUid) => loadOrderDetails(token, orderUid),
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderUid = params.get('uid');
    if (!orderUid) {
      notification.error({
        message: 'Erro',
        description: 'Código de encomenda não fornecido.'
      });
      window.location.href = "/public/home.html";
      return;
    }
    setUid(orderUid);

    const token = localStorage.getItem('user_session_token');
    if (!token) {
      window.location.href = "/public/auth.html";
      return;
    }

    _service({
      url: '/check-session',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json }) => {
        if (json.result === true) {
          setUserName(json.primeiro_nome);
          const userIsOperator = json.group === 'operador';
          setIsOperator(userIsOperator);
          loadOrderDetails(token, orderUid);
          if (userIsOperator) {
            fetchAvailableCouriers(token);
          }
        } else {
          logout();
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Sessão',
          description: 'Houve uma falha ao verificar a tua sessão.'
        });
        logout();
      }
    });

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
          const fetchedOrder = json.order;
          setOrder(fetchedOrder);
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

  const handleOperatorDecision = (status) => {
    const token = localStorage.getItem('user_session_token');
    
    if (status === 'Em Trânsito' && !selectedCourierId) {
      notification.warning({
        message: 'Aviso',
        description: 'Por favor, selecione um estafeta.'
      });
      return;
    }
    
    if (status === 'Rejeitada' && (!rejectionReason || rejectionReason.trim() === '')) {
      notification.warning({
        message: 'Aviso',
        description: 'Por favor, indique o motivo da rejeição.'
      });
      return;
    }

    _service({
      url: '/order/update-status',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        uid: uid,
        status: status,
        estafeta_id: status === 'Em Trânsito' ? selectedCourierId : null,
        motivo_rejeicao: status === 'Rejeitada' ? rejectionReason : null
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
          setIsRejectedAction(false);
          setRejectionReason('');
          setSelectedCourierId(null);
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

  const logout = () => {
    localStorage.removeItem('user_session_token');
    window.location.href = "/public/auth.html";
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

  if (loading) {
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
              <Card 
                title={<span style={{ fontWeight: '700', color: '#333' }}>Decisão do Operador & Atribuição de Estafeta</span>}
                bordered={false}
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
              >
                <Row gutter={[24, 24]} align="bottom">
                  <Col xs={24} md={12}>
                    <span style={{ color: '#666', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Selecionar Estafeta *
                    </span>
                    <Select
                      placeholder="Selecione um estafeta"
                      style={{ width: '100%' }}
                      size="large"
                      showSearch
                      filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                      value={selectedCourierId}
                      onChange={(val) => setSelectedCourierId(val)}
                      disabled={decisionSubmitting || isRejectedAction}
                    >
                      {availableCouriers
                        .filter(c => c.estado === 'Disponível')
                        .map(c => (
                          <Select.Option key={c.id} value={c.id}>
                            {c.nome} ({c.veiculo} - {c.matricula})
                          </Select.Option>
                        ))}
                    </Select>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <Button
                        type="primary"
                        size="large"
                        loading={decisionSubmitting}
                        disabled={isRejectedAction}
                        onClick={() => handleOperatorDecision('Em Trânsito')}
                        style={{ flex: 1, backgroundColor: '#2eb82e', borderColor: '#2eb82e', borderRadius: '6px', fontWeight: '600' }}
                      >
                        Aceitar (Em Trânsito)
                      </Button>
                      <Button
                        type="primary"
                        danger
                        size="large"
                        loading={decisionSubmitting}
                        onClick={() => {
                          if (!isRejectedAction) {
                            setIsRejectedAction(true);
                          } else {
                            handleOperatorDecision('Rejeitada');
                          }
                        }}
                        style={{ flex: 1, borderRadius: '6px', fontWeight: '600' }}
                      >
                        {isRejectedAction ? 'Confirmar Rejeição' : 'Rejeitar Encomenda'}
                      </Button>
                    </div>
                  </Col>

                  {isRejectedAction && (
                    <Col xs={24}>
                      <div style={{ marginTop: '16px' }}>
                        <span style={{ color: '#ff4d4f', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Motivo de Rejeição *
                        </span>
                        <Input.TextArea
                          rows={4}
                          placeholder="Escreva aqui o motivo detalhado para rejeitar esta encomenda..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          disabled={decisionSubmitting}
                        />
                        <Button 
                          type="text" 
                          onClick={() => setIsRejectedAction(false)} 
                          style={{ marginTop: '8px', padding: 0 }}
                        >
                          Cancelar Rejeição
                        </Button>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card>
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
