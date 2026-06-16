import { useState } from 'react';
import _service from '@netuno/service-client';

export default function usePostalCode(form) {
  const [loadingPostalCode, setLoadingPostalCode] = useState(false);
  const [postalCodeStatus, setPostalCodeStatus] = useState('none'); // 'none' | 'success' | 'error'
  const [postalCodeErrorMsg, setPostalCodeErrorMsg] = useState('');

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

  return {
    loadingPostalCode,
    setLoadingPostalCode,
    postalCodeStatus,
    setPostalCodeStatus,
    postalCodeErrorMsg,
    setPostalCodeErrorMsg,
    handlePostalCodeChange
  };
}
