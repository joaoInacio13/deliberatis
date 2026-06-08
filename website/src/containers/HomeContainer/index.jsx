import React, { useEffect, useState } from 'react';
import { Layout, Button, Table, Empty, notification, Spin, Modal, Form, Input, InputNumber, Select } from 'antd';
import { PlusOutlined, LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';

const { Header, Content } = Layout;
const { Option } = Select;

const HomeContainer = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const token = localStorage.getItem('user_session_token');
    
    if (!token) {
      window.location.href = "/public/auth.html";
      return;
    }

    // 1. Verifica se a sessão é válida e obtém o nome do utilizador
    _service({
      url: '/check-session',
      method: 'POST',
      data: { token: token },
      success: ({ json }) => {
        if (json.result === true) {
          setUserName(json.primeiro_nome);
          // 2. Se a sessão for válida, carrega as encomendas
          loadOrders(token);
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

  const loadOrders = (token) => {
    _service({
      url: '/orders',
      method: 'GET',
      data: { token: token },
      success: ({ json }) => {
        if (json.result === true) {
          setOrders(json.orders || []);
        } else {
          notification.error({
            message: 'Erro ao carregar encomendas',
            description: json.error || 'Ocorreu um erro inesperado.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Não foi possível obter a lista de encomendas do servidor.'
        });
      },
      end: () => {
        setLoading(false);
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('user_session_token');
    window.location.href = "/public/auth.html";
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const handleCreateOrder = (values) => {
    const token = localStorage.getItem('user_session_token');
    if (!token) {
      logout();
      return;
    }

    _service({
      url: '/orders',
      method: 'POST',
      data: {
        ...values,
        token: token
      },
      start: () => {
        setSubmitting(true);
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Encomenda Criada!',
            description: 'A tua encomenda foi submetida com sucesso!'
          });
          handleCloseModal();
          // Recarrega a lista de encomendas
          loadOrders(token);
        } else {
          notification.error({
            message: 'Erro ao criar encomenda',
            description: json.error || 'Não foi possível submeter a encomenda.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Houve uma falha na ligação ao servidor.'
        });
      },
      end: () => {
        setSubmitting(false);
      }
    });
  };

  // Colunas para a tabela de encomendas (caso existam)
  const columns = [
    {
      title: 'Código',
      dataIndex: 'uid',
      key: 'uid',
      render: (text) => <a>#{text.substring(0, 8)}</a>,
    },
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data',
      render: (text) => text ? text.substring(0, 19) : ''
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      render: (valor) => `${valor.toFixed(2)}€`,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: estado === 'Pendente' ? '#f0ad4e' : '#5cb85c' 
        }}>
          {estado}
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Spin size="large" tip="A carregar sessão..." />
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
        zIndex: 1
      }}>
        {/* Logo no Canto Superior Esquerdo */}
        <div style={{ 
          fontSize: '20px', 
          fontWeight: '800', 
          color: '#5b5ce1', 
          letterSpacing: '1px',
          fontFamily: "'Outfit', sans-serif"
        }}>
          DELIBERATIS
        </div>

        {/* Botão verde à direita "Criar Encomenda" + Logout */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleOpenModal}
            style={{ 
              backgroundColor: '#2eb82e', 
              borderColor: '#2eb82e',
              fontWeight: '600'
            }}
          >
            Criar Encomenda
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

      <Content style={{ padding: '40px 24px', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#333333', fontSize: '28px', fontWeight: '600' }}>
            Olá, {userName}!
          </h2>
          <p style={{ color: '#666666', margin: '4px 0 0 0' }}>Gere e consulta as tuas encomendas em tempo real.</p>
        </div>

        {/* Listagem de Encomendas */}
        <div style={{ 
          background: '#ffffff', 
          padding: '24px', 
          borderRadius: '8px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)' 
        }}>
          {orders.length > 0 ? (
            <Table 
              dataSource={orders} 
              columns={columns} 
              rowKey="id" 
              pagination={{ pageSize: 5 }}
            />
          ) : (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#999999', fontSize: '16px' }}>
                  Não tem nenhuma encomenda
                </span>
              }
              style={{ padding: '32px 0' }}
            >
              <Button 
                type="primary" 
                icon={<ShoppingCartOutlined />} 
                onClick={handleOpenModal}
                style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}
              >
                Fazer a Primeira Encomenda
              </Button>
            </Empty>
          )}
        </div>
      </Content>

      {/* Modal com o Formulário de Criação de Encomenda */}
      <Modal
        title="Criar Nova Encomenda"
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrder}
          initialValues={{ metodo_pagamento: 'MBWay' }}
        >
          {/* Campo Descrição */}
          <Form.Item
            name="descricao"
            label="Descrição da Encomenda"
            rules={[{ required: true, message: 'Insere os detalhes da encomenda!' }]}
          >
            <Input.TextArea placeholder="Ex: Hambúrguer, Batatas Fritas e Cola Zero" rows={3} />
          </Form.Item>

          {/* Campo Preço */}
          <Form.Item
            name="preco"
            label="Preço (€)"
            rules={[{ required: true, message: 'Insere o valor da encomenda!' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              min={0.01} 
              step={0.01} 
              placeholder="Ex: 12.50" 
              formatter={(value) => `${value}`}
            />
          </Form.Item>

          {/* Campo Localização */}
          <Form.Item
            name="localizacao"
            label="Endereço de Entrega"
            rules={[{ required: true, message: 'Insere o endereço de entrega!' }]}
          >
            <Input placeholder="Ex: Rua das Flores, Nº 10, 3º Esq, Porto" />
          </Form.Item>

          {/* Campo Número de Telemóvel */}
          <Form.Item
            name="numero_telefone"
            label="Telemóvel de Contacto"
            rules={[
              { required: true, message: 'Insere o contacto telefónico!' },
              { pattern: /^[0-9\s+]{9,15}$/, message: 'Insere um número de telefone válido!' }
            ]}
          >
            <Input placeholder="Ex: 912345678" />
          </Form.Item>

          {/* Campo Método de Pagamento */}
          <Form.Item
            name="metodo_pagamento"
            label="Método de Pagamento"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="MBWay">MBWay</Option>
              <Option value="Dinheiro na Entrega">Dinheiro na Entrega</Option>
              <Option value="Cartão de Crédito/Débito">Cartão de Crédito/Débito</Option>
            </Select>
          </Form.Item>

          {/* Campo Observações (Opcional) */}
          <Form.Item
            name="observacoes"
            label="Observações Adicionais (Opcional)"
          >
            <Input.TextArea placeholder="Ex: Sem cebola, campainha avariada, etc." rows={2} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={handleCloseModal} style={{ marginRight: '8px' }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}>
              Submeter Encomenda
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default HomeContainer;
