import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Save to Supabase
    const { data, error: dbError } = await supabase
      .from('waitlist')
      .insert([{ email, name, created_at: new Date().toISOString() }])
      .select()

    if (dbError) {
      // Check if it's a duplicate email error
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already on the waitlist' },
          { status: 409 }
        )
      }
      console.error('Supabase error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save to waitlist' },
        { status: 500 }
      )
    }

    // Send confirmation email via Resend
    try {
      await resend.emails.send({
        from: 'Slait <onboarding@resend.dev>',
        to: email,
        subject: "You're on the Slait waitlist!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22d3ee;">Welcome to Slait!</h1>
            <p>Hi${name ? ` ${name}` : ''},</p>
            <p>Thanks for joining our waitlist! We're excited to have you on board.</p>
            <p>Slait is building the future of technical hiring - an AI-powered platform that helps companies evaluate take-home assignments faster and more accurately.</p>
            <p>We'll keep you updated on our progress and let you know as soon as we're ready to launch.</p>
            <br/>
            <p>Best,<br/>The Slait Team</p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Email error:', emailError)
      // Don't fail the request if email fails - user is still on waitlist
    }

    return NextResponse.json(
      { message: 'Successfully joined the waitlist', data },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
