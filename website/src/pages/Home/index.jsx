import React, { useEffect, useState } from 'react';
import { Layout, Button, Spin, notification, Form } from 'antd';
import { PlusOutlined, LogoutOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';

import OrdersTable from '../../components/OrdersTableComponent';
import CreateOrderModal from '../../components/CreateOrderModalComponent';
import MapModal from '../../components/MapModalComponent';
import useMapLogic from '../../common/useMapLogic';
import useLoadOrders from '../../common/useLoadOrders';
import usePostalCode from '../../common/usePostalCode';
import useConfirmMap from '../../common/useConfirmMap';
import useCreateOrder from '../../common/useCreateOrder';

const { Header, Content } = Layout;

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
          if (json.group !== 'operador') {
            loadOrders(token);
          } else {
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
        zIndex: 1
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '800',
          color: '#5b5ce1',
          letterSpacing: '1px',
          fontFamily: "'Outfit', sans-serif"
        }}>
          DELIBERATIS
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

      <Content style={{ padding: '40px 24px', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        {userGroup === 'operador' ? (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: '#333333', fontSize: '28px', fontWeight: '600' }}>
              Olá, {userName}!
            </h2>
            <p style={{ color: '#666666', margin: '4px 0 0 0' }}>Página de operador</p>
          </div>
        ) : (
          <>
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
              <OrdersTable orders={orders} handleOpenCreateModal={handleOpenModal} />
            </div>
          </>
        )}
      </Content>

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
