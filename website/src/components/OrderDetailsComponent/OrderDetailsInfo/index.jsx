import React from 'react';
import { Card } from 'antd';
import { 
  ShoppingOutlined, 
  CalendarOutlined, 
  PhoneOutlined, 
  CreditCardOutlined, 
  LinkOutlined, 
  FileTextOutlined 
} from '@ant-design/icons';

const OrderDetailsInfo = ({ order, formatDate }) => {
  return (
    <Card 
      title={
        <span style={{ fontSize: '18px', fontWeight: '600' }}>
          <ShoppingOutlined style={{ marginRight: '8px', color: '#5b5ce1' }} />
          Detalhes da Encomenda
        </span>
      }
      style={{ height: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
      bodyStyle={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
            <CalendarOutlined style={{ marginRight: '6px' }} />Data do Pedido
          </span>
          <strong style={{ fontSize: '17px', color: '#333', fontWeight: '600' }}>
            {formatDate(order.data)}
          </strong>
        </div>

        <div>
          <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
            Valor Total
          </span>
          <strong style={{ fontSize: '24px', color: '#2eb82e', fontWeight: '700' }}>
            {order.valor.toFixed(2)}€
          </strong>
        </div>

        <div>
          <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
            Descrição dos Itens
          </span>
          <div style={{ 
            fontSize: '16px', 
            color: '#444', 
            backgroundColor: '#fcfcfc', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            border: '1px solid #f0f0f0', 
            whiteSpace: 'pre-line', 
            marginTop: '4px', 
            lineHeight: '1.5' 
          }}>
            {order.descricao}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
              <PhoneOutlined style={{ marginRight: '6px' }} />Telemóvel
            </span>
            <strong style={{ color: '#333', fontSize: '16px', fontWeight: '600' }}>
              {order.telefone}
            </strong>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
              <CreditCardOutlined style={{ marginRight: '6px' }} />Pagamento
            </span>
            <strong style={{ color: '#333', fontSize: '16px', fontWeight: '600' }}>
              {order.pagamento}
            </strong>
          </div>
        </div>

        <div>
          <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
            <LinkOutlined style={{ marginRight: '6px' }} />Link de Rastreio
          </span>
          {order.estado === 'Pendente' ? (
            <span style={{ color: '#ff4d4f', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
              Link indisponível (a encomenda ainda está pendente)
            </span>
          ) : (
            <a 
              href={`/tracking?uid=${order.uid}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ fontSize: '15px', color: '#5b5ce1', fontWeight: '600' }}
            >
              {window.location.origin}/tracking?uid={order.uid}
            </a>
          )}
        </div>

        {order.estafeta_nome && (
          <div>
            <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
              Estafeta Atribuído
            </span>
            <strong style={{ color: '#333', fontSize: '16px', fontWeight: '600' }}>
              {order.estafeta_nome}
            </strong>
          </div>
        )}

        {order.motivo_rejeicao && (
          <div>
            <span style={{ color: '#ff4d4f', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
              Motivo da Rejeição
            </span>
            <div style={{ 
              fontSize: '15px', 
              color: '#ff4d4f', 
              backgroundColor: '#fff1f0', 
              padding: '10px 14px', 
              borderRadius: '4px', 
              borderLeft: '3px solid #ff4d4f', 
              marginTop: '4px', 
              lineHeight: '1.4' 
            }}>
              {order.motivo_rejeicao}
            </div>
          </div>
        )}

        {order.observacoes && (
          <div>
            <span style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
              <FileTextOutlined style={{ marginRight: '6px' }} />Observações
            </span>
            <div style={{ 
              fontSize: '15px', 
              color: '#666', 
              backgroundColor: '#fafafa', 
              padding: '10px 14px', 
              borderRadius: '4px', 
              borderLeft: '3px solid #5b5ce1', 
              marginTop: '4px', 
              lineHeight: '1.4' 
            }}>
              {order.observacoes}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default OrderDetailsInfo;
