import { NextResponse } from 'next/server'

const HF_ORIGIN = 'https://depth-anything-depth-anything-3.hf.space'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      target_dir: string
      show_cam?: boolean
      filter_black_bg?: boolean
      filter_white_bg?: boolean
      process_res_method?: 'high_res' | 'low_res'
      save_percentage?: number
      num_max_points?: number
      infer_gs?: boolean
      gs_trj_mode?: 'smooth' | 'extend'
      gs_video_quality?: 'low' | 'medium' | 'high'
    }

    if (!body.target_dir) {
      return NextResponse.json({ error: 'target_dir is required' }, { status: 400 })
    }

    const runRes = await fetch(`${HF_ORIGIN}/gradio_api/run/gradio_demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_dir: body.target_dir,
        show_cam: body.show_cam ?? true,
        filter_black_bg: body.filter_black_bg ?? false,
        filter_white_bg: body.filter_white_bg ?? false,
        process_res_method: body.process_res_method ?? 'low_res',
        save_percentage: body.save_percentage ?? 10,
        num_max_points: body.num_max_points ?? 1000,
        infer_gs: body.infer_gs ?? false,
        gs_trj_mode: body.gs_trj_mode ?? 'smooth',
        gs_video_quality: body.gs_video_quality ?? 'low',
      }),
    })

    if (!runRes.ok) {
      const text = await runRes.text()
      throw new Error(`gradio_demo failed: ${runRes.status} ${text}`)
    }

    const runJson = (await runRes.json()) as {
      output?: any
      output_1?: any
      output_2?: any
      output_3?: any
      output_4?: any
      output_5?: any
      output_6?: any
      output_7?: any
      output_8?: any
    }

    return NextResponse.json({
      model3d: runJson.output,
      log: runJson.output_1,
      rgbImage: runJson.output_2,
      depthImage: runJson.output_3,
      message: runJson.output_4,
      view: runJson.output_5,
      video1: runJson.output_6,
      video2: runJson.output_7,
      message2: runJson.output_8,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Reconstruct failed' }, { status: 500 })
  }
}
