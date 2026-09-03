import React, { useEffect, useState, useRef } from 'react';
import { Layout, Card, Spin, Button, Row, Col, notification, Tag, Progress } from 'antd';
import { ArrowLeftOutlined, CompassOutlined, EnvironmentOutlined, CarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';
import useSession from '../../common/useSession';
import useWS from '../../common/useWS';
import './index.less';

const { Header, Content } = Layout;

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  const d = new Date(dateTimeStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateTimeStr;
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatSeconds = (totalSeconds) => {
  if (totalSeconds <= 0) return '0s';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
};

const TrackingContainer = () => {
  const { sessionLoading } = useSession();
  const [uid, setUid] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeDuration, setRouteDuration] = useState(0);
  const [routeDistance, setRouteDistance] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [etaTime, setEtaTime] = useState('');
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const timerRef = useRef(null);

  const ws = useWS((data) => {
    if (data && (data.uid === uid || !data.uid)) {
      if (data.type === 'order_status') {
        const token = localStorage.getItem('user_session_token');
        loadOrder(token, uid);
      }
    }
  });

  useEffect(() => {
    ws.load();
    return () => {
      ws.close();
    };
  }, []);

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
          setRouteDistance((data.routes[0].distance || 0) / 1000);

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
        
        const R = 6371;
        const dLat = (order.latitude - courierLat) * Math.PI / 180;
        const dLng = (order.longitude - courierLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(courierLat * Math.PI / 180) * Math.cos(order.latitude * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        setRouteDistance(R * c);

        routeLineRef.current = L.polyline(latlngs, {
          color: '#5b5ce1',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 10'
        }).addTo(map);

        map.setView(deliveryLatLng, 14);
      });

  }, [order]);

  useEffect(() => {
    if (!order) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (order.estado === 'Entregue') {
      setProgressPercent(100);
      setRemainingTime(0);
      if (routePoints.length > 0 && courierMarkerRef.current) {
        courierMarkerRef.current.setLatLng(routePoints[routePoints.length - 1]);
      }
      return;
    }

    if (order.estado === 'Em Trânsito') {
      const updatePosition = () => {
        let startTime = Date.now();
        if (order.data_inicio) {
          const cleanDateStr = order.data_inicio.replace('T', ' ').replace(/-/g, '/').split('.')[0];
          const parsed = new Date(cleanDateStr).getTime();
          if (!isNaN(parsed)) {
            startTime = parsed;
          }
        }

        const duration = order.duracao_segundos || routeDuration || 60;
        const now = Date.now();
        const elapsed = Math.max(0, (now - startTime) / 1000);
        const progress = Math.min(1.0, Math.max(0.0, elapsed / duration));
        const percent = Math.round(progress * 100);
        const remaining = Math.max(0, Math.round(duration - elapsed));

        const arrivalDate = new Date(startTime + (duration * 1000));
        const etaFormatted = arrivalDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setProgressPercent(percent);
        setRemainingTime(remaining);
        setEtaTime(etaFormatted);

        if (routePoints.length > 0 && courierMarkerRef.current) {
          const pointIdx = Math.min(routePoints.length - 1, Math.floor(progress * (routePoints.length - 1)));
          const currentPoint = routePoints[pointIdx];
          courierMarkerRef.current.setLatLng(currentPoint);
        }

        if (progress >= 1.0) {
          clearInterval(timerRef.current);
          const token = localStorage.getItem('user_session_token');
          _service({
            url: '/order/status',
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token
            },
            data: {
              uid: uid,
              estado: 'Entregue'
            },
            success: ({ json }) => {
              if (json.result === true) {
                notification.success({
                  message: 'Entrega Concluída',
                  description: 'O estafeta chegou com sucesso ao destino!'
                });
                loadOrder(token, uid);
              }
            }
          });
        }
      };

      updatePosition();
      timerRef.current = setInterval(updatePosition, 1000);
    } else {
      setProgressPercent(0);
      setRemainingTime(0);
      setEtaTime('');
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [order, routePoints, routeDuration, uid]);

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
                <Tag color={order.estado === 'Em Trânsito' ? 'processing' : order.estado === 'Entregue' ? 'success' : 'default'} className="tracking-content__status-tag">
                  {order.estado}
                </Tag>
              </div>

              <div style={{ margin: '16px 0 24px 0', padding: '16px', backgroundColor: '#f9faff', borderRadius: '8px', border: '1px solid #e6f0ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    Progresso da Entrega
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#5b5ce1' }}>
                    {progressPercent}%
                  </span>
                </div>
                <Progress 
                  percent={progressPercent} 
                  showInfo={false}
                  strokeColor={{ '0%': '#5b5ce1', '100%': '#52c41a' }}
                  status={order.estado === 'Entregue' ? 'success' : 'active'} 
                  style={{ marginBottom: '14px' }}
                />

                <Row gutter={[12, 12]} style={{ fontSize: '13px' }}>
                  <Col span={12}>
                    <span style={{ fontSize: '11px', color: '#888', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                      Distância
                    </span>
                    <strong style={{ color: '#222', fontSize: '14px' }}>
                      {routeDistance > 0 ? `${((progressPercent / 100) * routeDistance).toFixed(1)} / ${routeDistance.toFixed(1)} km` : '--'}
                    </strong>
                  </Col>
                  <Col span={12}>
                    <span style={{ fontSize: '11px', color: '#888', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                      Previsão de Chegada
                    </span>
                    <strong style={{ color: '#222', fontSize: '14px' }}>
                      {order.estado === 'Entregue' ? (order.data_entrega ? formatDateTime(order.data_entrega).split(' ')[1] : 'Concluído') : (etaTime || '--')}
                    </strong>
                  </Col>
                  <Col span={12} style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      <CarOutlined style={{ marginRight: '4px', color: '#5b5ce1' }} />
                      {order.estado === 'Entregue' ? 'Destino Alcançado' : 'Em Deslocação'}
                    </span>
                  </Col>
                  <Col span={12} style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      <ClockCircleOutlined style={{ marginRight: '4px', color: '#5b5ce1' }} />
                      {order.estado === 'Entregue' ? 'Concluído' : `Restam: ${formatSeconds(remainingTime)}`}
                    </span>
                  </Col>
                </Row>
              </div>

              <div className="tracking-content__address">
                <h4><EnvironmentOutlined /> Morada de Entrega</h4>
                <p>{order.rua}, Nº {order.porta} {order.andar ? `, ${order.andar}` : ''}</p>
                <p>{order.codigo_postal} - {order.cidade}</p>
              </div>

              {order.estafeta_nome && (
                <div className="tracking-content__courier" style={{ marginTop: '16px' }}>
                  <h4>Estafeta</h4>
                  <p><strong>{order.estafeta_nome}</strong> está a realizar a sua entrega.</p>
                </div>
              )}

              {order.data_entrega && (
                <div className="tracking-content__delivery-time" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', padding: '16px', borderRadius: '6px', marginTop: '16px' }}>
                  <h4 style={{ color: '#52c41a', margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600' }}>Entregue em</h4>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '500', color: '#333' }}>{formatDateTime(order.data_entrega)}</p>
                </div>
              )}
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
