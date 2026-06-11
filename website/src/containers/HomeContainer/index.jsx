import React, { useEffect, useState } from 'react';
import { Layout, Button, Table, Empty, notification, Spin, Modal, Form, Input, InputNumber, Select } from 'antd';
import { PlusOutlined, LogoutOutlined, ShoppingCartOutlined, LoadingOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import _service from '@netuno/service-client';

const { Header, Content } = Layout;
const { Option } = Select;

const DISTRITOS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", 
  "Évora", "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", 
  "Porto", "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu"
];

const HomeContainer = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  const [loadingPostalCode, setLoadingPostalCode] = useState(false);
  const [postalCodeStatus, setPostalCodeStatus] = useState('none'); // 'none' | 'success' | 'error'
  const [postalCodeErrorMsg, setPostalCodeErrorMsg] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingMap, setSearchingMap] = useState(false);
  const [hasConfirmedPin, setHasConfirmedPin] = useState(false);
  const [isSubmittingFlow, setIsSubmittingFlow] = useState(false);
  const [formValuesToSubmit, setFormValuesToSubmit] = useState(null);

  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markerInstanceRef = React.useRef(null);

  const reverseGeocode = (lat, lng) => {
    setLoadingPostalCode(true);
    setPostalCodeStatus('none');
    setPostalCodeErrorMsg('');

    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/map-reverse',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: { lat, lng },
      success: ({ json }) => {
        if (json && json.address) {
          const addr = json.address;
          if (addr.country_code !== 'pt') {
            notification.warning({
              message: 'Localização Inválida',
              description: 'Não podes selecionar uma morada fora de Portugal.'
            });
            if (markerInstanceRef.current) {
              markerInstanceRef.current.remove();
              markerInstanceRef.current = null;
            }
            return;
          }
          const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.cycleway || '';
          const postcode = addr.postcode || '';
          
          // Match state/county to one of the 18 districts
          const districtVal = addr.state || addr.county || addr.city || '';
          const matchedDistrict = DISTRITOS.find(d => 
            districtVal.toLowerCase().includes(d.toLowerCase()) || 
            d.toLowerCase().includes(districtVal.toLowerCase())
          ) || '';

          form.setFieldsValue({
            rua: road,
            codigo_postal: postcode,
            cidade: matchedDistrict || undefined
          });

          setHasConfirmedPin(true);

          if (postcode) {
            setPostalCodeStatus('success');
          } else {
            setPostalCodeStatus('none');
          }
        } else {
          notification.warning({
            message: 'Localização Inválida',
            description: 'Não podes selecionar uma morada fora de Portugal.'
          });
          if (markerInstanceRef.current) {
            markerInstanceRef.current.remove();
            markerInstanceRef.current = null;
          }
        }
      },
      fail: () => {
        setPostalCodeStatus('error');
        setPostalCodeErrorMsg('Houve uma falha ao obter a morada do mapa. Preencha os campos abaixo.');
      },
      end: () => {
        setLoadingPostalCode(false);
      }
    });
  };

  const handleMapSearch = () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    setSearchingMap(true);

    const token = localStorage.getItem('user_session_token');
    _service({
      url: '/map-search',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: { q: searchQuery },
      success: ({ json }) => {
        if (json && json.length > 0) {
          const { lat, lon } = json[0];
          const latFloat = parseFloat(lat);
          const lonFloat = parseFloat(lon);
          mapInstanceRef.current.setView([latFloat, lonFloat], 12);
        } else {
          notification.warning({
            message: 'Pesquisa no Mapa',
            description: 'Localização não encontrada em Portugal.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Pesquisa no Mapa',
          description: 'Houve uma falha ao comunicar com o serviço de pesquisa.'
        });
      },
      end: () => {
        setSearchingMap(false);
      }
    });
  };

  useEffect(() => {
    if (isMapModalOpen) {
      const timer = setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          const L = window.L;
          if (!L) return;

          const southWest = L.latLng(30.0, -32.0);
          const northEast = L.latLng(42.5, -6.0);
          const bounds = L.latLngBounds(southWest, northEast);

          const defaultCenter = [39.5, -8.0];
          const map = L.map(mapRef.current, {
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            minZoom: 5
          }).setView(defaultCenter, 6);
          mapInstanceRef.current = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            
            if (markerInstanceRef.current) {
              markerInstanceRef.current.setLatLng(e.latlng);
            } else {
              markerInstanceRef.current = L.marker(e.latlng).addTo(map);
            }

            reverseGeocode(lat, lng);
          });
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      setSearchQuery('');
    }
  }, [isMapModalOpen]);

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
      headers: {
        'Authorization': 'Bearer ' + token
      },
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
      headers: {
        'Authorization': 'Bearer ' + token
      },
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

  const handleOpenMapModal = () => {
    setIsMapModalOpen(true);

    const rua = form.getFieldValue('rua');
    const cidade = form.getFieldValue('cidade');
    const codigo_postal = form.getFieldValue('codigo_postal');

    if (!hasConfirmedPin && (rua || cidade || codigo_postal)) {
      const searchTerms = [rua, cidade, 'Portugal'].filter(Boolean).join(', ');

      setTimeout(() => {
        if (mapInstanceRef.current) {
          const L = window.L;
          if (!L) return;

          const token = localStorage.getItem('user_session_token');
          _service({
            url: '/map-search',
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + token
            },
            data: { q: searchTerms },
            success: ({ json }) => {
              if (json && json.length > 0) {
                const { lat, lon } = json[0];
                const latFloat = parseFloat(lat);
                const lonFloat = parseFloat(lon);
                const latlng = L.latLng(latFloat, lonFloat);

                if (markerInstanceRef.current) {
                  markerInstanceRef.current.setLatLng(latlng);
                } else {
                  markerInstanceRef.current = L.marker(latlng).addTo(mapInstanceRef.current);
                }
                mapInstanceRef.current.setView(latlng, 15);
                reverseGeocode(latFloat, lonFloat);
              }
            }
          });
        }
      }, 500);
    }
  };

  const handleConfirmLocation = () => {
    if (!markerInstanceRef.current) {
      notification.warning({
        message: 'Aviso',
        description: 'Por favor, clica no mapa para colocar o pin antes de confirmar a localização.'
      });
      return;
    }
    setHasConfirmedPin(true);
    setIsMapModalOpen(false);

    if (isSubmittingFlow && formValuesToSubmit) {
      submitOrder(formValuesToSubmit);
      setIsSubmittingFlow(false);
      setFormValuesToSubmit(null);
    }
  };

  const handleCloseModal = () => {
    form.resetFields();
    setPostalCodeStatus('none');
    setPostalCodeErrorMsg('');
    setLoadingPostalCode(false);
    setHasConfirmedPin(false);
    setIsSubmittingFlow(false);
    setFormValuesToSubmit(null);
    setIsModalOpen(false);
  };

  const handlePostalCodeChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 4) {
      formatted = raw.substring(0, 4) + '-' + raw.substring(4, 7);
    }
    form.setFieldsValue({ codigo_postal: formatted });

    if (formatted.length < 8) {
      setPostalCodeStatus('none');
      setPostalCodeErrorMsg('');
    }

    if (formatted.length === 8) {
      const token = localStorage.getItem('user_session_token');
      setLoadingPostalCode(true);
      setPostalCodeStatus('none');
      setPostalCodeErrorMsg('');

      _service({
        url: '/postal-code',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        data: { code: formatted },
        success: ({ json }) => {
          if (json.result === true) {
            form.setFieldsValue({
              rua: json.rua,
              cidade: json.cidade
            });
            setPostalCodeStatus('success');
          } else {
            setPostalCodeStatus('error');
            setPostalCodeErrorMsg(json.error || 'Código postal inválido ou não encontrado.');
          }
        },
        fail: () => {
          setPostalCodeStatus('error');
          setPostalCodeErrorMsg('Houve uma falha ao consultar o código postal.');
        },
        end: () => {
          setLoadingPostalCode(false);
        }
      });
    }
  };

  const submitOrder = (values) => {
    const token = localStorage.getItem('user_session_token');
    if (!token) {
      logout();
      return;
    }

    _service({
      url: '/orders',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: values,
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

  const handleCreateOrder = (values) => {
    setFormValuesToSubmit(values);
    setIsSubmittingFlow(true);
    setIsMapModalOpen(true);

    const { rua, cidade, codigo_postal } = values;
    const searchTerms = [rua, cidade, 'Portugal'].filter(Boolean).join(', ');

    notification.info({
      message: 'Confirmação de Morada',
      description: 'Por favor, confirme no mapa se o pin azul está no local exato da sua morada e clique em "Confirmar Localização".'
    });

    setTimeout(() => {
      if (mapInstanceRef.current) {
        const L = window.L;
        if (!L) return;

        if (markerInstanceRef.current) {
          const latlng = markerInstanceRef.current.getLatLng();
          mapInstanceRef.current.setView(latlng, 16);
        } else {
          const token = localStorage.getItem('user_session_token');
          _service({
            url: '/map-search',
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + token
            },
            data: { q: searchTerms },
            success: ({ json }) => {
              if (json && json.length > 0) {
                const { lat, lon } = json[0];
                const latFloat = parseFloat(lat);
                const lonFloat = parseFloat(lon);
                const latlng = L.latLng(latFloat, lonFloat);

                if (markerInstanceRef.current) {
                  markerInstanceRef.current.setLatLng(latlng);
                } else {
                  markerInstanceRef.current = L.marker(latlng).addTo(mapInstanceRef.current);
                }
                mapInstanceRef.current.setView(latlng, 16);
              }
            }
          });
        }
      }
    }, 500);
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
          onValuesChange={(changedValues) => {
            if ('rua' in changedValues || 'cidade' in changedValues || 'codigo_postal' in changedValues) {
              setHasConfirmedPin(false);
            }
          }}
        >
          {/* Campo Descrição */}
          <Form.Item
            name="descricao"
            label="Descrição da Encomenda"
            rules={[{ required: true, message: 'Insere os detalhes da encomenda!' }]}
          >
            <Input.TextArea placeholder="Ex: Hambúrguer, Batatas Fritas e Cola Zero" rows={3} />
          </Form.Item>

          {/* Botão para abrir o Mapa */}
          <div style={{ marginBottom: '16px' }}>
            <Button 
              type="dashed" 
              onClick={handleOpenMapModal}
              style={{ width: '100%', height: '40px', fontWeight: '500' }}
            >
              🗺️ Selecionar Localização no Mapa
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Campo Preço */}
            <Form.Item
              name="preco"
              label="Preço (€)"
              rules={[{ required: true, message: 'Insere o valor da encomenda!' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                step={0.01}
                placeholder="Ex: 12.50"
                formatter={(value) => `${value}`}
              />
            </Form.Item>

             {/* Campo Código Postal */}
             <Form.Item
               name="codigo_postal"
               label="Código Postal"
               rules={[
                 { required: true, message: 'Insere o código postal!' },
                 { pattern: /^\d{4}-\d{3}$/, message: 'Formato inválido (XXXX-XXX)!' }
               ]}
               validateStatus={postalCodeStatus === 'error' ? 'error' : postalCodeStatus === 'success' ? 'success' : ''}
               help={postalCodeErrorMsg || null}
               style={{ flex: 1 }}
             >
               <Input 
                 placeholder="Ex: 4000-011" 
                 onChange={handlePostalCodeChange} 
                 maxLength={8} 
                 suffix={
                   loadingPostalCode ? (
                     <Spin size="small" indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
                   ) : postalCodeStatus === 'success' ? (
                     <CheckCircleFilled style={{ color: '#52c41a' }} />
                   ) : postalCodeStatus === 'error' ? (
                     <CloseCircleFilled style={{ color: '#ff4d4f' }} />
                   ) : null
                 }
               />
             </Form.Item>
           </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Campo Rua */}
            <Form.Item
              name="rua"
              label="Rua"
              rules={[{ required: true, message: 'Falta preencher a rua!' }]}
              style={{ flex: 2 }}
            >
              <Input placeholder="Ex: Rua Quinta da Bica (ou aguarde preenchimento)" style={{ color: '#000000' }} />
            </Form.Item>

            {/* Campo Cidade */}
            <Form.Item
              name="cidade"
              label="Cidade / Distrito"
              rules={[{ required: true, message: 'Falta selecionar o distrito!' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Selecionar..." showSearch filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}>
                {DISTRITOS.map(d => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Campo Porta */}
            <Form.Item
              name="porta"
              label="Porta/Nº"
              rules={[{ required: true, message: 'Insere o número de porta!' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Ex: 10" />
            </Form.Item>

            {/* Campo Andar */}
            <Form.Item
              name="andar"
              label="Andar / Fração"
              rules={[{ required: true, message: 'Insere o andar ou fração!' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Ex: 3º Esq" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Campo Número de Telemóvel */}
            <Form.Item
              name="telefone"
              label="Telemóvel de Contacto"
              rules={[
                { required: true, message: 'Insere o contacto telefónico!' },
                { pattern: /^9\d{8}$/, message: 'Insere um número de telefone português válido (9 dígitos e que começe por 9)!' }
              ]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Ex: 912345678" />
            </Form.Item>

            {/* Campo Método de Pagamento */}
            <Form.Item
              name="pagamento"
              label="Método de Pagamento"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="MBWay">MBWay</Option>
                <Option value="Dinheiro na Entrega">Dinheiro na Entrega</Option>
                <Option value="Cartão de Crédito/Débito">Cartão de Crédito/Débito</Option>
              </Select>
            </Form.Item>
          </div>

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

      {/* Pop-up do Mapa de Seleção de Localização */}
      <Modal
        title="Selecionar Localização no Mapa"
        open={isMapModalOpen}
        onCancel={() => setIsMapModalOpen(false)}
        footer={[
          <Button key="confirm" type="primary" onClick={handleConfirmLocation} style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}>
            Confirmar Localização
          </Button>
        ]}
        width={600}
        destroyOnClose
      >
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Input 
            placeholder="Pesquisar localidade (ex: Algarve, Porto, Coimbra)..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            onPressEnter={handleMapSearch}
          />
          <Button type="primary" onClick={handleMapSearch} loading={searchingMap} style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}>
            Pesquisar
          </Button>
        </div>
        <div 
          ref={mapRef} 
          style={{ 
            height: '350px', 
            width: '100%', 
            borderRadius: '8px', 
            border: '1px solid #d9d9d9',
            zIndex: 1
          }} 
        />
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          Clique no mapa para colocar o PIN azul e preencher a morada.
        </div>
      </Modal>
    </Layout>
  );
};

export default HomeContainer;
