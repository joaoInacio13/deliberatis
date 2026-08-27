import React, { useEffect, useState, useRef } from 'react';
import { Layout, Button, Spin, Row, Col, Form, Card, Tag, Menu } from 'antd';
import { ArrowLeftOutlined, EditOutlined, OrderedListOutlined, UserSwitchOutlined, UserOutlined } from '@ant-design/icons';
import useSession from '../../common/useSession';
import useOrderDetails from '../../common/useOrderDetails';

import OrderTimeline from '../../components/OrderDetailsComponent/OrderTimeline';
import OrderDetailsInfo from '../../components/OrderDetailsComponent/OrderDetailsInfo';
import OrderDetailsMap from '../../components/OrderDetailsComponent/OrderDetailsMap';
import OrderDecisionPanel from '../../components/OrderDetailsComponent/OrderDecisionPanel';
import EditOrderModal from '../../components/EditOrderModalComponent';
import MapModal from '../../components/MapModalComponent';
import ProfileModal from '../../components/ProfileModalComponent';
import useWS from '../../common/useWS';

import useEditOrderFlow from '../../common/useEditOrderFlow';
import './index.less';

const { Header, Content, Sider } = Layout;

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


const formatDuration = (totalMinutes) => {
  const roundedMin = Math.round(totalMinutes);
  if (roundedMin < 1) {
    return "Menos de 1 min";
  }
  if (roundedMin < 60) {
    return `${roundedMin} min`;
  }
  const hours = Math.floor(roundedMin / 60);
  const remainingMinutes = roundedMin % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};


const OrderDetailsContainer = () => {
  const { sessionLoading, userName, userGroup, logout } = useSession();
  const [currentUserName, setCurrentUserName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (userName) {
      setCurrentUserName(userName);
    }
  }, [userName]);

  const [uid, setUid] = useState('');
  const [courierCoords, setCourierCoords] = useState(null);

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

  const {
    isEditModalOpen,
    setIsEditModalOpen,
    submitting,
    handleOpenEditModal,
    handleUpdateOrder,
    postalCodeStatus,
    postalCodeErrorMsg,
    loadingPostalCode,
    handlePostalCodeChange,
    isMapModalOpen,
    setIsMapModalOpen,
    hasConfirmedPin,
    mapRef: editMapRef,
    searchingMap,
    searchQuery,
    setSearchQuery,
    handleMapSearch,
    handleConfirmLocation,
    handleOpenMapModal
  } = useEditOrderFlow({
    order,
    form,
    uid,
    loadOrderDetails: (token, orderUid) => {
      loadOrderDetails(token, orderUid);
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [fastestCourier, setFastestCourier] = useState(null);
  const [calculatingFastest, setCalculatingFastest] = useState(false);

  // Effect to calculate the fastest available courier using parallel routing lookups
  useEffect(() => {
    if (!isProcessing || !order || !availableCouriers || availableCouriers.length === 0) {
      setFastestCourier(null);
      return;
    }

    const available = availableCouriers.filter(c => c.estado === 'Disponível' && c.latitude && c.longitude);
    if (available.length === 0) {
      setFastestCourier(null);
      return;
    }

    setCalculatingFastest(true);

    const promises = available.map(courier => {
      const url = `https://router.project-osrm.org/route/v1/driving/${courier.longitude},${courier.latitude};${order.longitude},${order.latitude}?overview=false`;
      return fetch(url)
        .then(res => res.json())
        .then(data => {
          let durationMin = 0;
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            durationMin = data.routes[0].duration / 60;
          } else {
            // Fallback straight line distance using simple Haversine formula
            const R = 6371;
            const dLat = (order.latitude - courier.latitude) * Math.PI / 180;
            const dLng = (order.longitude - courier.longitude) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(courier.latitude * Math.PI / 180) * Math.cos(order.latitude * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distKm = R * c;
            const speed = courier.velocidade || 50;
            durationMin = (distKm / speed) * 60;
          }
          return { courier, durationMin };
        })
        .catch(err => {
          console.error("OSRM query failed for courier:", courier.nome, err);
          // Fallback straight line distance using simple Haversine formula
          const R = 6371;
          const dLat = (order.latitude - courier.latitude) * Math.PI / 180;
          const dLng = (order.longitude - courier.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(courier.latitude * Math.PI / 180) * Math.cos(order.latitude * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distKm = R * c;
          const speed = courier.velocidade || 50;
          durationMin = (distKm / speed) * 60;
          return { courier, durationMin };
        });
    });

    Promise.all(promises)
      .then(results => {
        // Sort by duration ascending
        results.sort((a, b) => a.durationMin - b.durationMin);
        if (results.length > 0) {
          setFastestCourier({
            courier: results[0].courier,
            duration: formatDuration(results[0].durationMin)
          });
        }
      })
      .catch(e => {
        console.error("Promise.all error in fastest courier calculation:", e);
      })
      .finally(() => {
        setCalculatingFastest(false);
      });

  }, [isProcessing, order, availableCouriers]);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const procMapRef = useRef(null);
  const procMapInstanceRef = useRef(null);
  const procOrderMarkerRef = useRef(null);
  const procCourierMarkerRef = useRef(null);
  const procRouteLineRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (procMapInstanceRef.current) {
        procMapInstanceRef.current.remove();
        procMapInstanceRef.current = null;
      }
      courierMarkerRef.current = null;
      routeLineRef.current = null;
    };
  }, []);

  // Clean up read-only map instance when switching to processing mode
  useEffect(() => {
    if (isProcessing && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }
  }, [isProcessing]);

  useEffect(() => {
    if (order && order.latitude && order.longitude && !isProcessing) {
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
  }, [order, isProcessing]);

  // Effect to initialize processing map
  useEffect(() => {
    if (isProcessing && order && procMapRef.current) {
      const L = window.L;
      if (!L) return;

      if (!procMapInstanceRef.current) {
        const map = L.map(procMapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([order.latitude, order.longitude], 13);
        procMapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const blueIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        procOrderMarkerRef.current = L.marker([order.latitude, order.longitude], { icon: blueIcon }).addTo(map)
          .bindPopup('Morada de Entrega')
          .openPopup();
      } else {
        const latlng = L.latLng(order.latitude, order.longitude);
        if (procOrderMarkerRef.current) {
          procOrderMarkerRef.current.setLatLng(latlng);
        }
      }
    }

    return () => {
      if (!isProcessing && procMapInstanceRef.current) {
        if (procRouteLineRef.current) {
          procMapInstanceRef.current.removeLayer(procRouteLineRef.current);
          procRouteLineRef.current = null;
        }
        procMapInstanceRef.current.remove();
        procMapInstanceRef.current = null;
        procOrderMarkerRef.current = null;
        procCourierMarkerRef.current = null;
      }
    };
  }, [isProcessing, order]);

  // Effect to update courier marker and draw route on processing map
  useEffect(() => {
    const L = window.L;
    if (!L || !procMapInstanceRef.current || !order) return;

    // Clear old route and stats if exists
    if (procRouteLineRef.current) {
      procMapInstanceRef.current.removeLayer(procRouteLineRef.current);
      procRouteLineRef.current = null;
    }
    setRouteStats(null);

    if (selectedCourier && selectedCourier.latitude && selectedCourier.longitude) {
      const courierLatLng = [selectedCourier.latitude, selectedCourier.longitude];
      
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      if (!procCourierMarkerRef.current) {
        procCourierMarkerRef.current = L.marker(courierLatLng, { icon: redIcon }).addTo(procMapInstanceRef.current)
          .bindPopup(`Estafeta: ${selectedCourier.nome}`).openPopup();
      } else {
        procCourierMarkerRef.current.setLatLng(courierLatLng);
        procCourierMarkerRef.current.getPopup().setContent(`Estafeta: ${selectedCourier.nome}`).openPopup();
      }

      // Fetch route from OSRM
      const url = `https://router.project-osrm.org/route/v1/driving/${selectedCourier.longitude},${selectedCourier.latitude};${order.longitude},${order.latitude}?overview=full&geometries=geojson`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            const latlngs = coords.map(c => [c[1], c[0]]);
            
            // Calculate stats
            const distMeters = data.routes[0].distance;
            const distKm = distMeters / 1000;
            // Use OSRM's simulated duration (in seconds) converted to minutes
            const durationMin = data.routes[0].duration / 60;
            
            // Calculate ETA
            const now = new Date();
            now.setSeconds(now.getSeconds() + (durationMin * 60));
            const etaTime = now.toTimeString().substring(0, 5);

            setRouteStats({
              distance: distKm.toFixed(2),
              duration: formatDuration(durationMin),
              eta: etaTime
            });

            if (procMapInstanceRef.current) {
              if (procRouteLineRef.current) {
                procMapInstanceRef.current.removeLayer(procRouteLineRef.current);
              }
              procRouteLineRef.current = L.polyline(latlngs, {
                color: '#5b5ce1',
                weight: 5,
                opacity: 0.7,
                dashArray: '10, 10'
              }).addTo(procMapInstanceRef.current);

              procMapInstanceRef.current.fitBounds(procRouteLineRef.current.getBounds(), { padding: [60, 60] });
            }
          } else {
            // Fallback straight-line
            const bounds = L.latLngBounds([
              [order.latitude, order.longitude],
              courierLatLng
            ]);
            procMapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
          }
        })
        .catch(err => {
          console.error("Failed to fetch OSRM route:", err);
          // Fallback straight-line distance using simple Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = (order.latitude - selectedCourier.latitude) * Math.PI / 180;
          const dLng = (order.longitude - selectedCourier.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(selectedCourier.latitude * Math.PI / 180) * Math.cos(order.latitude * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distKm = R * c;
          const speed = selectedCourier.velocidade || 50;
          const durationMin = (distKm / speed) * 60;
          
          const now = new Date();
          now.setSeconds(now.getSeconds() + (durationMin * 60));
          const etaTime = now.toTimeString().substring(0, 5);

          setRouteStats({
            distance: distKm.toFixed(2) + " (Linear)",
            duration: formatDuration(durationMin),
            eta: etaTime
          });

          const bounds = L.latLngBounds([
            [order.latitude, order.longitude],
            courierLatLng
          ]);
          procMapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
        });
    } else {
      if (procCourierMarkerRef.current) {
        procMapInstanceRef.current.removeLayer(procCourierMarkerRef.current);
        procCourierMarkerRef.current = null;
      }
      procMapInstanceRef.current.setView([order.latitude, order.longitude], 13);
    }
  }, [selectedCourier, order]);

  const initMap = (lat, lng) => {
    const L = window.L;
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
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
  };  if (sessionLoading || loading) {
    return (
      <div className="order-details-layout-loading">
        <Spin size="large" tip="A carregar detalhes da encomenda..." />
      </div>
    );
  }

  const statusIndex = order ? getStatusIndex(order.estado) : 0;

  return (
    <Layout className="order-details-layout">
      <Header className="order-details-header">
        <div className="order-details-header__logo-container">
          <img src="/public/images/logo_deliberatis.png" alt="Deliberatis Logo" className="order-details-header__logo" />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="order-details-header__username">
            Olá, {currentUserName}
          </div>
          <Button
            type="default"
            icon={<UserOutlined />}
            onClick={() => setIsProfileModalOpen(true)}
          >
            Perfil
          </Button>
        </div>
      </Header>

      <Layout>
        {isOperator && (
          <Sider 
            width={220} 
            theme="light" 
            className="order-details-sider"
          >
            <Menu
              mode="inline"
              selectedKeys={['pedidos']}
              onClick={(e) => {
                if (e.key === 'pedidos') {
                  window.location.href = '/home';
                }
                if (e.key === 'estafetas') {
                  window.location.href = '/estafetas';
                }
              }}
              className="order-details-sider__menu"
              items={[
                { key: 'pedidos', icon: <OrderedListOutlined />, label: 'Pedidos' },
                { key: 'estafetas', icon: <UserSwitchOutlined />, label: 'Estafetas' }
              ]}
            />
          </Sider>
        )}
        <Content className="order-details-content">
          <div className="order-details-content__title-row">
            <Button 
              type="primary" 
              size="large"
              icon={<ArrowLeftOutlined />} 
              onClick={() => window.location.href = "/home"}
              className="order-details-content__back-btn"
            >
              Voltar
            </Button>
            <div className="order-details-content__title-center">
              <h2 className="order-details-content__title-center--title">
                Detalhes da Encomenda
              </h2>
              <p className="order-details-content__title-center--subtitle">Código único: #{uid}</p>
            </div>
            {order && !isOperator && (
              <Button 
                type="primary"
                size="large"
                icon={<EditOutlined />}
                disabled={order.estado !== 'Pendente'}
                onClick={handleOpenEditModal}
                className={`order-details-content__action-btn ${order.estado === 'Pendente' ? 'order-details-content__action-btn--primary' : ''}`}
              >
                Editar
              </Button>
            )}
            {order && isOperator && order.estado === 'Pendente' && !isProcessing && (
              <Button 
                type="primary"
                size="large"
                icon={<EditOutlined />}
                onClick={() => setIsProcessing(true)}
                className="order-details-content__action-btn order-details-content__action-btn--primary"
              >
                Processar Encomenda
              </Button>
            )}
            {order && isOperator && isProcessing && (
              <Button 
                type="primary"
                size="large"
                onClick={() => {
                  setIsProcessing(false);
                  setSelectedCourier(null);
                }}
                className="order-details-content__action-btn order-details-content__action-btn--primary"
              >
                Voltar aos Detalhes
              </Button>
            )}
          </div>

          {order && (
            <div className="order-details-content__body-flex">
              {isProcessing ? (
                <>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={16}>
                      <Card 
                        title={<span className="order-details-content__card--title">Mapa de Atribuição</span>}
                        bordered={false}
                        className="order-details-content__card"
                        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}
                      >
                        <div 
                          ref={procMapRef} 
                          className="order-details-content__map-canvas"
                        />
                      </Card>
                    </Col>

                    <Col xs={24} lg={8}>
                      <Card 
                        title={<span className="order-details-content__card--title">Estatísticas da Rota</span>}
                        bordered={false}
                        className="order-details-content__card"
                        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                      >
                        <div style={{ flex: 1 }}>
                          {selectedCourier ? (
                            <div className="order-details-content__stats-container">
                              <div>
                                <span className="order-details-content__stats-label">ESTAFETA</span>
                                <span className="order-details-content__stats-value">{selectedCourier.nome}</span>
                              </div>
                              <Row gutter={16}>
                                <Col span={12}>
                                  <span className="order-details-content__stats-label">VEÍCULO</span>
                                  <span className="order-details-content__stats-value order-details-content__stats-value--sub">{selectedCourier.veiculo}</span>
                                </Col>
                                <Col span={12}>
                                  <span className="order-details-content__stats-label">MATRÍCULA</span>
                                  <div style={{ marginTop: '4px' }}>
                                    <Tag color="blue">{selectedCourier.matricula}</Tag>
                                  </div>
                                </Col>
                              </Row>
                              <div>
                                <span className="order-details-content__stats-label">VELOCIDADE DO VEÍCULO</span>
                                <span className="order-details-content__stats-value order-details-content__stats-value--speed">{selectedCourier.velocidade || 'N/A'} km/h</span>
                              </div>
                              {routeStats ? (
                                <>
                                  <hr className="order-details-content__divider" />
                                  <div>
                                    <span className="order-details-content__stats-label">DISTÂNCIA DE VIAGEM</span>
                                    <span className="order-details-content__stats-value order-details-content__stats-value--large">{routeStats.distance} km</span>
                                  </div>
                                  <Row gutter={16}>
                                    <Col span={12}>
                                      <span className="order-details-content__stats-label">TEMPO PREVISTO</span>
                                      <span className="order-details-content__stats-value order-details-content__stats-value--duration">{routeStats.duration}</span>
                                    </Col>
                                    <Col span={12}>
                                      <span className="order-details-content__stats-label">PREVISÃO DE CHEGADA</span>
                                      <span className="order-details-content__stats-value order-details-content__stats-value--eta">{routeStats.eta}</span>
                                    </Col>
                                  </Row>
                                </>
                              ) : (
                                <div className="order-details-content__empty-msg order-details-content__empty-msg--loading">
                                  A calcular rota...
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="order-details-content__empty-msg">
                              Selecione um estafeta no painel inferior para visualizar as estatísticas da rota.
                            </div>
                          )}
                        </div>

                        {/* Recommendation widget */}
                        <div className="order-details-content__recommendation">
                          <div className="order-details-content__recommendation--box">
                            <span className="order-details-content__recommendation--label">SUGESTÃO DE ATRIBUIÇÃO</span>
                            {calculatingFastest ? (
                              <span style={{ fontSize: '13px', color: '#666' }}>A calcular a rota mais rápida...</span>
                            ) : fastestCourier ? (
                              <div>
                                <p className="order-details-content__recommendation--desc">
                                  O estafeta disponível mais rápido é o <strong>{fastestCourier.courier.nome}</strong>, com uma viagem estimada em <strong>{fastestCourier.duration}</strong>.
                                </p>
                                {selectedCourier?.id !== fastestCourier.courier.id && (
                                  <Button 
                                    type="primary"
                                    size="small"
                                    onClick={() => {
                                      setSelectedCourier(fastestCourier.courier);
                                    }}
                                    className="order-details-content__recommendation--btn"
                                  >
                                    Atribuir {fastestCourier.courier.nome.split(' ')[0]}
                                  </Button>
                                )}
                                {selectedCourier?.id === fastestCourier.courier.id && (
                                  <span className="order-details-content__recommendation--success-tag">✓ Estafeta mais rápido selecionado</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '13px', color: '#999' }}>Sem estafetas disponíveis de momento.</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  <OrderDecisionPanel
                    couriers={availableCouriers}
                    submitting={decisionSubmitting}
                    selectedCourierId={selectedCourier ? selectedCourier.id : null}
                    onChangeCourierId={(id) => {
                      const courier = availableCouriers.find(c => c.id === id);
                      setSelectedCourier(courier || null);
                    }}
                    onDecision={(status, estafetaId, reason) => {
                      handleOperatorDecision(status, estafetaId, reason);
                    }}
                    isProcessed={order.estado !== 'Pendente'}
                  />
                </>
              ) : (
                <>
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
                </>
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
        />
      </Layout>
      <ProfileModal
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        onUpdateSuccess={(newName) => setCurrentUserName(newName)}
      />
    </Layout>
  );
};

export default OrderDetailsContainer;
