import React, { useState } from 'react';
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

  const disabledDate = (current) => {
    return current && current > dayjs().subtract(18, 'year').endOf('day');
  };

  const filteredCouriers = couriers.filter(c => 
    c.nome.toLowerCase().includes(searchText.toLowerCase())
  );

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
            <Col xs={24} lg={16}>
              <Card 
                title={<span style={{ fontWeight: '700', color: '#333' }}>Estafetas Registados</span>} 
                bordered={false} 
                style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
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
