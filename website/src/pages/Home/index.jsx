import React, { useEffect } from 'react';
import { Layout, Button, Spin, Form, Menu } from 'antd';
import { PlusOutlined, LogoutOutlined, OrderedListOutlined, UserSwitchOutlined } from '@ant-design/icons';

import OrdersTableCliente from '../../components/OrdersTableClienteComponent';
import OrdersTableOperador from '../../components/OrdersTableOperadorComponent';
import CreateOrderModal from '../../components/CreateOrderModalComponent';
import MapModal from '../../components/MapModalComponent';
import useLoadOrders from '../../common/useLoadOrders';
import useCreateOrderFlow from '../../common/useCreateOrderFlow';
import useSession from '../../common/useSession';

const { Header, Content, Sider } = Layout;

const HomeContainer = () => {
  const { sessionLoading, userName, userGroup, logout } = useSession();
  const { orders, loading, loadOrders, handleStatusChange } = useLoadOrders();
  const [form] = Form.useForm();

  const {
    isModalOpen,
    handleOpenModal,
    handleCloseModal,
    isMapModalOpen,
    setIsMapModalOpen,
    setHasConfirmedPin,
    submitting,
    handleCreateOrder,
    executeSubmitOnConfirm,
    
    // Postal code status
    postalCodeStatus,
    postalCodeErrorMsg,
    loadingPostalCode,
    handlePostalCodeChange,
    
    // Map status
    mapRef,
    searchingMap,
    searchQuery,
    setSearchQuery,
    handleMapSearch,
    handleConfirmLocation,
    handleOpenMapModal
  } = useCreateOrderFlow(form, () => {
    const token = localStorage.getItem('user_session_token');
    loadOrders(token);
  });

  useEffect(() => {
    if (sessionLoading) return;
    const token = localStorage.getItem('user_session_token');
    loadOrders(token);
  }, [sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Spin size="large" tip="A carregar..." />
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
          {userGroup !== 'operador' && (
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
          )}
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

      {userGroup === 'operador' ? (
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
              selectedKeys={['pedidos']}
              onClick={(e) => {
                if (e.key === 'estafetas') {
                  window.location.href = '/public/estafetas.html';
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
                Consola de Operador - Faça a gestão das encomendas pendentes do sistema.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
            }}>
              <OrdersTableOperador orders={orders} onStatusChange={handleStatusChange} />
            </div>
          </Content>
        </Layout>
      ) : (
        <Content style={{ padding: '40px 24px', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: '#333333', fontSize: '28px', fontWeight: '600' }}>
              Olá, {userName}!
            </h2>
            <p style={{ color: '#666666', margin: '4px 0 0 0' }}>Gere e consulta as tuas encomendas em tempo real.</p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}>
            <OrdersTableCliente orders={orders} handleOpenCreateModal={handleOpenModal} />
          </div>
        </Content>
      )}

      <CreateOrderModal
        open={isModalOpen}
        onCancel={handleCloseModal}
        form={form}
        submitting={submitting}
        onFinish={handleCreateOrder}
        onValuesChange={(changedValues) => {
          if ('rua' in changedValues || 'cidade' in changedValues || 'codigo_postal' in changedValues) {
            setHasConfirmedPin(false);
          }
        }}
        openMapModal={handleOpenMapModal}
        postalCodeStatus={postalCodeStatus}
        postalCodeErrorMsg={postalCodeErrorMsg}
        loadingPostalCode={loadingPostalCode}
        handlePostalCodeChange={handlePostalCodeChange}
      />

      <MapModal
        open={isMapModalOpen}
        onCancel={() => setIsMapModalOpen(false)}
        onConfirmLocation={() => {
          handleConfirmLocation((lat, lng) => {
            executeSubmitOnConfirm(logout, lat, lng);
          });
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchingMap={searchingMap}
        handleMapSearch={handleMapSearch}
        mapRef={mapRef}
      />
    </Layout>
  );
};

export default HomeContainer;
