import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Spin, notification, Form, Input, Card, Row, Col, Select, Tag, Space, Table } from 'antd';
import { LogoutOutlined, OrderedListOutlined, UserSwitchOutlined, PlusOutlined, UserOutlined, PhoneOutlined, CarOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';

const { Header, Content, Sider } = Layout;

const mockCouriersData = [
  {
    id: 1,
    nome: 'Carlos Santos',
    telefone: '912345678',
    veiculo: 'Mota',
    matricula: 'AA-00-XX',
    estado: 'Disponível'
  },
  {
    id: 2,
    nome: 'Mariana Costa',
    telefone: '934567890',
    veiculo: 'Bicicleta',
    matricula: 'N/A',
    estado: 'Em Entrega'
  },
  {
    id: 3,
    nome: 'João Rodrigues',
    telefone: '967890123',
    veiculo: 'Carro',
    matricula: '99-ZZ-88',
    estado: 'Indisponível'
  }
];

const EstafetasContainer = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [couriers, setCouriers] = useState(mockCouriersData);
  const [form] = Form.useForm();

  useEffect(() => {
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
          if (json.group !== 'operador') {
            // Se não for operador, não tem autorização para esta página
            notification.error({
              message: 'Não Autorizado',
              description: 'Apenas operadores podem aceder à página de estafetas.'
            });
            window.location.href = "/public/home.html";
          } else {
            setUserName(json.primeiro_nome);
            setLoading(false);
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
  }, []);

  const handleFinish = (values) => {
    const newCourier = {
      id: Date.now(),
      nome: values.nome,
      telefone: values.telefone,
      veiculo: values.veiculo,
      matricula: values.matricula || 'N/A',
      estado: 'Disponível'
    };

    setCouriers([...couriers, newCourier]);
    form.resetFields();
    
    notification.success({
      message: 'Sucesso',
      description: 'Estafeta adicionado com sucesso (apenas em memória temporária).'
    });
  };

  const logout = () => {
    localStorage.removeItem('user_session_token');
    window.location.href = "/public/auth.html";
  };

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
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
      render: (estado) => {
        let color = 'default';
        if (estado === 'Disponível') color = 'success';
        else if (estado === 'Em Entrega') color = 'processing';
        else if (estado === 'Indisponível') color = 'error';
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{estado}</Tag>;
      }
    }
  ];

  if (loading) {
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
            borderRight: '1px solid #f0f0f0'
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
            <Col xs={24} lg={8}>
              <Card 
                title={<span style={{ fontWeight: '700', color: '#333' }}>Registar Novo Estafeta</span>} 
                bordered={false} 
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
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
                    name="veiculo"
                    label="Veículo"
                    rules={[{ required: true, message: 'Selecione o veículo.' }]}
                  >
                    <Select placeholder="Selecione o tipo de veículo">
                      <Select.Option value="Mota">Mota</Select.Option>
                      <Select.Option value="Carro">Carro</Select.Option>
                      <Select.Option value="Bicicleta">Bicicleta</Select.Option>
                      <Select.Option value="Carrinha">Carrinha</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="matricula"
                    label="Matrícula (opcional)"
                  >
                    <Input placeholder="Ex: AA-00-XX" />
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
            <Col xs={24} lg={16}>
              <Card 
                title={<span style={{ fontWeight: '700', color: '#333' }}>Estafetas Registados</span>} 
                bordered={false} 
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
              >
                <Table
                  dataSource={couriers}
                  columns={columns}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default EstafetasContainer;
