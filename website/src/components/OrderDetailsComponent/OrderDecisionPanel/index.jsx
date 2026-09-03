import React, { useState } from 'react';
import { Card, Row, Col, Select, Button, Input, InputNumber, Radio, Space, notification } from 'antd';
import { ClockCircleOutlined, DashboardOutlined } from '@ant-design/icons';

const OrderDecisionPanel = ({
  couriers,
  submitting,
  onDecision,
  onCourierSelect,
  onCancel,
  selectedCourierId,
  onChangeCourierId,
  isProcessed,
  routeStats
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectedAction, setIsRejectedAction] = useState(false);
  const [simulationMode, setSimulationMode] = useState('real'); // 'real' | 'custom'
  const [customDuration, setCustomDuration] = useState(30); // in seconds

  const handleAccept = () => {
    if (!selectedCourierId) {
      notification.warning({
        message: 'Aviso',
        description: 'Por favor, selecione um estafeta.'
      });
      return;
    }

    let finalDurationSeconds = 60;
    if (simulationMode === 'real') {
      if (routeStats && routeStats.durationSeconds) {
        finalDurationSeconds = Math.max(10, Math.round(routeStats.durationSeconds));
      } else {
        finalDurationSeconds = 900; // fallback to 15 mins if route not loaded yet
      }
    } else {
      finalDurationSeconds = Math.max(5, customDuration || 30);
    }

    onDecision('Em Trânsito', selectedCourierId, null, finalDurationSeconds);
  };

  const handleReject = () => {
    if (isProcessed) return;
    if (!isRejectedAction) {
      setIsRejectedAction(true);
      return;
    }
    if (!rejectionReason || rejectionReason.trim() === '') {
      notification.warning({
        message: 'Aviso',
        description: 'Por favor, indique o motivo da rejeição.'
      });
      return;
    }
    onDecision('Rejeitada', null, rejectionReason, null);
  };

  return (
    <Card 
      title={<span style={{ fontWeight: '700', color: '#333' }}>Decisão do Operador & Atribuição de Estafeta</span>}
      bordered={false}
      style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
    >
      {isProcessed && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px 16px', 
          backgroundColor: '#f0f5ff', 
          border: '1px solid #adc6ff', 
          borderRadius: '6px',
          color: '#1d39c4',
          fontWeight: '600',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Esta encomenda já foi processada.
        </div>
      )}
      
      {!isProcessed && !isRejectedAction && (
        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
          <span style={{ color: '#555', fontSize: '13px', display: 'block', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Modalidade de Rastreio & Duração
          </span>
          <Radio.Group 
            value={simulationMode} 
            onChange={(e) => setSimulationMode(e.target.value)}
            disabled={submitting}
            style={{ marginBottom: '12px' }}
          >
            <Radio.Button value="real">
              <DashboardOutlined style={{ marginRight: '6px' }} />
              Tempo Real {routeStats?.duration ? `(${routeStats.duration})` : ''}
            </Radio.Button>
            <Radio.Button value="custom">
              <ClockCircleOutlined style={{ marginRight: '6px' }} />
              Simulação Personalizada
            </Radio.Button>
          </Radio.Group>

          {simulationMode === 'custom' && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#666' }}>Duração da entrega:</span>
              <InputNumber
                min={5}
                max={3600}
                value={customDuration}
                onChange={(val) => setCustomDuration(val)}
                addonAfter="segundos"
                disabled={submitting}
                style={{ width: '160px' }}
              />
              <Space>
                {[15, 30, 60, 120].map((sec) => (
                  <Button 
                    key={sec} 
                    size="small" 
                    type={customDuration === sec ? 'primary' : 'default'}
                    onClick={() => setCustomDuration(sec)}
                    disabled={submitting}
                  >
                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                  </Button>
                ))}
              </Space>
            </div>
          )}
        </div>
      )}

      <Row gutter={[24, 24]} align="bottom">
        <Col xs={24} md={12}>
          <span style={{ color: '#666', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Selecionar Estafeta *
          </span>
          <Select
            placeholder="Selecione um estafeta"
            style={{ width: '100%' }}
            size="large"
            showSearch
            filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
            value={selectedCourierId}
            onChange={(val) => {
              if (onChangeCourierId) {
                onChangeCourierId(val);
              }
              if (onCourierSelect) {
                onCourierSelect(val);
              }
            }}
            disabled={submitting || isRejectedAction || isProcessed}
          >
            {couriers
              .filter(c => c.estado === 'Disponível')
              .map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.nome} ({c.veiculo} - {c.matricula})
                </Select.Option>
              ))}
          </Select>
        </Col>
        
        <Col xs={24} md={12}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Button
              type="primary"
              size="large"
              loading={submitting}
              disabled={isRejectedAction || isProcessed}
              onClick={handleAccept}
              style={{ flex: 1, backgroundColor: isProcessed ? '#d9d9d9' : '#2eb82e', borderColor: isProcessed ? '#d9d9d9' : '#2eb82e', borderRadius: '6px', fontWeight: '600' }}
            >
              Aceitar (Em Trânsito)
            </Button>
            <Button
              type="primary"
              danger
              size="large"
              loading={submitting}
              disabled={isProcessed}
              onClick={handleReject}
              style={{ flex: 1, borderRadius: '6px', fontWeight: '600' }}
            >
              {isRejectedAction ? 'Confirmar Rejeição' : 'Rejeitar Encomenda'}
            </Button>
            {onCancel && (
              <Button
                size="large"
                disabled={submitting || isProcessed}
                onClick={onCancel}
                style={{ borderRadius: '6px', fontWeight: '600' }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </Col>

        {isRejectedAction && !isProcessed && (
          <Col xs={24}>
            <div style={{ marginTop: '16px' }}>
              <span style={{ color: '#ff4d4f', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Motivo de Rejeição *
              </span>
              <Input.TextArea
                rows={4}
                placeholder="Escreva aqui o motivo detalhado para rejeitar esta encomenda..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={submitting}
              />
              <Button 
                type="text" 
                onClick={() => {
                  setIsRejectedAction(false);
                  setRejectionReason('');
                }} 
                style={{ marginTop: '8px', padding: 0 }}
              >
                Cancelar Rejeição
              </Button>
            </div>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export default OrderDecisionPanel;
