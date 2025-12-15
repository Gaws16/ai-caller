import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_API_KEY not found in environment' },
        { status: 500 }
      )
    }

    // Initialize Gemini - using gemini-2.0-flash which is the current model
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Simple test prompt
    const prompt = `You are classifying customer intent. The customer said: "yes that's correct"

Respond with JSON only:
{
  "intent": "CONFIRM" | "DENY" | "CANCEL" | "UNCLEAR",
  "data": {}
}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Try to parse as JSON
    let parsed = null
    try {
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = { parseError: 'Could not parse as JSON', rawText: text }
    }

    return NextResponse.json({
      success: true,
      message: 'Gemini API is working!',
      rawResponse: text,
      parsedResponse: parsed,
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    })
  } catch (error: unknown) {
    console.error('Gemini test error:', error)
    return NextResponse.json(
      {
        error: 'Gemini API call failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
