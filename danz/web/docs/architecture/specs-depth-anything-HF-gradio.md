# Depth-Anything3 (Hugging Face Gradio) API Spec

## Goal

This document defines how to call the Depth-Anything3 Hugging Face Space via:

- **Python (`gradio_client`)**
- **HTTP (Gradio 5.x “gradio_api”)** from a backend / proxy route

The integration is stateful:

- Upload files (video/images)
- Call the “prepare” function (`handle_uploads`) to generate a `target_dir`
- Call the “reconstruct” function (`gradio_demo`) using `target_dir`
- Clear state (`clear_fields`) when starting over

## Base URLs

- **Hugging Face Space page**
  - https://huggingface.co/spaces/depth-anything/depth-anything-3
- **Space runtime origin (used for HTTP API calls)**
  - `https://depth-anything-depth-anything-3.hf.space`

## HTTP API (Gradio 5.x)

The Space exposes an OpenAPI spec at:

- `GET /gradio_api/openapi.json`

For this Space, the callable endpoints we use are:

- `POST /gradio_api/upload`
- `POST /gradio_api/run/handle_uploads`
- `POST /gradio_api/run/gradio_demo`
- `POST /gradio_api/run/clear_fields`

### 0) Uploading files (`POST /gradio_api/upload`)

This endpoint accepts `multipart/form-data`.

**Important:** Different Gradio deployments accept different field names.

- Try `files` first
- If it fails, try `file`

The response shape also varies. Common variants:

- **Array of strings** (observed in this Space):

  ```json
  ["/tmp/gradio/<id>/my_video.mp4"]
  ```

- **Object**:

  ```json
  {"path":"/tmp/gradio/<id>/my_image.jpg","url":null,"orig_name":"my_image.jpg"}
  ```

- **Array of objects**:

  ```json
  [{"path":"/tmp/gradio/<id>/my_image.jpg","url":null,"orig_name":"my_image.jpg"}]
  ```

For subsequent calls to `/gradio_api/run/*`, you must pass **FileData objects**. Minimal FileData object:

```json
{
  "path": "/tmp/gradio/<id>/file.jpg",
  "url": null,
  "orig_name": "file.jpg",
  "meta": { "_type": "gradio.FileData" }
}
```

### 1) Prepare upload session (`POST /gradio_api/run/handle_uploads`)

This corresponds to `api_name="/handle_uploads"` in `gradio_client`.

**Request body:** JSON object (named parameters, *not* `data: []` for this Space)

```json
{
  "input_video": {"video": {"path": "/tmp/gradio/.../video.mp4", "meta": {"_type": "gradio.FileData"}}},
  "input_images": [
    {"path": "/tmp/gradio/.../img1.jpg", "meta": {"_type": "gradio.FileData"}},
    {"path": "/tmp/gradio/.../img2.jpg", "meta": {"_type": "gradio.FileData"}}
  ],
  "s_time_interval": 10
}
```

If you do not have a video, **omit** `input_video` (do not send it as `null`).

**Response body:** Gradio-style outputs as top-level keys:

- `output`: Model3d (FileData)
- `output_1`: `target_dir` (string)
- `output_2`: Preview gallery (array)
- `output_3`: Log markdown (string)

### 2) Reconstruct (`POST /gradio_api/run/gradio_demo`)

This corresponds to `api_name="/gradio_demo"` in `gradio_client`.

**Request body:**

```json
{
  "target_dir": "<target_dir from handle_uploads>",
  "show_cam": true,
  "filter_black_bg": false,
  "filter_white_bg": false,
  "process_res_method": "low_res",
  "save_percentage": 10,
  "num_max_points": 1000,
  "infer_gs": false,
  "gs_trj_mode": "smooth",
  "gs_video_quality": "low"
}
```

**Response body:**

- `output`: Model3d (FileData)
- `output_1`: log markdown (string)
- `output_2`: RGB image (ImageData)
- `output_3`: Depth visualization (ImageData)
- `output_4`: markdown message (string)
- `output_5`: view selector (string)
- `output_6`: video output (VideoData)
- `output_7`: video output (VideoData)
- `output_8`: markdown message (string)

### 3) Clear (`POST /gradio_api/run/clear_fields`)

Resets Space state.

**Request body:** `{}`

## Canonical Integration Flow (Recommended)
 
### 1) Upload images/video
 
Use one of:
 
- **Primary**: `api_name="/handle_uploads"`
- **Alternate**: `api_name="/handle_uploads_1"` (same purpose; use if primary changes)
 
Inputs:
 
- `input_video`: `{ "video": <file> }` (optional depending on UI usage)
- `input_images`: `[<file>, ...]`
- `s_time_interval`: sampling FPS
 
Outputs (important):
 
- **`target_dir`** (string): server-side working directory used by downstream endpoints
- **`image_gallery` / Preview**: gallery metadata
 
### 2) Run reconstruction / inference
 
Use:
 
- `api_name="/gradio_demo"`
 
Inputs (important):
 
- `target_dir`: the string returned from upload step
- processing toggles: `show_cam`, `filter_black_bg`, `filter_white_bg`, `process_res_method`, etc.
 
Outputs (important):
 
- `Model3d` filepath (GLB)
- RGB image + depth visualization images
- status markdown/log strings
- (optional) 3DGS video outputs if enabled
 
### 3) Update visualization (optional)
 
Use one of:
 
- `api_name="/update_visualization"`
- `api_name="/update_visualization_1"`
- `api_name="/update_visualization_2"`
 
This is useful if you want to re-render the 3D viewer output after changing parameters without re-uploading.
 
### 4) Reset state
 
Use:
 
- `api_name="/clear_fields"`
 
This clears the 3D viewer, stored `target_dir`, and empties the gallery.
 
## Minimal Example (Python)
 
```python
from gradio_client import Client, handle_file
 
client = Client("depth-anything/depth-anything-3")
 
# 1) Upload
model3d, target_dir, preview, log = client.predict(
    input_video={"video": handle_file("/path/to/video.mp4")},
    input_images=[handle_file("/path/to/image1.jpg"), handle_file("/path/to/image2.jpg")],
    s_time_interval=10,
    api_name="/handle_uploads",
)
 
# 2) Run reconstruction
model3d, log, rgb, depth, msg, view, video1, video2, msg2 = client.predict(
    target_dir=target_dir,
    show_cam=True,
    filter_black_bg=False,
    filter_white_bg=False,
    process_res_method="low_res",
    save_percentage=10,
    num_max_points=1000,
    infer_gs=False,
    gs_trj_mode="smooth",
    gs_video_quality="low",
    api_name="/gradio_demo",
)
```
 
## Operational Notes
 
- The workflow is **stateful** on the Space side (many calls depend on the previously returned `target_dir`).
- Some endpoints have non-100% success rates (per HF stats in the appendix). Implement retries/backoff for long-running steps.
- Treat returned `filepath`/`url` objects as **opaque**; the format can vary (dict with `path`, `url`, `meta`, etc.).

## Hugging Face UI -> API Mapping

This is how the visible controls on https://huggingface.co/spaces/depth-anything/depth-anything-3 map to the underlying Gradio API endpoints.

- **Upload Video** + **Upload Images** + **Sampling FPS** -> `api_name="/handle_uploads"` (or `"/handle_uploads_1"`)
- **Select First Frame** -> `api_name="/select_first_frame"`
- **Reconstruct** -> `api_name="/gradio_demo"`
- **Clear** -> `api_name="/clear_fields"`
- **Visualization Options (Show Camera / Filter BG / etc.)** -> passed as params to `api_name="/gradio_demo"` and/or used with `api_name="/update_visualization"` (and variants)
 
## Appendix A: Hugging Face Auto-Generated Gradio API Surface
 
The content below is the raw endpoint spec dump from Hugging Face/Gradio.
 
Choose one of the following ways to interact with the API.
Python
JavaScript
cURL
MCP
1. Install the Python client (docs) if you don't already have it installed.
copy
$ pip install gradio_client
2. Find the API endpoint below corresponding to your desired function in the app. Copy the code snippet, replacing the placeholder values with your own input data. If this is a private Space, you may need to pass your Hugging Face token as well (read more). Or use the  
API Recorder
 to automatically generate your API requests.
API name: /lambda Total requests: 57 (100% successful)  |  p50/p90/p99: 6 ms / 9 ms / 12 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	checked=False,
	api_name="/lambda"
)
print(result)
Accepts 1 parameter:

checked bool Default: False
The input value that is provided in the "Infer 3D Gaussian Splatting" Checkbox component.
Returns tuple of 4 elements

[0] Literal['smooth', 'extend']
The output value that appears in the "Rendering trajectory for 3DGS viewpoints (requires n_views ≥ 2)" Dropdown component.
[1] Literal['low', 'medium', 'high']
The output value that appears in the "Video quality for 3DGS rendered outputs" Dropdown component.
[2] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[3] str
The output value that appears in the "value_71" Markdown component.
API name: /clear_fields Clears the 3D viewer, the stored target_dir, and empties the gallery. Total requests: 182 (100% successful)  |  p50/p90/p99: 1 ms / 2 ms / 5 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/clear_fields"
)
print(result)
Accepts 0 parameters:

Returns 1 element

filepath
The output value that appears in the "value_56" Model3d component.
API name: /update_log Display a quick log message while waiting. Total requests: 179 (100% successful)  |  p50/p90/p99: 1 ms / 2 ms / 79 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/update_log"
)
print(result)
Accepts 0 parameters:

Returns 1 element

str
The output value that appears in the "value_53" Markdown component.
API name: /gradio_demo Perform reconstruction using the already-created target_dir/images. Total requests: 167 (63% successful)  |  p50/p90/p99: 0 ms / 0 ms / 0 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	target_dir="None",
	show_cam=True,
	filter_black_bg=False,
	filter_white_bg=False,
	process_res_method="low_res",
	save_percentage=10,
	num_max_points=1000,
	infer_gs=False,
	gs_trj_mode="smooth",
	gs_video_quality="low",
	api_name="/gradio_demo"
)
print(result)
Accepts 10 parameters:

target_dir str Default: "None"
The input value that is provided in the "Target Dir" Textbox component.
show_cam bool Default: True
The input value that is provided in the "Show Camera" Checkbox component.
filter_black_bg bool Default: False
The input value that is provided in the "Filter Black Background" Checkbox component.
filter_white_bg bool Default: False
The input value that is provided in the "Filter White Background" Checkbox component.
process_res_method Literal['high_res', 'low_res'] Default: "low_res"
The input value that is provided in the "Image Processing Method" Dropdown component.
save_percentage float Default: 10
The input value that is provided in the "Filter Percentage" Slider component.
num_max_points float Default: 1000
The input value that is provided in the "Max Points (K points)" Slider component.
infer_gs bool Default: False
The input value that is provided in the "Infer 3D Gaussian Splatting" Checkbox component.
gs_trj_mode Literal['smooth', 'extend'] Default: "smooth"
The input value that is provided in the "Rendering trajectory for 3DGS viewpoints (requires n_views ≥ 2)" Dropdown component.
gs_video_quality Literal['low', 'medium', 'high'] Default: "low"
The input value that is provided in the "Video quality for 3DGS rendered outputs" Dropdown component.
Returns tuple of 9 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "value_53" Markdown component.
[2] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[3] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
[4] str
The output value that appears in the "value_68" Markdown component.
[5] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[8] str
The output value that appears in the "value_71" Markdown component.
API name: /lambda_1 Total requests: 167 (100% successful)  |  p50/p90/p99: 1 ms / 2 ms / 5 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_1"
)
print(result)
Accepts 0 parameters:

Returns 1 element

str
The output value that appears in the "is_example" Textbox component.
API name: /update_visualization Reload saved predictions from npz, create (or reuse) the GLB for new parameters, and return it for the 3D viewer. Total requests: 5 (100% successful)  |  p50/p90/p99: 4 ms / 8 ms / 10 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	target_dir="None",
	show_cam=True,
	is_example="None",
	filter_black_bg=False,
	filter_white_bg=False,
	process_res_method="low_res",
	api_name="/update_visualization"
)
print(result)
Accepts 6 parameters:

target_dir str Default: "None"
The input value that is provided in the "Target Dir" Textbox component.
show_cam bool Default: True
The input value that is provided in the "Show Camera" Checkbox component.
is_example str Default: "None"
The input value that is provided in the "is_example" Textbox component.
filter_black_bg bool Default: False
The input value that is provided in the "Filter Black Background" Checkbox component.
filter_white_bg bool Default: False
The input value that is provided in the "Filter White Background" Checkbox component.
process_res_method Literal['high_res', 'low_res'] Default: "low_res"
The input value that is provided in the "Image Processing Method" Dropdown component.
Returns tuple of 2 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "value_53" Markdown component.
API name: /update_visualization_1 Reload saved predictions from npz, create (or reuse) the GLB for new parameters, and return it for the 3D viewer. Total requests: 5 (100% successful)  |  p50/p90/p99: 4 ms / 4 ms / 4 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	target_dir="None",
	show_cam=True,
	is_example="None",
	filter_black_bg=False,
	filter_white_bg=False,
	process_res_method="low_res",
	api_name="/update_visualization_1"
)
print(result)
Accepts 6 parameters:

target_dir str Default: "None"
The input value that is provided in the "Target Dir" Textbox component.
show_cam bool Default: True
The input value that is provided in the "Show Camera" Checkbox component.
is_example str Default: "None"
The input value that is provided in the "is_example" Textbox component.
filter_black_bg bool Default: False
The input value that is provided in the "Filter Black Background" Checkbox component.
filter_white_bg bool Default: False
The input value that is provided in the "Filter White Background" Checkbox component.
process_res_method Literal['high_res', 'low_res'] Default: "low_res"
The input value that is provided in the "Image Processing Method" Dropdown component.
Returns tuple of 2 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "value_53" Markdown component.
API name: /update_visualization_2 Reload saved predictions from npz, create (or reuse) the GLB for new parameters, and return it for the 3D viewer. Total requests: 6 (100% successful)  |  p50/p90/p99: 4 ms / 6 ms / 8 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	target_dir="None",
	show_cam=True,
	is_example="None",
	filter_black_bg=False,
	filter_white_bg=False,
	process_res_method="low_res",
	api_name="/update_visualization_2"
)
print(result)
Accepts 6 parameters:

target_dir str Default: "None"
The input value that is provided in the "Target Dir" Textbox component.
show_cam bool Default: True
The input value that is provided in the "Show Camera" Checkbox component.
is_example str Default: "None"
The input value that is provided in the "is_example" Textbox component.
filter_black_bg bool Default: False
The input value that is provided in the "Filter Black Background" Checkbox component.
filter_white_bg bool Default: False
The input value that is provided in the "Filter White Background" Checkbox component.
process_res_method Literal['high_res', 'low_res'] Default: "low_res"
The input value that is provided in the "Image Processing Method" Dropdown component.
Returns tuple of 2 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "value_53" Markdown component.
API name: /handle_uploads Handle file uploads and update gallery. Total requests: 35 (100% successful)  |  p50/p90/p99: 566 ms / 11.07 s / 90.81 s
copy
from gradio_client import Client, handle_file

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	input_video={"video":handle_file('https://github.com/gradio-app/gradio/raw/main/gradio/media_assets/videos/world.mp4')},
	input_images=[handle_file('https://github.com/gradio-app/gradio/raw/main/test/test_files/sample_file.pdf')],
	s_time_interval=10,
	api_name="/handle_uploads"
)
print(result)
Accepts 3 parameters:

input_video dict(video: filepath, subtitles: filepath | None) Required
The input value that is provided in the "Upload Video" Video component. null
input_images list[filepath] Required
The input value that is provided in the "Upload Images" File component. null
s_time_interval float Default: 10
The input value that is provided in the "Sampling FPS (Frames Per Second)" Slider component.
Returns tuple of 4 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
API name: /handle_uploads_1 Handle file uploads and update gallery. Total requests: 120 (100% successful)  |  p50/p90/p99: 13 ms / 339 ms / 7.31 s
copy
from gradio_client import Client, handle_file

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	input_video={"video":handle_file('https://github.com/gradio-app/gradio/raw/main/gradio/media_assets/videos/world.mp4')},
	input_images=[handle_file('https://github.com/gradio-app/gradio/raw/main/test/test_files/sample_file.pdf')],
	s_time_interval=10,
	api_name="/handle_uploads_1"
)
print(result)
Accepts 3 parameters:

input_video dict(video: filepath, subtitles: filepath | None) Required
The input value that is provided in the "Upload Video" Video component. null
input_images list[filepath] Required
The input value that is provided in the "Upload Images" File component. null
s_time_interval float Default: 10
The input value that is provided in the "Sampling FPS (Frames Per Second)" Slider component.
Returns tuple of 4 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
API name: /handle_image_selection Total requests: 309 (100% successful)  |  p50/p90/p99: 2 ms / 8 ms / 34 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/handle_image_selection"
)
print(result)
Accepts 0 parameters:

Returns 1 element

str
The output value that appears in the "value_53" Markdown component.
API name: /select_first_frame Select the first frame from the image gallery. Total requests: 52 (100% successful)  |  p50/p90/p99: 20 ms / 274 ms / 1.66 s
copy
from gradio_client import Client, handle_file

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	image_gallery=[],
	api_name="/select_first_frame"
)
print(result)
Accepts 1 parameter:

image_gallery list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)] Default: []
The input value that is provided in the "Preview" Gallery component. null
Returns tuple of 2 elements

[0] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[1] str
The output value that appears in the "value_53" Markdown component.
API name: /lambda_2 Total requests: 22 (100% successful)  |  p50/p90/p99: 50 ms / 112 ms / 117 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	current_selector="View 1",
	api_name="/lambda_2"
)
print(result)
Accepts 1 parameter:

current_selector Literal['View 1'] Default: "View 1"
The input value that is provided in the "Select View" Dropdown component.
Returns tuple of 3 elements

[0] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[1] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[2] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_3 Total requests: 83 (100% successful)  |  p50/p90/p99: 65 ms / 109 ms / 137 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	current_selector="View 1",
	api_name="/lambda_3"
)
print(result)
Accepts 1 parameter:

current_selector Literal['View 1'] Default: "View 1"
The input value that is provided in the "Select View" Dropdown component.
Returns tuple of 3 elements

[0] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[1] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[2] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_4 Total requests: 218 (100% successful)  |  p50/p90/p99: 88 ms / 177 ms / 238 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	selector_value="View 1",
	api_name="/lambda_4"
)
print(result)
Accepts 1 parameter:

selector_value Literal['View 1'] Default: "View 1"
The input value that is provided in the "Select View" Dropdown component.
Returns tuple of 2 elements

[0] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[1] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /measure Handle measurement on images. Total requests: 86 (99% successful)  |  p50/p90/p99: 0 ms / 0 ms / 0 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	current_view_selector="View 1",
	api_name="/measure"
)
print(result)
Accepts 1 parameter:

current_view_selector Literal['View 1'] Default: "View 1"
The input value that is provided in the "Select View" Dropdown component.
Returns tuple of 3 elements

[0] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[1] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
[2] str
The output value that appears in the "value_68" Markdown component.
API name: /lambda_5 Total requests: 13 (100% successful)  |  p50/p90/p99: 353 ms / 437 ms / 1.44 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_5"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_6 Total requests: 12 (100% successful)  |  p50/p90/p99: 333 ms / 700 ms / 1.22 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_6"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_7 Total requests: 4 (100% successful)  |  p50/p90/p99: 357 ms / 1.25 s / 1.59 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_7"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_8 Total requests: 6 (100% successful)  |  p50/p90/p99: 315 ms / 869 ms / 1.33 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_8"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_9 Total requests: 1 (100% successful)  |  p50/p90/p99: 1.71 s / 1.71 s / 1.71 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_9"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_10 Total requests: 1 (100% successful)  |  p50/p90/p99: 1.89 s / 1.89 s / 1.89 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_10"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_11
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_11"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_12 Total requests: 1 (100% successful)  |  p50/p90/p99: 1.87 s / 1.87 s / 1.87 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_12"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_13 Total requests: 7 (100% successful)  |  p50/p90/p99: 69 ms / 109 ms / 120 ms
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_13"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_14 Total requests: 3 (100% successful)  |  p50/p90/p99: 386 ms / 1.31 s / 1.52 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_14"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_15
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_15"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.
API name: /lambda_16 Total requests: 5 (100% successful)  |  p50/p90/p99: 242 ms / 765 ms / 1.05 s
copy
from gradio_client import Client

client = Client("depth-anything/depth-anything-3")
result = client.predict(
	api_name="/lambda_16"
)
print(result)
Accepts 0 parameters:

Returns tuple of 11 elements

[0] filepath
The output value that appears in the "value_56" Model3d component.
[1] str
The output value that appears in the "Target Dir" Textbox component.
[2] list[dict(image: dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any)), caption: str | None) | dict(video: filepath, caption: str | None)]
The output value that appears in the "Preview" Gallery component.
[3] str
The output value that appears in the "value_53" Markdown component.
[4] Literal['View 1']
The output value that appears in the "Select View" Dropdown component.
[5] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[6] dict(video: filepath, subtitles: filepath | None)
The output value that appears in the "3DGS Rendered NVS Video (depth shown for reference only)" Video component.
[7] str
The output value that appears in the "value_71" Markdown component.
[8] str
The output value that appears in the "is_example" Textbox component.
[9] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "RGB Image" Image component.
[10] dict(path: str | None (Path to a local file), url: str | None (Publicly available url or base64 encoded image), size: int | None (Size of image in bytes), orig_name: str | None (Original filename), mime_type: str | None (mime type of image), is_stream: bool (Can always be set to False), meta: dict(str, Any))
The output value that appears in the "Depth Visualization (Right Half)" Image component.