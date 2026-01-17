import { GoogleGenAI, Type } from '@google/genai'
import { type NetworkResult, type AIInsight } from '@/types'

export const getNetworkInsights = async (result: NetworkResult): Promise<AIInsight> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY })

  const prompt = `
    Analyze these network diagnostic results:
    Download Speed: ${result.download.toFixed(2)} Mbps
    Upload Speed: ${result.upload.toFixed(2)} Mbps
    Latency (Ping): ${result.latency.toFixed(1)} ms
    Jitter: ${result.jitter.toFixed(1)} ms

    Provide a professional assessment of network health for the following activities:
    1. High-definition Video Streaming (4K/8K)
    2. Competitive Online Gaming
    3. Remote Video Conferencing (Zoom/Teams)
    4. Large File Transfers

    Return the analysis in a structured JSON format.
  `

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              description: 'Overall status: excellent, good, fair, or poor',
            },
            summary: {
              type: Type.STRING,
              description: 'A short 2-3 sentence summary of the network performance',
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of 3 specific recommendations for improvement or usage',
            },
          },
          required: ['status', 'summary', 'recommendations'],
        },
      },
    })

    return JSON.parse(response.text || '{}') as AIInsight
  } catch (error) {
    console.error('Gemini Insight Error:', error)
    return {
      status: 'fair',
      summary:
        "We couldn't generate a detailed AI report at this time, but your connection seems functional.",
      recommendations: ['Ensure you are close to your router', 'Check for background downloads'],
    }
  }
}
