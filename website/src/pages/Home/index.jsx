import React, { useEffect, useState } from 'react';
import { Layout, Button, Spin, Form, Menu } from 'antd';
import { PlusOutlined, LogoutOutlined, OrderedListOutlined, UserSwitchOutlined, UserOutlined } from '@ant-design/icons';

import OrdersTableCliente from '../../components/OrdersTableClienteComponent';
import OrdersTableOperador from '../../components/OrdersTableOperadorComponent';
import CreateOrderModal from '../../components/CreateOrderModalComponent';
import MapModal from '../../components/MapModalComponent';
import ProfileModal from '../../components/ProfileModalComponent';
import useLoadOrders from '../../common/useLoadOrders';
import useCreateOrderFlow from '../../common/useCreateOrderFlow';
import useSession from '../../common/useSession';
import './index.less';

const { Header, Content, Sider } = Layout;

const HomeContainer = () => {
  const { sessionLoading, userName, userGroup, logout } = useSession();
  const [currentUserName, setCurrentUserName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (userName) {
      setCurrentUserName(userName);
    }
  }, [userName]);

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
      <div className="home-layout-loading">
        <Spin size="large" tip="A carregar..." />
      </div>
    );
  }

  return (
    <Layout className="home-layout">
      <Header className="home-header">
        <div className="home-header__logo-container">
          <img src="/public/images/logo_deliberatis.png" alt="Deliberatis Logo" className="home-header__logo" />
        </div>

        <div className="home-header__actions">
          {userGroup !== 'operador' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenModal}
              className="home-header__create-btn"
            >
              Criar Encomenda
            </Button>
          )}
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

      {userGroup === 'operador' ? (
        <Layout>
          <Sider 
            width={220} 
            theme="light" 
            className="home-sider"
          >
            <Menu
              mode="inline"
              selectedKeys={['pedidos']}
              onClick={(e) => {
                if (e.key === 'estafetas') {
                  window.location.href = '/estafetas';
                }
              }}
              className="home-sider__menu"
              items={[
                { key: 'pedidos', icon: <OrderedListOutlined />, label: 'Pedidos' },
                { key: 'estafetas', icon: <UserSwitchOutlined />, label: 'Estafetas' }
              ]}
            />
          </Sider>
          <Content className="home-content home-content--operator">
            <div className="home-content__welcome">
              <h2 className="home-content__welcome--title">
                Olá, {currentUserName}!
              </h2>
              <p className="home-content__welcome--desc">
                Consola de Operador - Faça a gestão das encomendas pendentes do sistema.
              </p>
            </div>

            <div className="home-content__table-wrapper">
              <OrdersTableOperador orders={orders} onStatusChange={handleStatusChange} />
            </div>
          </Content>
        </Layout>
      ) : (
        <Content className="home-content home-content--client">
          <div className="home-content__welcome">
            <h2 className="home-content__welcome--title">
              Olá, {currentUserName}!
            </h2>
            <p className="home-content__welcome--desc">Gere e consulta as tuas encomendas em tempo real.</p>
          </div>

          <div className="home-content__table-wrapper">
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

      <ProfileModal
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        onUpdateSuccess={(newName) => setCurrentUserName(newName)}
      />
    </Layout>
  );
};

export default HomeContainer;
