'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestCallPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null)

  const handleTestCall = async (endpoint = '/api/test-call') => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number')
      return
    }

    setIsLoading(true)
    setLastResult(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber }),
      })

      const result = await response.json()
      setLastResult(result)

      if (response.ok) {
        alert(`Test call initiated! Call ID: ${result.call_sid}`)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to initiate test call:', error)
      alert('Failed to initiate test call')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Twilio Test Call</CardTitle>
            <CardDescription>
              Test the Twilio voice integration by making a simple call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter phone number with country code (e.g., +1234567890)
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleTestCall('/api/test-call')}
                disabled={isLoading || !phoneNumber.trim()}
                className="w-full"
                variant="default"
              >
                {isLoading ? 'Initiating Call...' : 'Make Test Call (with webhooks)'}
              </Button>

              <Button
                onClick={() => handleTestCall('/api/test-call-simple')}
                disabled={isLoading || !phoneNumber.trim()}
                className="w-full"
                variant="outline"
              >
                {isLoading ? 'Initiating Call...' : 'Make Simple Test Call (no webhooks)'}
              </Button>
            </div>

            {lastResult && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold mb-2">Last Call Result:</h3>
                <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              </div>
            )}

            <div className="text-xs text-gray-600 space-y-3">
              <div>
                <p><strong>Required Environment Variables:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>TWILIO_ACCOUNT_SID</li>
                  <li>TWILIO_AUTH_TOKEN</li>
                  <li>TWILIO_PHONE_NUMBER</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-3 rounded border">
                <p><strong>⚠️ Webhook Note:</strong></p>
                <p>The webhook test requires ngrok for local development:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                  <li>Install: <code className="bg-gray-200 px-1 rounded">brew install ngrok</code></li>
                  <li>Run: <code className="bg-gray-200 px-1 rounded">ngrok http 3000</code></li>
                  <li>Add to .env.local: <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_APP_URL=https://xxx.ngrok.io</code></li>
                </ol>
                <p className="mt-2">Use the <strong>simple test</strong> to verify Twilio without webhooks!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}