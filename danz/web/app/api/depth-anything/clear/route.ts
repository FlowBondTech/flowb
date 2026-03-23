import { NextResponse } from 'next/server'

const HF_ORIGIN = 'https://depth-anything-depth-anything-3.hf.space'

export async function POST() {
  try {
    const runRes = await fetch(`${HF_ORIGIN}/gradio_api/run/clear_fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (!runRes.ok) {
      const text = await runRes.text()
      throw new Error(`clear_fields failed: ${runRes.status} ${text}`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Clear failed' }, { status: 500 })
  }
}
