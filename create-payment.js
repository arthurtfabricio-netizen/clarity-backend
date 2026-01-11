// netlify/functions/create-payment.js
// Cria pagamento no Mercado Pago (PIX ou Cartão)
// Usa variável de ambiente: MP_ACCESS_TOKEN

const fetch = require('node-fetch');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, amount, currency, paymentMethod, description, orderId } = JSON.parse(event.body);

    // Validações
    if (!email || !amount || !paymentMethod) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: email, amount, paymentMethod' })
      };
    }

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Payment service not configured' })
      };
    }

    // Criar pagamento no Mercado Pago
    if (paymentMethod === 'pix') {
      // Pagamento PIX
      const pixPayment = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${orderId}-${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: parseFloat(amount),
          payment_method_id: 'pix',
          payer: {
            email: email
          },
          description: description || 'Clarity - Diagnóstico de Cansaço',
          external_reference: orderId
        })
      });

      const pixData = await pixPayment.json();

      if (pixData.error) {
        console.error('Mercado Pago error:', pixData);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: pixData.message || 'Payment creation failed' })
        };
      }

      // Retornar dados do PIX
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          paymentId: pixData.id,
          status: pixData.status,
          pixCode: pixData.point_of_interaction?.transaction_data?.qr_code,
          pixQrCode: pixData.point_of_interaction?.transaction_data?.qr_code_base64,
          expirationDate: pixData.date_of_expiration
        })
      };

    } else if (paymentMethod === 'card') {
      // Pagamento com Cartão - Criar preferência de checkout
      const preference = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{
            title: 'Clarity - Diagnóstico de Cansaço',
            description: description || 'Plano personalizado de restauração de energia',
            quantity: 1,
            currency_id: currency || 'BRL',
            unit_price: parseFloat(amount)
          }],
          payer: {
            email: email
          },
          external_reference: orderId,
          back_urls: {
            success: `${event.headers.origin || 'https://clarity.netlify.app'}/#/confirmacao`,
            failure: `${event.headers.origin || 'https://clarity.netlify.app'}/#/checkout`,
            pending: `${event.headers.origin || 'https://clarity.netlify.app'}/#/checkout`
          },
          auto_return: 'approved',
          payment_methods: {
            excluded_payment_types: [{ id: 'ticket' }],
            installments: 3
          }
        })
      });

      const prefData = await preference.json();

      if (prefData.error) {
        console.error('Mercado Pago preference error:', prefData);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: prefData.message || 'Preference creation failed' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          preferenceId: prefData.id,
          initPoint: prefData.init_point,
          sandboxInitPoint: prefData.sandbox_init_point
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid payment method. Use "pix" or "card"' })
    };

  } catch (error) {
    console.error('Payment creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
