import { Resend } from 'resend'
import type { Database } from './supabase/types'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email notifications will not work.')
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function notifyAdmin(
  orderId: string,
  reason: string,
  supabaseClient: any
): Promise<void> {
  if (!resend || !process.env.ADMIN_EMAIL) {
    console.log('Email notification skipped:', { orderId, reason })
    return
  }

  try {
    // Get order details
    const { data: order, error } = await supabaseClient
      .from('orders')
      .select('*, calls(*)')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      console.error('Error fetching order for email notification:', error)
      return
    }

    const calls = Array.isArray(order.calls) ? order.calls : order.calls ? [order.calls] : []
    const latestCall = calls[0]

    await resend.emails.send({
      from: 'VoiceVerify <notifications@voiceverify.com>',
      to: process.env.ADMIN_EMAIL,
      subject: `Action Required: Order ${orderId.substring(0, 8)}`,
      html: `
        <h2>Call Failed - Manual Action Required</h2>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Phone:</strong> ${order.customer_phone}</p>
        <p><strong>Amount:</strong> $${order.total_amount}</p>
        <p><strong>Retry Count:</strong> ${latestCall?.retry_count || 0}</p>
        <hr>
        <p>Please review this order in the admin dashboard and contact the customer manually.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders/${orderId}">View Order</a>
      `,
    })
  } catch (error) {
    console.error('Error sending email notification:', error)
  }
}

