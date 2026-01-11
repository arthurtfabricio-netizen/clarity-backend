// netlify/functions/check-payment.js
// Verifica status de pagamento no Mercado Pago
// Usa variável de ambiente: MP_ACCESS_TOKEN

const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Aceitar tanto GET com query params quanto POST com body
    let paymentId;
    
    if (event.httpMethod === 'GET') {
      paymentId = event.queryStringParameters?.payment_id;
    } else if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      paymentId = body.paymentId || body.payment_id;
    }

    if (!paymentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing payment_id parameter' })
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

    // Consultar status no Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      }
    });

    const paymentData = await response.json();

    if (paymentData.error) {
      console.error('Payment check error:', paymentData);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Payment not found',
          status: 'unknown'
        })
      };
    }

    // Mapear status do Mercado Pago
    // approved, pending, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back
    let status = 'pending';
    
    switch (paymentData.status) {
      case 'approved':
      case 'authorized':
        status = 'approved';
        break;
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        status = 'pending';
        break;
      case 'rejected':
      case 'cancelled':
      case 'refunded':
      case 'charged_back':
        status = 'rejected';
        break;
      default:
        status = 'pending';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        paymentId: paymentData.id,
        status: status,
        statusDetail: paymentData.status_detail,
        amount: paymentData.transaction_amount,
        currency: paymentData.currency_id,
        payerEmail: paymentData.payer?.email,
        externalReference: paymentData.external_reference,
        dateCreated: paymentData.date_created,
        dateApproved: paymentData.date_approved
      })
    };

  } catch (error) {
    console.error('Payment check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
