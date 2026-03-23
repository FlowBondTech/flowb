import { NextResponse } from 'next/server'

const HF_ORIGIN = 'https://depth-anything-depth-anything-3.hf.space'

export async function POST(req: Request) {
  let stage: 'parse_form' | 'upload_files' | 'run_handle_uploads' | 'parse_handle_uploads' =
    'parse_form'
  try {
    stage = 'parse_form'
    const form = await req.formData()

    const images = form.getAll('images').filter(v => v instanceof File) as File[]
    const video = (form.get('video') instanceof File ? form.get('video') : null) as File | null
    const samplingFpsRaw = form.get('samplingFps')

    const samplingFps = samplingFpsRaw ? Number(samplingFpsRaw) : 10

    if (images.length === 0 && !video) {
      return NextResponse.json({ error: 'No images or video provided' }, { status: 400 })
    }

    const uploadOne = async (file: File) => {
      const tryUpload = async (fieldName: 'files' | 'file') => {
        const up = new FormData()
        up.append(fieldName, file)

        const res = await fetch(`${HF_ORIGIN}/gradio_api/upload`, {
          method: 'POST',
          body: up,
        })

        if (!res.ok) {
          const text = await res.text()
          return {
            ok: false as const,
            status: res.status,
            text,
          }
        }

        const json = (await res.json()) as any
        return {
          ok: true as const,
          json,
        }
      }

      const attempt1 = await tryUpload('files')
      const attempt2 = attempt1.ok ? attempt1 : await tryUpload('file')

      if (!attempt2.ok) {
        throw new Error(`Upload failed: ${attempt2.status} ${attempt2.text}`)
      }

      const raw = attempt2.json

      if (typeof raw === 'string') {
        return {
          path: raw,
          url: null,
          orig_name: file.name,
          mime_type: file.type || null,
        }
      }

      if (Array.isArray(raw) && typeof raw[0] === 'string') {
        return {
          path: raw[0],
          url: null,
          orig_name: file.name,
          mime_type: file.type || null,
        }
      }

      const json = Array.isArray(raw) ? raw[0] : raw

      if (!json?.path || typeof json.path !== 'string') {
        throw new Error(`Upload returned unexpected payload: ${JSON.stringify(raw)}`)
      }

      return json as {
        path: string
        url?: string | null
        orig_name?: string | null
        mime_type?: string | null
      }
    }

    stage = 'upload_files'
    const uploadedImages = await Promise.all(images.map(uploadOne))
    const uploadedVideo = video ? await uploadOne(video) : null

    const inputImages = uploadedImages.map(f => ({
      path: f.path,
      url: f.url ?? null,
      orig_name: f.orig_name ?? null,
      mime_type: (f as any).mime_type ?? null,
      meta: { _type: 'gradio.FileData' },
    }))

    const inputVideo = uploadedVideo
      ? {
          video: {
            path: uploadedVideo.path,
            url: uploadedVideo.url ?? null,
            orig_name: uploadedVideo.orig_name ?? null,
            mime_type: (uploadedVideo as any).mime_type ?? null,
            meta: { _type: 'gradio.FileData' },
          },
        }
      : undefined

    const payload: Record<string, unknown> = {
      input_images: inputImages,
      s_time_interval: samplingFps,
    }

    if (inputVideo) {
      payload.input_video = inputVideo
    }

    stage = 'run_handle_uploads'
    const runRes = await fetch(`${HF_ORIGIN}/gradio_api/run/handle_uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!runRes.ok) {
      const text = await runRes.text()
      throw new Error(`handle_uploads failed: ${runRes.status} ${text}`)
    }

    stage = 'parse_handle_uploads'
    const runJson = (await runRes.json()) as {
      output?: any
      output_1?: any
      output_2?: any
      output_3?: any
    }

    return NextResponse.json({
      model3d: runJson.output,
      targetDir: runJson.output_1,
      preview: runJson.output_2,
      log: runJson.output_3,
    })
  } catch (err: any) {
    console.error('Depth-Anything upload route failed:', { stage, err })
    return NextResponse.json(
      {
        error: err?.message || 'Upload failed',
        stage,
      },
      { status: 500 },
    )
  }
}
