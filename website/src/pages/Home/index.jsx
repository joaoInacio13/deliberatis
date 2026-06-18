import React, { useEffect, useState } from 'react';
import { Layout, Button, Spin, notification, Form, Menu } from 'antd';
import { PlusOutlined, LogoutOutlined, OrderedListOutlined, UserSwitchOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';

import OrdersTableCliente from '../../components/OrdersTableClienteComponent';
import OrdersTableOperador from '../../components/OrdersTableOperadorComponent';
import CreateOrderModal from '../../components/CreateOrderModalComponent';
import MapModal from '../../components/MapModalComponent';
import useMapLogic from '../../common/useMapLogic';
import useLoadOrders from '../../common/useLoadOrders';
import usePostalCode from '../../common/usePostalCode';
import useConfirmMap from '../../common/useConfirmMap';
import useCreateOrder from '../../common/useCreateOrder';

const { Header, Content, Sider } = Layout;

const HomeContainer = () => {
  const { orders, loading, loadOrders, setLoading } = useLoadOrders();
  const [userName, setUserName] = useState('');
  const [userGroup, setUserGroup] = useState('cliente');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [hasConfirmedPin, setHasConfirmedPin] = useState(false);
  const [confirmedCoords, setConfirmedCoords] = useState(null);

  const {
    loadingPostalCode,
    setLoadingPostalCode,
    postalCodeStatus,
    setPostalCodeStatus,
    postalCodeErrorMsg,
    setPostalCodeErrorMsg,
    handlePostalCodeChange
  } = usePostalCode(form);

  const {
    mapRef,
    mapInstanceRef,
    markerInstanceRef,
    reverseGeocode
  } = useMapLogic({
    form,
    isMapModalOpen,
    setPostalCodeStatus,
    setPostalCodeErrorMsg,
    setLoadingPostalCode,
    setHasConfirmedPin,
    confirmedCoords
  });

  const {
    searchingMap,
    searchQuery,
    setSearchQuery,
    handleMapSearch,
    handleConfirmLocation,
    handleOpenMapModal,
    locateAddressOnMap
  } = useConfirmMap({
    form,
    setIsMapModalOpen,
    setHasConfirmedPin,
    markerInstanceRef,
    mapInstanceRef,
    reverseGeocode,
    setConfirmedCoords
  });

  const {
    submitting,
    handleCreateOrder,
    handleConfirmLocation: executeSubmitOnConfirm,
    resetCreateOrderFlow
  } = useCreateOrder({
    loadOrders,
    handleCloseModal: () => handleCloseModal(),
    setIsMapModalOpen,
    locateAddressOnMap,
    setConfirmedCoords
  });

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
          setUserName(json.primeiro_nome);
          setUserGroup(json.group || 'cliente');
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

  const handleStatusChange = (orderUid, newStatus) => {
    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/order/status',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        uid: orderUid,
        estado: newStatus
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Sucesso',
            description: 'Estado da encomenda atualizado para ' + newStatus + '.'
          });
          loadOrders(token);
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Não foi possível atualizar o estado.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Falha ao comunicar com o servidor.'
        });
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
    setPostalCodeStatus('none');
    setPostalCodeErrorMsg('');
    setLoadingPostalCode(false);
    setHasConfirmedPin(false);
    resetCreateOrderFlow();
    setIsModalOpen(false);
  };

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
