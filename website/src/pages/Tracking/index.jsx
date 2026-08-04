import React, { useEffect, useState, useRef } from 'react';
import { Layout, Card, Spin, Button, Row, Col, notification, Timeline, Tag } from 'antd';
import { ArrowLeftOutlined, CompassOutlined, EnvironmentOutlined, CarOutlined, PlayCircleOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';
import useSession from '../../common/useSession';
import './index.less';

const { Header, Content } = Layout;

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  const d = new Date(dateTimeStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateTimeStr;
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds) => {
  if (!seconds) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
};

const TrackingContainer = () => {
  const { sessionLoading, logout } = useSession();
  const [uid, setUid] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeDuration, setRouteDuration] = useState(0);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const simIntervalRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderUid = params.get('uid');
    if (orderUid) {
      setUid(orderUid);
    }
  }, []);

  const loadOrder = (token, orderUid) => {
    _service({
      url: '/order',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: { uid: orderUid },
      success: ({ json }) => {
        if (json.result === true && json.order) {
          setOrder(json.order);
        } else {
          notification.error({
            message: 'Erro',
            description: 'Encomenda não encontrada.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro',
          description: 'Não foi possível carregar o rastreio da encomenda.'
        });
      },
      end: () => {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    if (sessionLoading || !uid) return;
    const token = localStorage.getItem('user_session_token');
    loadOrder(token, uid);
  }, [sessionLoading, uid]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!L || !order || !mapRef.current || mapInstanceRef.current) return;

    const deliveryLatLng = [order.latitude, order.longitude];
    
    const courierLat = order.estafeta_latitude || (order.latitude + 0.01);
    const courierLng = order.estafeta_longitude || (order.longitude - 0.01);
    const courierLatLng = [courierLat, courierLng];

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    });
    mapInstanceRef.current = map;

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

    const redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    deliveryMarkerRef.current = L.marker(deliveryLatLng, { icon: blueIcon })
      .addTo(map)
      .bindPopup('Destino de Entrega')
      .openPopup();

    courierMarkerRef.current = L.marker(courierLatLng, { icon: redIcon })
      .addTo(map)
      .bindPopup(`Estafeta: ${order.estafeta_nome || 'A Caminho'}`);

    fetch(`https://router.project-osrm.org/route/v1/driving/${courierLng},${courierLat};${order.longitude},${order.latitude}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates;
          const latlngs = coords.map(c => [c[1], c[0]]);
          setRoutePoints(latlngs);
          setRouteDuration(data.routes[0].duration || 1800);

          routeLineRef.current = L.polyline(latlngs, {
            color: '#5b5ce1',
            weight: 5,
            opacity: 0.8
          }).addTo(map);

          const bounds = L.latLngBounds([deliveryLatLng, courierLatLng]);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      })
      .catch(() => {
        const latlngs = [courierLatLng, deliveryLatLng];
        setRoutePoints(latlngs);
        setRouteDuration(1800);

        routeLineRef.current = L.polyline(latlngs, {
          color: '#5b5ce1',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 10'
        }).addTo(map);

        map.setView(deliveryLatLng, 14);
      });

  }, [order]);

  const startSimulation = (mode) => {
    if (routePoints.length === 0 || simulating) return;
    
    setSimulating(true);
    let index = 0;
    
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }

    const delay = mode === 'fast'
      ? 150
      : Math.max(100, (routeDuration * 1000) / routePoints.length);

    simIntervalRef.current = setInterval(() => {
      if (index >= routePoints.length) {
        clearInterval(simIntervalRef.current);
        setSimulating(false);
        notification.success({
          message: 'Entrega Concluída',
          description: 'O estafeta chegou com sucesso ao destino de entrega!'
        });
        return;
      }

      const nextLatLng = routePoints[index];
      if (courierMarkerRef.current) {
        courierMarkerRef.current.setLatLng(nextLatLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(nextLatLng);
        }
      }
      index++;
    }, delay);
  };

  if (sessionLoading || loading) {
    return (
      <div className="tracking-layout-loading">
        <Spin size="large" tip="A carregar mapa de rastreio..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="tracking-layout-error">
        <h2>Erro ao carregar detalhes</h2>
        <Button type="primary" onClick={() => window.close()}>Fechar Janela</Button>
      </div>
    );
  }

  return (
    <Layout className="tracking-layout">
      <Header className="tracking-header">
        <div className="tracking-header__left">
          <Button 
            type="link" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => window.close()}
            className="tracking-header__back-btn"
          >
            Fechar Rastreio
          </Button>
        </div>
        <div className="tracking-header__logo-container">
          <img src="/public/images/logo_deliberatis.png" alt="Deliberatis Logo" className="tracking-header__logo" />
        </div>
      </Header>

      <Content className="tracking-content">
        <Row gutter={[24, 24]} className="tracking-content__row">
          <Col xs={24} lg={8} className="tracking-content__col-info">
            <Card 
              title={
                <span className="tracking-content__card-title">
                  <CompassOutlined style={{ marginRight: '8px', color: '#5b5ce1' }} />
                  Estado da Encomenda
                </span>
              }
              bordered={false} 
              className="tracking-content__card"
            >
              <div className="tracking-content__status-header">
                <h3>Código: #{order.uid}</h3>
                <Tag color={order.estado === 'Em Trânsito' ? 'processing' : 'success'} className="tracking-content__status-tag">
                  {order.estado}
                </Tag>
              </div>

              <Timeline 
                className="tracking-content__timeline"
                items={[
                  {
                    children: 'Pedido Recebido e Registado',
                    color: 'green'
                  },
                  {
                    children: order.estado === 'Pendente' ? 'A aguardar atribuição de estafeta' : 'Estafeta atribuído e em trânsito',
                    color: order.estado === 'Pendente' ? 'gray' : 'green',
                    dot: order.estado !== 'Pendente' && <CarOutlined />
                  },
                  {
                    children: 'Entrega no local de destino',
                    color: order.estado === 'Entregue' ? 'green' : 'gray'
                  }
                ]}
              />

              <div className="tracking-content__address">
                <h4><EnvironmentOutlined /> Morada de Entrega</h4>
                <p>{order.rua}, Nº {order.porta} {order.andar ? `, ${order.andar}` : ''}</p>
                <p>{order.codigo_postal} - {order.cidade}</p>
              </div>

              {order.estafeta_nome && (
                <div className="tracking-content__courier">
                  <h4>Estafeta</h4>
                  <p><strong>{order.estafeta_nome}</strong> está a realizar a sua entrega.</p>
                </div>
              )}

              {order.data_entrega && (
                <div className="tracking-content__delivery-time" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', padding: '16px', borderRadius: '6px' }}>
                  <h4 style={{ color: '#52c41a', margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600' }}>Entregue em</h4>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '500', color: '#333' }}>{formatDateTime(order.data_entrega)}</p>
                </div>
              )}

              <Row gutter={12} style={{ marginTop: 'auto' }}>
                <Col span={12}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => startSimulation('fast')}
                    disabled={simulating || routePoints.length === 0}
                    block
                    className="tracking-content__simulate-btn"
                  >
                    {simulating ? 'A Simular...' : 'Simulação Rápida'}
                  </Button>
                  <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '12px', color: '#888' }}>
                    Tempo: <strong>{routePoints.length ? (routePoints.length * 0.15 < 60 ? `${Math.round(routePoints.length * 0.15)}s` : `${Math.round((routePoints.length * 0.15) / 60)} min`) : '--'}</strong>
                  </div>
                </Col>
                <Col span={12}>
                  <Button
                    type="default"
                    icon={<CompassOutlined />}
                    onClick={() => startSimulation('realtime')}
                    disabled={simulating || routePoints.length === 0}
                    block
                    className="tracking-content__simulate-real-btn"
                    style={{ borderColor: '#5b5ce1', color: '#5b5ce1', fontWeight: '600' }}
                  >
                    Simulação Tempo Real
                  </Button>
                  <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '12px', color: '#888' }}>
                    Tempo: <strong>{formatDuration(routeDuration)}</strong>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={16} className="tracking-content__col-map">
            <Card bordered={false} className="tracking-content__map-card">
              <div ref={mapRef} className="tracking-content__map-canvas" />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default TrackingContainer;
