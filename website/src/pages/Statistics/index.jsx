import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Card, Row, Col, Table, Tag, Progress, Spin, notification, Avatar, Empty } from 'antd';
import { 
  OrderedListOutlined, 
  UserSwitchOutlined, 
  BarChartOutlined, 
  UserOutlined, 
  LogoutOutlined,
  CarOutlined,
  CompassOutlined,
  CreditCardOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import _service from '@netuno/service-client';
import useSession from '../../common/useSession';
import ProfileModal from '../../components/ProfileModalComponent';
import './index.less';

const { Header, Content, Sider } = Layout;

const formatSeconds = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
};

const OrdersPieChart = ({ kpis }) => {
  const total = (kpis.total_encomendas) || 0;
  const items = [
    { label: 'Entregue', value: kpis.entregues || 0, color: '#52c41a' },
    { label: 'Em Trânsito', value: kpis.em_transito || 0, color: '#1890ff' },
    { label: 'Pendente', value: kpis.pendentes || 0, color: '#faad14' },
    { label: 'Rejeitada', value: kpis.rejeitadas || 0, color: '#ff4d4f' }
  ];

  if (total === 0) {
    return (
      <div style={{ padding: '30px 0', textAlign: 'center' }}>
        <Empty description="Sem encomendas registadas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const radius = 65;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
      <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          {items.map((item, idx) => {
            const percent = item.value / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            if (item.value === 0) return null;

            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: '24px', fontWeight: '800', color: '#1a1a2e', display: 'block', lineHeight: 1 }}>
            {total}
          </span>
          <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>
            Total
          </span>
        </div>
      </div>

      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', padding: '0 8px' }}>
        {items.map((item, idx) => {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          return (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '4px 6px',
                borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{item.label}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '12px', color: '#1a1a2e', marginRight: '4px' }}>{item.value}</strong>
                <span style={{ fontSize: '11px', color: '#888' }}>({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatisticsContainer = () => {
  const { sessionLoading, currentUserName, userGroup, logout } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const loadStatistics = (token) => {
    _service({
      url: '/statistics',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json }) => {
        if (json.result === true) {
          setStats(json);
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Não foi possível carregar as estatísticas.'
          });
        }
      },
      fail: () => {
        notification.error({
          message: 'Erro de Rede',
          description: 'Falha ao comunicar com o servidor para obter estatísticas.'
        });
      },
      end: () => {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (userGroup && userGroup !== 'operador') {
      window.location.href = '/home';
      return;
    }
    const token = localStorage.getItem('user_session_token');
    loadStatistics(token);
  }, [sessionLoading, userGroup]);

  if (sessionLoading || loading) {
    return (
      <div className="stats-loading">
        <Spin size="large" tip="A carregar métricas e estatísticas..." />
      </div>
    );
  }

  const kpis = stats?.kpis || {};
  const couriers = stats?.couriers || [];
  const cityStats = stats?.city_stats || [];
  const paymentStats = stats?.payment_stats || [];

  const courierColumns = [
    {
      title: 'Estafeta',
      key: 'estafeta',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            style={{ backgroundColor: '#5b5ce1', verticalAlign: 'middle' }}
            size="large"
          >
            {record.nome.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <strong style={{ fontSize: '14px', color: '#1a1a2e', display: 'block' }}>{record.nome}</strong>
            <span style={{ fontSize: '12px', color: '#888' }}>{record.telefone || 'Sem telefone'}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Veículo',
      key: 'veiculo',
      render: (_, record) => (
        <div>
          <span style={{ fontWeight: '600', color: '#333', display: 'block' }}>{record.veiculo}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>{record.matricula} ({record.velocidade || 50} km/h)</span>
        </div>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => {
        let color = 'default';
        if (estado === 'Disponível') color = 'success';
        else if (estado === 'Em Entrega') color = 'processing';
        else if (estado === 'Inativo') color = 'error';
        return <Tag color={color} style={{ fontWeight: '500' }}>{estado}</Tag>;
      }
    },
    {
      title: 'Entregas Concluídas',
      dataIndex: 'entregas_concluidas',
      key: 'entregas_concluidas',
      sorter: (a, b) => a.entregas_concluidas - b.entregas_concluidas,
      render: (val) => (
        <span style={{ fontWeight: '700', fontSize: '15px', color: '#52c41a' }}>
          {val}
        </span>
      )
    },
    {
      title: 'Em Curso',
      dataIndex: 'entregas_ativas',
      key: 'entregas_ativas',
      render: (val) => (
        <span style={{ fontWeight: '600', color: val > 0 ? '#1890ff' : '#999' }}>
          {val}
        </span>
      )
    },
    {
      title: 'Tempo Médio',
      dataIndex: 'tempo_medio_segundos',
      key: 'tempo_medio_segundos',
      sorter: (a, b) => a.tempo_medio_segundos - b.tempo_medio_segundos,
      render: (secs) => (
        <span style={{ fontWeight: '600', color: '#5b5ce1' }}>
          {formatSeconds(secs)}
        </span>
      )
    },
    {
      title: 'Valor Entregue',
      dataIndex: 'valor_total_entregue',
      key: 'valor_total_entregue',
      sorter: (a, b) => a.valor_total_entregue - b.valor_total_entregue,
      render: (val) => (
        <strong style={{ color: '#222' }}>
          {(val || 0).toFixed(2)} €
        </strong>
      )
    }
  ];

  return (
    <Layout className="stats-layout">
      <Header className="stats-header">
        <div className="stats-header__logo-container">
          <img src="/public/images/logo_deliberatis.png" alt="Deliberatis Logo" className="stats-header__logo" />
        </div>

        <div className="stats-header__actions">
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
          className="stats-sider"
        >
          <Menu
            mode="inline"
            selectedKeys={['estatisticas']}
            onClick={(e) => {
              if (e.key === 'pedidos') window.location.href = '/home';
              if (e.key === 'estafetas') window.location.href = '/estafetas';
            }}
            className="stats-sider__menu"
            items={[
              { key: 'pedidos', icon: <OrderedListOutlined />, label: 'Pedidos' },
              { key: 'estafetas', icon: <UserSwitchOutlined />, label: 'Estafetas' },
              { key: 'estatisticas', icon: <BarChartOutlined />, label: 'Estatísticas' }
            ]}
          />
        </Sider>

        <Content className="stats-content">
          <div className="stats-content__welcome">
            <h2 className="stats-content__welcome--title">
              Estatísticas & Desempenho
            </h2>
            <p className="stats-content__welcome--desc">
              Visão geral da operação, distribuição de encomendas e desempenho individual dos estafetas.
            </p>
          </div>

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={10}>
              <Card 
                title={
                  <span className="stats-content__card-title">
                    <PieChartOutlined style={{ marginRight: '8px', color: '#5b5ce1' }} />
                    Total de Encomendas
                  </span>
                }
                bordered={false}
                style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', height: '100%' }}
              >
                <OrdersPieChart kpis={kpis} />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={7}>
              <Card 
                title={
                  <span className="stats-content__card-title">
                    <CompassOutlined style={{ marginRight: '8px', color: '#5b5ce1' }} />
                    Top Cidades de Destino
                  </span>
                }
                bordered={false}
                style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', height: '100%' }}
              >
                {cityStats.length > 0 ? (
                  cityStats.map((item, idx) => {
                    const percent = kpis.total_encomendas > 0 ? Math.round((item.total / kpis.total_encomendas) * 100) : 0;
                    return (
                      <div key={idx} style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', color: '#333' }}>{item.cidade}</span>
                          <span style={{ color: '#666', fontSize: '13px' }}>
                            <strong>{item.total}</strong> ({item.entregues} entregues)
                          </span>
                        </div>
                        <Progress percent={percent} strokeColor="#5b5ce1" size="small" />
                      </div>
                    );
                  })
                ) : (
                  <span style={{ color: '#999' }}>Sem dados de cidades disponíveis.</span>
                )}
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={7}>
              <Card 
                title={
                  <span className="stats-content__card-title">
                    <CreditCardOutlined style={{ marginRight: '8px', color: '#5b5ce1' }} />
                    Métodos de Pagamento
                  </span>
                }
                bordered={false}
                style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', height: '100%' }}
              >
                {paymentStats.length > 0 ? (
                  paymentStats.map((item, idx) => {
                    const percent = kpis.total_encomendas > 0 ? Math.round((item.total / kpis.total_encomendas) * 100) : 0;
                    return (
                      <div key={idx} style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', color: '#333' }}>{item.metodo}</span>
                          <span style={{ color: '#666', fontSize: '13px' }}>
                            <strong>{item.total}</strong> ({(item.total_valor || 0).toFixed(2)} €)
                          </span>
                        </div>
                        <Progress percent={percent} strokeColor="#13c2c2" size="small" />
                      </div>
                    );
                  })
                ) : (
                  <span style={{ color: '#999' }}>Sem dados de pagamento disponíveis.</span>
                )}
              </Card>
            </Col>
          </Row>

          <Card 
            title={
              <span className="stats-content__card-title">
                <CarOutlined style={{ marginRight: '8px', color: '#5b5ce1' }} />
                Desempenho por Estafeta
              </span>
            }
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', marginBottom: '24px' }}
          >
            <Table 
              columns={courierColumns}
              dataSource={couriers}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: 'Sem dados de estafetas disponíveis.' }}
            />
          </Card>
        </Content>
      </Layout>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </Layout>
  );
};

export default StatisticsContainer;
