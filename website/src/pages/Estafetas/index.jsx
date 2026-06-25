import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Button, Spin, Form, Input, Card, Row, Col, Select, Tag, Space, Table, DatePicker } from 'antd';
import { LogoutOutlined, OrderedListOutlined, UserSwitchOutlined, PlusOutlined, UserOutlined, PhoneOutlined, CarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useSession from '../../common/useSession';

import useCouriers from '../../common/useCouriers';

const { Header, Content, Sider } = Layout;

const EstafetasContainer = () => {
  const { sessionLoading, userName, logout } = useSession(['operador']);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const {
    couriers,
    vehicles,
    handleFinish,
    handleUpdateStatus
  } = useCouriers(form, sessionLoading);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Initialize map
  useEffect(() => {
    const L = window.L;
    if (!L || sessionLoading || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([39.6, -8.0], 7);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [sessionLoading]);

  const disabledDate = (current) => {
    return current && current > dayjs().subtract(18, 'year').endOf('day');
  };

  const filteredCouriers = couriers.filter(c => 
    c.nome.toLowerCase().includes(searchText.toLowerCase())
  );

  // Sync markers
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;

    // Remove markers that are no longer in filteredCouriers
    const currentIds = new Set(filteredCouriers.map(c => c.id));
    Object.keys(markersRef.current).forEach(idStr => {
      const id = parseInt(idStr, 10);
      if (!currentIds.has(id)) {
        mapInstanceRef.current.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    filteredCouriers.forEach(courier => {
      if (!courier.latitude || !courier.longitude) return;

      // Select icon color based on status
      let color = 'blue';
      if (courier.estado === 'Disponível') {
        color = 'green';
      } else if (courier.estado === 'Indisponível') {
        color = 'red';
      } else if (courier.estado === 'Em Entrega' || courier.estado === 'Em Trânsito') {
        color = 'orange';
      }

      const icon = new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="font-size: 14px; color: #333;">${courier.nome}</strong><br/>
          <b>Telemóvel:</b> ${courier.telefone || 'N/A'}<br/>
          <b>Veículo:</b> ${courier.veiculo || 'N/A'} (${courier.matricula || 'N/A'})<br/>
          <b>Estado:</b> <span style="font-weight: bold; color: ${
            courier.estado === 'Disponível' ? '#52c41a' : courier.estado === 'Indisponível' ? '#f5222d' : '#1890ff'
          }">${courier.estado}</span>
        </div>
      `;

      if (markersRef.current[courier.id]) {
        const marker = markersRef.current[courier.id];
        marker.setLatLng([courier.latitude, courier.longitude]);
        marker.setIcon(icon);
        marker.getPopup().setContent(popupContent);
      } else {
        const marker = L.marker([courier.latitude, courier.longitude], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(popupContent);
        markersRef.current[courier.id] = marker;
      }
    });

    // Fit bounds
    const validCoords = filteredCouriers
      .filter(c => c.latitude && c.longitude)
      .map(c => [c.latitude, c.longitude]);
    if (validCoords.length > 0) {
      mapInstanceRef.current.fitBounds(validCoords, { padding: [50, 50], maxZoom: 13 });
    }
  }, [filteredCouriers]);

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      sorter: (a, b) => a.nome.localeCompare(b.nome),
      render: (text) => <span style={{ fontWeight: '600', color: '#333' }}>{text}</span>
    },
    {
      title: 'Telemóvel',
      dataIndex: 'telefone',
      key: 'telefone',
    },
    {
      title: 'Veículo',
      dataIndex: 'veiculo',
      key: 'veiculo',
      render: (veiculo) => (
        <Space>
          <CarOutlined style={{ color: '#5b5ce1' }} />
          <span>{veiculo}</span>
        </Space>
      )
    },
    {
      title: 'Matrícula',
      dataIndex: 'matricula',
      key: 'matricula',
      render: (matricula) => <Tag color="blue">{matricula}</Tag>
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado, record) => {
        if (estado === 'Disponível' || estado === 'Indisponível') {
          return (
            <Select
              value={estado}
              style={{ width: 130 }}
              onChange={(val) => handleUpdateStatus(record.id, val)}
              bordered={false}
              dropdownMatchSelectWidth={false}
            >
              <Select.Option value="Disponível">
                <Tag color="success" style={{ fontWeight: 'bold', margin: 0, cursor: 'pointer' }}>Disponível</Tag>
              </Select.Option>
              <Select.Option value="Indisponível">
                <Tag color="error" style={{ fontWeight: 'bold', margin: 0, cursor: 'pointer' }}>Indisponível</Tag>
              </Select.Option>
            </Select>
          );
        }
        
        let color = 'default';
        if (estado === 'Em Entrega' || estado === 'Em Trânsito') color = 'processing';
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{estado}</Tag>;
      }
    }
  ];

  if (sessionLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Spin size="large" tip="A verificar autorização..." />
      </div>
    );
  }

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

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={logout}
            danger
          >
            Sair
          </Button>
        </div>
      </Header>

      <Layout>
        <Sider 
          width={220} 
          theme="light" 
          style={{ 
            boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
            borderRight: '1px solid #f0f0f0',
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto'
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={['estafetas']}
            onClick={(e) => {
              if (e.key === 'pedidos') {
                window.location.href = '/public/home.html';
              }
            }}
            style={{ height: '100%', paddingTop: '16px', borderRight: 0 }}
            items={[
              { key: 'pedidos', icon: <OrderedListOutlined />, label: 'Pedidos' },
              { key: 'estafetas', icon: <UserSwitchOutlined />, label: 'Estafetas' }
            ]}
          />
        </Sider>
        <Content style={{ padding: '40px 24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: '#333333', fontSize: '28px', fontWeight: '600' }}>
              Olá, {userName}!
            </h2>
            <p style={{ color: '#666666', margin: '4px 0 0 0' }}>
              Consola de Operador - Faça a gestão e registo dos estafetas da plataforma.
            </p>
          </div>

          <Row gutter={[24, 24]}>
            {/* Form para Adicionar Novo Estafeta */}
            <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card 
                title={<span style={{ fontWeight: '700', color: '#333' }}>Registar Novo Estafeta</span>} 
                bordered={false} 
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1 }}
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleFinish}
                  requiredMark={false}
                >
                  <Form.Item
                    name="nome"
                    label="Nome Completo"
                    rules={[{ required: true, message: 'Insira o nome completo.' }]}
                  >
                    <Input prefix={<UserOutlined style={{ color: '#aaa' }} />} placeholder="Ex: Carlos Santos" />
                  </Form.Item>

                  <Form.Item
                    name="data_nascimento"
                    label="Data de Nascimento"
                    rules={[{ required: true, message: 'Insira a data de nascimento.' }]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }} 
                      format="YYYY-MM-DD" 
                      placeholder="Selecionar data" 
                      disabledDate={disabledDate} 
                      defaultPickerValue={dayjs().subtract(18, 'year')} 
                    />
                  </Form.Item>

                  <Form.Item
                    name="telefone"
                    label="Telemóvel"
                    rules={[
                      { required: true, message: 'Insira o telemóvel.' },
                      { pattern: /^[9][1236][0-9]{7}$/, message: 'Contacto telefónico português inválido.' }
                    ]}
                  >
                    <Input prefix={<PhoneOutlined style={{ color: '#aaa' }} />} placeholder="Ex: 912345678" maxLength={9} />
                  </Form.Item>

                  <Form.Item
                    name="veiculo_id"
                    label="Veículo"
                    rules={[{ required: true, message: 'Selecione o veículo.' }]}
                  >
                    <Select 
                      placeholder="Selecione o tipo de veículo"
                      showSearch
                      filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                    >
                      {vehicles.map(v => (
                        <Select.Option key={v.id} value={v.id}>{v.nome}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      icon={<PlusOutlined />}
                      style={{ width: '100%', backgroundColor: '#2eb82e', borderColor: '#2eb82e', fontWeight: '600' }}
                    >
                      Registar Estafeta
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* Lista de Estafetas Existentes */}
            <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card 
                title={<span style={{ fontWeight: '700', color: '#333' }}>Estafetas Registados</span>} 
                bordered={false} 
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <Input.Search
                    placeholder="Pesquisar estafeta por nome..."
                    allowClear
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: '100%', maxWidth: '350px' }}
                  />
                </div>
                <Table
                  dataSource={filteredCouriers}
                  columns={columns}
                  rowKey="id"
                  pagination={{ pageSize: 4 }}
                  style={{ minHeight: '290px' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
            <Col span={24}>
              <Card
                title={<span style={{ fontWeight: '700', color: '#333' }}>Mapa de Localização dos Estafetas</span>}
                bordered={false}
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
              >
                <div style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap' }}>
                  <div 
                    ref={mapRef} 
                    style={{ flex: 1, minWidth: '300px', height: '400px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #f0f0f0' }} 
                  />
                  <div style={{ 
                    width: '220px', 
                    padding: '16px', 
                    borderRadius: '6px', 
                    border: '1px solid #f0f0f0', 
                    backgroundColor: '#fafafa',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <h4 style={{ margin: 0, fontWeight: '700', color: '#333', borderBottom: '1px solid #e8e8e8', paddingBottom: '8px' }}>Legenda do Mapa</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" alt="Verde" style={{ height: '20px' }} />
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>Disponível</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" alt="Vermelho" style={{ height: '20px' }} />
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>Indisponível</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png" alt="Laranja" style={{ height: '20px' }} />
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>Em Trânsito / Entrega</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default EstafetasContainer;
