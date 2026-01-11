// netlify/functions/send-email.js
// Envia email com PDF anexado via Resend
// Usa variável: RESEND_API_KEY

const fetch = require('node-fetch');

// ════════════════════════════════════════════════════════════════════════════════
// TEMPLATES DE EMAIL
// ════════════════════════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES = {
  pt: {
    subject: '✨ Seu Plano de Energia Personalizado está pronto',
    preview: 'Baixe seu PDF e comece sua jornada de restauração de energia',
    greeting: (name) => `Olá, ${name || 'você'}!`,
    intro: 'Seu plano personalizado de restauração de energia está pronto. Passamos por todas as suas respostas e criamos um guia completo especialmente para você.',
    whatYouGet: 'O que você encontrará no seu PDF:',
    features: [
      'Análise detalhada do seu padrão de cansaço',
      'Rotina diária personalizada (manhã, tarde e noite)',
      'Estratégias práticas de gestão de energia',
      'Hábitos de sono recomendados',
      'Orientações nutricionais',
      'Plano semanal estruturado',
      'Links para recursos complementares'
    ],
    cta: 'Seu PDF está anexado a este email. Recomendamos salvar uma cópia e consultar regularmente.',
    nextSteps: 'Próximos passos:',
    steps: [
      'Baixe e salve o PDF em um lugar de fácil acesso',
      'Comece implementando a rotina matinal amanhã',
      'Faça pequenas mudanças graduais, sem pressa',
      'Acompanhe como se sente ao longo da semana'
    ],
    reminder: 'Lembre-se: mudanças duradouras acontecem aos poucos. Seja gentil consigo mesmo durante esse processo.',
    support: 'Dúvidas? Basta responder este email.',
    closing: 'Com carinho,',
    signature: 'Equipe Clarity',
    footer: 'Este email foi enviado porque você solicitou um diagnóstico de cansaço em Clarity. Este conteúdo não substitui orientação médica profissional.'
  },
  en: {
    subject: '✨ Your Personalized Energy Plan is Ready',
    preview: 'Download your PDF and start your energy restoration journey',
    greeting: (name) => `Hello, ${name || 'there'}!`,
    intro: 'Your personalized energy restoration plan is ready. We\'ve reviewed all your answers and created a comprehensive guide just for you.',
    whatYouGet: 'What you\'ll find in your PDF:',
    features: [
      'Detailed analysis of your fatigue pattern',
      'Personalized daily routine (morning, afternoon, evening)',
      'Practical energy management strategies',
      'Recommended sleep habits',
      'Nutritional guidelines',
      'Structured weekly plan',
      'Links to additional resources'
    ],
    cta: 'Your PDF is attached to this email. We recommend saving a copy and consulting it regularly.',
    nextSteps: 'Next steps:',
    steps: [
      'Download and save the PDF somewhere easily accessible',
      'Start implementing the morning routine tomorrow',
      'Make small, gradual changes, no rush',
      'Track how you feel throughout the week'
    ],
    reminder: 'Remember: lasting changes happen little by little. Be kind to yourself during this process.',
    support: 'Questions? Just reply to this email.',
    closing: 'Warmly,',
    signature: 'The Clarity Team',
    footer: 'This email was sent because you requested a fatigue diagnosis from Clarity. This content does not replace professional medical advice.'
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GERAR HTML DO EMAIL
// ════════════════════════════════════════════════════════════════════════════════

function generateEmailHTML(template, name) {
  const t = template;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #8b5cf6, #a78bfa); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 20px; margin-bottom: 20px; color: #1a1a1a; }
    .intro { color: #555; margin-bottom: 30px; }
    .section-title { color: #8b5cf6; font-size: 16px; font-weight: 600; margin: 30px 0 15px; }
    .feature-list { list-style: none; padding: 0; margin: 0; }
    .feature-list li { padding: 8px 0 8px 25px; position: relative; color: #444; }
    .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #34d399; font-weight: bold; }
    .cta-box { background: #f8f5ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0; }
    .steps-list { list-style: none; padding: 0; margin: 0; counter-reset: steps; }
    .steps-list li { padding: 10px 0 10px 35px; position: relative; color: #444; }
    .steps-list li:before { counter-increment: steps; content: counter(steps); position: absolute; left: 0; width: 24px; height: 24px; background: #e9e3ff; color: #8b5cf6; border-radius: 50%; font-size: 12px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
    .reminder { background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 30px 0; color: #166534; }
    .signature { margin-top: 40px; color: #666; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Clarity</h1>
      <p>Diagnóstico de Cansaço</p>
    </div>
    
    <div class="content">
      <p class="greeting">${t.greeting(name)}</p>
      <p class="intro">${t.intro}</p>
      
      <p class="section-title">${t.whatYouGet}</p>
      <ul class="feature-list">
        ${t.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      
      <div class="cta-box">
        <p style="margin: 0; color: #5b21b6; font-weight: 500;">${t.cta}</p>
      </div>
      
      <p class="section-title">${t.nextSteps}</p>
      <ol class="steps-list">
        ${t.steps.map(s => `<li>${s}</li>`).join('')}
      </ol>
      
      <div class="reminder">
        💚 ${t.reminder}
      </div>
      
      <p style="color: #666;">${t.support}</p>
      
      <div class="signature">
        <p>${t.closing}</p>
        <p><strong>${t.signature}</strong></p>
      </div>
    </div>
    
    <div class="footer">
      <p>${t.footer}</p>
    </div>
  </div>
</body>
</html>
`;
}

// ════════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { 
      email, 
      name, 
      pdfBase64, 
      lang = 'pt',
      orderId,
      supportEmail = 'suporte@clarity.com.br'
    } = JSON.parse(event.body);

    if (!email || !pdfBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: email, pdfBase64' })
      };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    // Detectar idioma
    const detectedLang = (lang || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en';
    const template = EMAIL_TEMPLATES[detectedLang];

    // Gerar HTML do email
    const htmlContent = generateEmailHTML(template, name);

    // Enviar via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Clarity <noreply@${process.env.RESEND_DOMAIN || 'clarity.com.br'}>`,
        reply_to: supportEmail,
        to: [email],
        subject: template.subject,
        html: htmlContent,
        attachments: [
          {
            filename: `clarity-plano-energia-${orderId || 'personalizado'}.pdf`,
            content: pdfBase64
          }
        ]
      })
    });

    const result = await response.json();

    if (result.error) {
      console.error('Resend error:', result);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: result.error.message || 'Email sending failed' })
      };
    }

    console.log(`Email sent successfully to ${email}, ID: ${result.id}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        emailId: result.id,
        sentTo: email,
        lang: detectedLang,
        sentAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message 
      })
    };
  }
};
