import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Button, Spin, Form, Input, Card, Row, Col, Select, Tag, Space, Table, DatePicker } from 'antd';
import { LogoutOutlined, OrderedListOutlined, UserSwitchOutlined, PlusOutlined, UserOutlined, PhoneOutlined, CarOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useSession from '../../common/useSession';
import useCouriers from '../../common/useCouriers';
import ProfileModal from '../../components/ProfileModalComponent';
import './index.less';

const { Header, Content, Sider } = Layout;

const EstafetasContainer = () => {
  const { sessionLoading, userName, logout } = useSession(['operador']);
  const [currentUserName, setCurrentUserName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (userName) {
      setCurrentUserName(userName);
    }
  }, [userName]);

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
      render: (text) => <span className="estafetas-content__table--name">{text}</span>
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
          <CarOutlined className="estafetas-content__table--vehicle-icon" />
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
              className="estafetas-content__table--select-status"
              onChange={(val) => handleUpdateStatus(record.id, val)}
              bordered={false}
              dropdownMatchSelectWidth={false}
            >
              <Select.Option value="Disponível">
                <Tag color="success" className="estafetas-content__table--tag-cursor">Disponível</Tag>
              </Select.Option>
              <Select.Option value="Indisponível">
                <Tag color="error" className="estafetas-content__table--tag-cursor">Indisponível</Tag>
              </Select.Option>
            </Select>
          );
        }
        
        let color = 'default';
        if (estado === 'Em Entrega' || estado === 'Em Trânsito') color = 'processing';
        return <Tag color={color} className="estafetas-content__table--tag-bold">{estado}</Tag>;
      }
    }
  ];

  if (sessionLoading) {
    return (
      <div className="estafetas-layout-loading">
        <Spin size="large" tip="A verificar autorização..." />
      </div>
    );
  }

  return (
    <Layout className="estafetas-layout">
      <Header className="estafetas-header">
        <div className="estafetas-header__logo-container">
          <img src="/public/images/logo_deliberatis.png" alt="Deliberatis Logo" className="estafetas-header__logo" />
        </div>

        <div className="estafetas-header__actions">
          <Button
            type="default"
            icon={<UserOutlined />}
            onClick={() => setIsProfileModalOpen(true)}
          >
            Perfil
          </Button>
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
          className="estafetas-sider"
        >
          <Menu
            mode="inline"
            selectedKeys={['estafetas']}
            onClick={(e) => {
              if (e.key === 'pedidos') {
                window.location.href = '/home';
              }
              if (e.key === 'estatisticas') {
                window.location.href = '/estatisticas';
              }
            }}
            className="estafetas-sider__menu"
            items={[
              { key: 'pedidos', icon: <OrderedListOutlined />, label: 'Pedidos' },
              { key: 'estafetas', icon: <UserSwitchOutlined />, label: 'Estafetas' },
              { key: 'estatisticas', icon: <BarChartOutlined />, label: 'Estatísticas' }
            ]}
          />
        </Sider>
        <Content className="estafetas-content">
          <div className="estafetas-content__welcome">
            <h2 className="estafetas-content__welcome--title">
              Olá, {currentUserName}!
            </h2>
            <p className="estafetas-content__welcome--desc">
              Consola de Operador - Faça a gestão e registo dos estafetas da plataforma.
            </p>
          </div>

          <Row gutter={[24, 24]}>
            {/* Form para Adicionar Novo Estafeta */}
            <Col xs={24} lg={8} className="estafetas-content__col-form">
              <Card 
                title={<span className="estafetas-content__card--title">Registar Novo Estafeta</span>} 
                bordered={false} 
                className="estafetas-content__card"
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
                      className="estafetas-content__form--date-picker"
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
                      className="estafetas-content__form--btn-submit"
                    >
                      Registar Estafeta
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* Lista de Estafetas Existentes */}
            <Col xs={24} lg={16} className="estafetas-content__col-table">
              <Card 
                title={<span className="estafetas-content__card--title">Estafetas Registados</span>} 
                bordered={false} 
                className="estafetas-content__card"
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <div className="estafetas-content__search-wrapper">
                  <Input.Search
                    placeholder="Pesquisar estafeta por nome..."
                    allowClear
                    onChange={(e) => setSearchText(e.target.value)}
                    className="estafetas-content__search-wrapper--search"
                  />
                </div>
                <Table
                  dataSource={filteredCouriers}
                  columns={columns}
                  rowKey="id"
                  pagination={{ pageSize: 4 }}
                  className="estafetas-content__table"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
            <Col span={24}>
              <Card
                title={<span className="estafetas-content__card--title">Mapa de Localização dos Estafetas</span>}
                bordered={false}
                className="estafetas-content__card estafetas-content__card--map-card"
              >
                <div className="estafetas-content__map-wrapper">
                  <div 
                    ref={mapRef} 
                    className="estafetas-content__map-canvas"
                  />
                  <div className="estafetas-content__map-legend">
                    <h4 className="estafetas-content__map-legend--title">Legenda do Mapa</h4>
                    <div className="estafetas-content__map-legend--item">
                      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" alt="Verde" className="estafetas-content__map-legend--icon" />
                      <span className="estafetas-content__map-legend--label">Disponível</span>
                    </div>
                    <div className="estafetas-content__map-legend--item">
                      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" alt="Vermelho" className="estafetas-content__map-legend--icon" />
                      <span className="estafetas-content__map-legend--label">Indisponível</span>
                    </div>
                    <div className="estafetas-content__map-legend--item">
                      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png" alt="Laranja" className="estafetas-content__map-legend--icon" />
                      <span className="estafetas-content__map-legend--label">Em Trânsito / Entrega</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
      <ProfileModal
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        onUpdateSuccess={(newName) => setCurrentUserName(newName)}
      />
    </Layout>
  );
};

export default EstafetasContainer;
