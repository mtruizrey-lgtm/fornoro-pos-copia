import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found for Gemini.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateDailyInsight = async (
  salesData: any,
  inventoryData: any
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Configura tu API Key para obtener insights.";

  const prompt = `
    Actúa como un gerente de restaurante experto. Analiza los siguientes datos resumidos:
    
    Ventas de hoy: ${JSON.stringify(salesData)}
    Items con bajo inventario: ${JSON.stringify(inventoryData)}
    
    Dame un reporte breve de 1 párrafo con:
    1. Una felicitación o alerta sobre las ventas.
    2. Una recomendación de acción operativa (ej. promocionar plato X para usar stock, o comprar insumo Y urgente).
    3. Una sugerencia de "Especial del día" para mañana basado en lo que se vende bien o lo que sobra.
    
    Usa emojis y tono profesional pero motivador.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No se pudo generar el insight.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error conectando con el asistente IA.";
  }
};