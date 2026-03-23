import axios from 'axios'

export const DEPTH_ANYTHING_HF_ORIGIN = 'https://depth-anything-depth-anything-3.hf.space'

export type GradioFileData = {
  path: string
  url?: string | null
  size?: number | null
  orig_name?: string | null
  mime_type?: string | null
  is_stream?: boolean
  meta?: {
    _type: 'gradio.FileData'
    [key: string]: unknown
  }
}

export type GradioVideoData = {
  video: GradioFileData
  subtitles?: GradioFileData | null
}

export type GradioGalleryItem =
  | {
      image: GradioFileData
      caption?: string | null
    }
  | {
      video: GradioFileData
      caption?: string | null
    }

export type DepthAnythingPrepareResponse = {
  model3d: GradioFileData
  targetDir: string
  preview: GradioGalleryItem[]
  log: string
}

export type DepthAnythingReconstructOptions = {
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

export type DepthAnythingReconstructResponse = {
  model3d: GradioFileData
  log: string
  rgbImage: GradioFileData
  depthImage: GradioFileData
  message: string
  view: string
  video1: GradioVideoData
  video2: GradioVideoData
  message2: string
}

export const depthAnythingApi = {
  async prepare(params: {
    images: File[]
    video?: File | null
    samplingFps?: number
  }): Promise<DepthAnythingPrepareResponse> {
    const form = new FormData()

    for (const image of params.images) {
      form.append('images', image)
    }

    if (params.video) {
      form.append('video', params.video)
    }

    form.append('samplingFps', String(params.samplingFps ?? 10))

    const { data } = await axios.post('/api/depth-anything/upload', form)
    return data
  },

  async reconstruct(params: {
    targetDir: string
    options?: DepthAnythingReconstructOptions
  }): Promise<DepthAnythingReconstructResponse> {
    const { data } = await axios.post('/api/depth-anything/reconstruct', {
      target_dir: params.targetDir,
      ...(params.options ?? {}),
    })
    return data
  },

  async clear(): Promise<void> {
    await axios.post('/api/depth-anything/clear', {})
  },
}
