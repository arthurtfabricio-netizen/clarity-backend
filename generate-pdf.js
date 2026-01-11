// netlify/functions/generate-pdf.js
// Gera PDF personalizado usando OpenAI para conteúdo
// Usa variáveis: OPENAI_API_KEY
// Retorna PDF em base64

const fetch = require('node-fetch');
const { jsPDF } = require('jspdf');

// ════════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES PARA O PDF
// ════════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Diagnóstico de Cansaço',
    subtitle: 'Plano Personalizado de Restauração de Energia',
    preparedFor: 'Preparado para',
    date: 'Data',
    disclaimer: 'AVISO IMPORTANTE: Este documento não constitui diagnóstico médico. As informações aqui contidas são de caráter educacional e orientativo. Para questões de saúde, consulte sempre um profissional qualificado.',
    sections: {
      summary: 'Resumo do Seu Perfil',
      diagnosis: 'Análise do Seu Cansaço',
      morningRoutine: 'Rotina Matinal Recomendada',
      afternoonRoutine: 'Rotina da Tarde',
      eveningRoutine: 'Rotina Noturna',
      sleepHabits: 'Hábitos de Sono',
      energyManagement: 'Gestão de Energia',
      dopamineBalance: 'Equilíbrio de Dopamina',
      nutrition: 'Orientações Nutricionais',
      avoidList: 'O Que Evitar',
      weeklyPlan: 'Plano Semanal',
      resources: 'Recursos Complementares',
      finalNote: 'Nota Final'
    },
    notProvided: 'Não informado',
    age: 'Idade',
    sleepHours: 'Horas de sono',
    sleepQuality: 'Qualidade do sono',
    stressLevel: 'Nível de estresse',
    energyLevel: 'Nível de energia',
    exercise: 'Exercício físico',
    screens: 'Tempo de telas',
    footer: 'Clarity — Diagnóstico de Cansaço'
  },
  en: {
    title: 'Fatigue Diagnosis',
    subtitle: 'Personalized Energy Restoration Plan',
    preparedFor: 'Prepared for',
    date: 'Date',
    disclaimer: 'IMPORTANT NOTICE: This document does not constitute a medical diagnosis. The information contained herein is educational and advisory in nature. For health concerns, always consult a qualified professional.',
    sections: {
      summary: 'Your Profile Summary',
      diagnosis: 'Your Fatigue Analysis',
      morningRoutine: 'Recommended Morning Routine',
      afternoonRoutine: 'Afternoon Routine',
      eveningRoutine: 'Evening Routine',
      sleepHabits: 'Sleep Habits',
      energyManagement: 'Energy Management',
      dopamineBalance: 'Dopamine Balance',
      nutrition: 'Nutritional Guidelines',
      avoidList: 'What to Avoid',
      weeklyPlan: 'Weekly Plan',
      resources: 'Additional Resources',
      finalNote: 'Final Note'
    },
    notProvided: 'Not provided',
    age: 'Age',
    sleepHours: 'Sleep hours',
    sleepQuality: 'Sleep quality',
    stressLevel: 'Stress level',
    energyLevel: 'Energy level',
    exercise: 'Physical exercise',
    screens: 'Screen time',
    footer: 'Clarity — Fatigue Diagnosis'
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GERAR CONTEÚDO COM OPENAI
// ════════════════════════════════════════════════════════════════════════════════

async function generateContentWithAI(answers, lang) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  // Construir contexto do usuário
  const userContext = `
Nome: ${answers.name || t.notProvided}
Faixa etária: ${answers.age || t.notProvided}
Gênero: ${answers.sex === 'f' ? 'Feminino' : answers.sex === 'm' ? 'Masculino' : t.notProvided}
Horas de sono: ${answers.sleep_hours || t.notProvided}
Qualidade do sono: ${answers.sleep_quality || t.notProvided}
Nível de energia (1-5): ${answers.energy_level || t.notProvided}
Momento de maior cansaço: ${answers.energy_time || t.notProvided}
Alimentação: ${answers.diet || t.notProvided}
Nível de estresse (1-5): ${answers.stress || t.notProvided}
Fontes de estresse: ${Array.isArray(answers.stress_sources) ? answers.stress_sources.join(', ') : t.notProvided}
Rotina de trabalho: ${answers.work || t.notProvided}
Frequência de exercícios: ${answers.exercise || t.notProvided}
Tempo de telas: ${answers.screens || t.notProvided}
Situação difícil recente: ${answers.trauma || t.notProvided}
Objetivo principal: ${answers.goal || t.notProvided}
`.trim();

  const systemPrompt = lang === 'pt' ? `
Você é um especialista em bem-estar e gestão de energia. Gere um plano personalizado de restauração de energia baseado nos dados do usuário.

REGRAS CRÍTICAS:
1. NUNCA faça promessas médicas ou diagnósticos de doenças
2. NUNCA sugira medicamentos ou tratamentos médicos
3. Use linguagem acolhedora, humana e empática
4. Se algum dado não foi fornecido, mencione explicitamente que a recomendação é genérica por falta dessa informação
5. Foque em hábitos, rotinas e mudanças de estilo de vida
6. Inclua links reais do YouTube para meditação/relaxamento quando apropriado
7. Seja específico e prático nas recomendações
8. O texto deve ter profundidade suficiente para ~8 páginas de PDF

Retorne um JSON válido com esta estrutura exata:
{
  "diagnosis": "Análise detalhada do padrão de cansaço identificado (3-4 parágrafos)",
  "morningRoutine": ["item 1", "item 2", ...],
  "afternoonRoutine": ["item 1", "item 2", ...],
  "eveningRoutine": ["item 1", "item 2", ...],
  "sleepHabits": "Recomendações detalhadas de sono (2-3 parágrafos)",
  "energyManagement": "Estratégias de gestão de energia ao longo do dia (2-3 parágrafos)",
  "dopamineBalance": "Como equilibrar dopamina e evitar esgotamento (2 parágrafos)",
  "nutrition": "Orientações alimentares para mais energia (2-3 parágrafos)",
  "avoidList": ["coisa a evitar 1", "coisa a evitar 2", ...],
  "weeklyPlan": "Plano semanal estruturado",
  "resources": [{"title": "nome", "url": "link youtube ou artigo", "description": "descrição"}],
  "finalNote": "Mensagem final de encorajamento (1-2 parágrafos)"
}
` : `
You are a wellness and energy management specialist. Generate a personalized energy restoration plan based on user data.

CRITICAL RULES:
1. NEVER make medical promises or disease diagnoses
2. NEVER suggest medications or medical treatments
3. Use warm, human, and empathetic language
4. If any data was not provided, explicitly mention that the recommendation is generic due to lack of that information
5. Focus on habits, routines, and lifestyle changes
6. Include real YouTube links for meditation/relaxation when appropriate
7. Be specific and practical in recommendations
8. Text should have enough depth for ~8 PDF pages

Return a valid JSON with this exact structure:
{
  "diagnosis": "Detailed analysis of the identified fatigue pattern (3-4 paragraphs)",
  "morningRoutine": ["item 1", "item 2", ...],
  "afternoonRoutine": ["item 1", "item 2", ...],
  "eveningRoutine": ["item 1", "item 2", ...],
  "sleepHabits": "Detailed sleep recommendations (2-3 paragraphs)",
  "energyManagement": "Energy management strategies throughout the day (2-3 paragraphs)",
  "dopamineBalance": "How to balance dopamine and avoid burnout (2 paragraphs)",
  "nutrition": "Dietary guidelines for more energy (2-3 paragraphs)",
  "avoidList": ["thing to avoid 1", "thing to avoid 2", ...],
  "weeklyPlan": "Structured weekly plan",
  "resources": [{"title": "name", "url": "youtube or article link", "description": "description"}],
  "finalNote": "Final encouragement message (1-2 paragraphs)"
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Dados do usuário:\n${userContext}` }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  const data = await response.json();
  
  if (data.error) {
    console.error('OpenAI error:', data.error);
    throw new Error(data.error.message || 'AI generation failed');
  }

  const content = data.choices[0]?.message?.content;
  
  // Parse JSON da resposta
  try {
    // Limpar possíveis markdown code blocks
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GERAR PDF
// ════════════════════════════════════════════════════════════════════════════════

function generatePDF(answers, content, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Cores
  const colors = {
    primary: [167, 139, 250],    // #a78bfa
    dark: [9, 9, 11],            // #09090b
    text: [250, 250, 250],       // #fafafa
    muted: [161, 161, 170],      // #a1a1aa
    accent: [139, 92, 246]       // #8b5cf6
  };

  // Helper: adicionar nova página se necessário
  const checkNewPage = (neededSpace = 30) => {
    if (y + neededSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Helper: adicionar texto com wrap
  const addWrappedText = (text, x, startY, maxWidth, lineHeight = 6) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line, i) => {
      checkNewPage(lineHeight);
      doc.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };

  // Helper: adicionar seção
  const addSection = (title, content) => {
    checkNewPage(40);
    
    // Título da seção
    doc.setFillColor(...colors.primary);
    doc.rect(margin, y - 4, 3, 10, 'F');
    doc.setTextColor(...colors.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 8, y + 3);
    y += 15;

    // Conteúdo
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (Array.isArray(content)) {
      content.forEach((item, i) => {
        checkNewPage(10);
        doc.text(`• ${item}`, margin + 5, y);
        y += 7;
      });
    } else {
      addWrappedText(content, margin, y, contentWidth, 5);
    }
    
    y += 10;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 1: CAPA
  // ════════════════════════════════════════════════════════════════════════════
  
  // Background gradiente (simulado)
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Logo/Título
  doc.setTextColor(...colors.primary);
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.text('Clarity', pageWidth / 2, 80, { align: 'center' });
  
  doc.setTextColor(...colors.text);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'normal');
  doc.text(t.title, pageWidth / 2, 95, { align: 'center' });
  
  doc.setTextColor(...colors.muted);
  doc.setFontSize(14);
  doc.text(t.subtitle, pageWidth / 2, 110, { align: 'center' });
  
  // Nome do usuário
  doc.setTextColor(...colors.text);
  doc.setFontSize(12);
  doc.text(`${t.preparedFor}:`, pageWidth / 2, 150, { align: 'center' });
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(answers.name || 'Você', pageWidth / 2, 165, { align: 'center' });
  
  // Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colors.muted);
  const today = new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`${t.date}: ${today}`, pageWidth / 2, 185, { align: 'center' });
  
  // Disclaimer no rodapé da capa
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const disclaimerLines = doc.splitTextToSize(t.disclaimer, contentWidth);
  disclaimerLines.forEach((line, i) => {
    doc.text(line, pageWidth / 2, pageHeight - 30 + (i * 4), { align: 'center' });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 2+: CONTEÚDO
  // ════════════════════════════════════════════════════════════════════════════
  
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  y = margin;

  // Resumo do perfil
  addSection(t.sections.summary, [
    `${t.age}: ${answers.age || t.notProvided}`,
    `${t.sleepHours}: ${answers.sleep_hours || t.notProvided}`,
    `${t.sleepQuality}: ${answers.sleep_quality || t.notProvided}`,
    `${t.stressLevel}: ${answers.stress || t.notProvided}/5`,
    `${t.energyLevel}: ${answers.energy_level || t.notProvided}/5`,
    `${t.exercise}: ${answers.exercise || t.notProvided}`,
    `${t.screens}: ${answers.screens || t.notProvided}`
  ]);

  // Diagnóstico
  addSection(t.sections.diagnosis, content.diagnosis);

  // Rotina Matinal
  addSection(t.sections.morningRoutine, content.morningRoutine);

  // Rotina da Tarde
  addSection(t.sections.afternoonRoutine, content.afternoonRoutine);

  // Rotina Noturna
  addSection(t.sections.eveningRoutine, content.eveningRoutine);

  // Hábitos de Sono
  addSection(t.sections.sleepHabits, content.sleepHabits);

  // Gestão de Energia
  addSection(t.sections.energyManagement, content.energyManagement);

  // Equilíbrio de Dopamina
  addSection(t.sections.dopamineBalance, content.dopamineBalance);

  // Nutrição
  addSection(t.sections.nutrition, content.nutrition);

  // O Que Evitar
  addSection(t.sections.avoidList, content.avoidList);

  // Plano Semanal
  addSection(t.sections.weeklyPlan, content.weeklyPlan);

  // Recursos
  if (content.resources && content.resources.length > 0) {
    checkNewPage(40);
    doc.setTextColor(...colors.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t.sections.resources, margin, y);
    y += 12;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    content.resources.forEach(resource => {
      checkNewPage(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`• ${resource.title}`, margin + 5, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 220);
      doc.text(resource.url, margin + 8, y);
      y += 5;
      doc.setTextColor(100, 100, 100);
      const descLines = doc.splitTextToSize(resource.description, contentWidth - 10);
      descLines.forEach(line => {
        doc.text(line, margin + 8, y);
        y += 4;
      });
      y += 5;
    });
    y += 10;
  }

  // Nota Final
  addSection(t.sections.finalNote, content.finalNote);

  // Footer em todas as páginas (exceto capa)
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(t.footer, margin, pageHeight - 10);
    doc.text(`${i - 1}/${totalPages - 1}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Retornar como base64
  return doc.output('datauristring').split(',')[1];
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
    const { answers, lang = 'pt', orderId } = JSON.parse(event.body);

    if (!answers) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing answers data' })
      };
    }

    // Detectar idioma (pt ou en)
    const detectedLang = (lang || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en';

    console.log(`Generating PDF for order ${orderId} in language ${detectedLang}`);

    // Gerar conteúdo com IA
    const content = await generateContentWithAI(answers, detectedLang);

    // Gerar PDF
    const pdfBase64 = generatePDF(answers, content, detectedLang);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId,
        pdf: pdfBase64,
        lang: detectedLang,
        generatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate PDF', 
        details: error.message 
      })
    };
  }
};
