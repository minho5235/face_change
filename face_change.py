# ==========================================
# [통합 완성본] V2 영상분석 + 사진합성 + 고정주소 (Safe Fix Ver)
# ==========================================
# 1. 라이브러리 설치
import os
os.system("pip install fastapi uvicorn pyngrok nest_asyncio insightface onnxruntime-gpu opencv-python-headless multipart moviepy")
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok
import nest_asyncio
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import base64
import shutil
import tempfile

# 2. 모델 다운로드
if not os.path.exists("inswapper_128.onnx"):
    os.system("wget https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx -O inswapper_128.onnx")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("⏳ AI 모델 로딩 중...")
face_analyzer = FaceAnalysis(name='buffalo_l')
face_analyzer.prepare(ctx_id=0, det_size=(640, 640))
swapper = insightface.model_zoo.get_model('./inswapper_128.onnx', download=False, download_zip=False)
print("✅ 준비 완료!")

def img_to_base64(img):
    if img is None or img.size == 0:
        return ""
    _, encoded_img = cv2.imencode(".jpg", img)
    return base64.b64encode(encoded_img).decode("utf-8")

def compute_sim(feat1, feat2):
    return np.dot(feat1, feat2) / (np.linalg.norm(feat1) * np.linalg.norm(feat2))

detected_faces_db = {}

@app.get("/")
def read_root():
    return {"status": "Photo & Video Server Ready"}

# ==========================================
# [추가된 기능] 사진 합성 (Image Swap)
# ==========================================
@app.post("/swap_image")
async def swap_image(source: UploadFile = File(...), target: UploadFile = File(...)):
    print("📸 사진 합성 요청 도착")

    # 이미지 읽기
    source_bytes = await source.read()
    target_bytes = await target.read()
    source_img = cv2.imdecode(np.frombuffer(source_bytes, np.uint8), cv2.IMREAD_COLOR)
    target_img = cv2.imdecode(np.frombuffer(target_bytes, np.uint8), cv2.IMREAD_COLOR)

    # 얼굴 분석
    source_faces = face_analyzer.get(source_img)
    target_faces = face_analyzer.get(target_img)

    if not source_faces or not target_faces:
        return {"error": "얼굴을 찾을 수 없습니다."}

    # 가장 큰 얼굴 기준
    source_face = sorted(source_faces, key=lambda x: x.bbox[2]*x.bbox[3])[-1]
    target_face = sorted(target_faces, key=lambda x: x.bbox[2]*x.bbox[3])[-1]

    # 합성
    res = swapper.get(target_img, target_face, source_face, paste_back=True)

    return {"image": f"data:image/jpeg;base64,{img_to_base64(res)}"}


# ==========================================
# [기존 기능] 영상 분석 (V2 로직 유지 + 안전장치 추가)
# ==========================================
@app.post("/analyze")
async def analyze_video(video: UploadFile = File(...)):
    print("🎬 영상 분석 시작 (V2 필터링 적용)...")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        shutil.copyfileobj(video.file, temp_video)
        video_path = temp_video.name

    cap = cv2.VideoCapture(video_path)
    unique_faces = []

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        frame_count += 1

        # 15프레임마다 검사
        if frame_count % 15 != 0: continue

        # [안전장치 1] 프레임 크기 확인
        h, w, _ = frame.shape

        faces = face_analyzer.get(frame)
        for face in faces:
            # [필터 1] 작은 얼굴 무시
            box = face.bbox.astype(int)
            width_box = box[2] - box[0]
            height_box = box[3] - box[1]
            if width_box < 50 or height_box < 50: continue

            # [필터 2] 중복 제거
            max_sim = -1
            for unique in unique_faces:
                sim = compute_sim(face.embedding, unique['embedding'])
                if sim > max_sim:
                    max_sim = sim

            if max_sim > 0.3:
                pass
            else:
                # [안전장치 2] 좌표 보정 (Clamping) - 에러 해결 핵심!
                x1 = max(0, int(box[0]))
                y1 = max(0, int(box[1]))
                x2 = min(w, int(box[2]))
                y2 = min(h, int(box[3]))

                # [안전장치 3] 잘라낼 영역 유효성 검사
                face_img = frame[y1:y2, x1:x2]

                if face_img.size == 0:
                    print(f"⚠️ 잘못된 좌표 감지됨 (Skip): {x1},{y1},{x2},{y2}")
                    continue

                # 안전하게 썸네일 생성
                unique_faces.append({
                    "embedding": face.embedding,
                    "thumb": img_to_base64(face_img)
                })

        if len(unique_faces) >= 5: break

    cap.release()
    detected_faces_db['current_video_path'] = video_path
    detected_faces_db['faces'] = unique_faces

    response_list = []
    for idx, item in enumerate(unique_faces):
        response_list.append({
            "id": idx,
            "image": f"data:image/jpeg;base64,{item['thumb']}"
        })
    print(f"✅ 분석 완료: 총 {len(unique_faces)}명 발견")
    return {"faces": response_list}

# ==========================================
# [기존 기능] 영상 변환
# ==========================================
@app.post("/swap_video")
async def swap_video_process(target_face: UploadFile = File(...), face_id: int = Form(...)):
    print(f"🔄 영상 변환 시작...")
    if 'current_video_path' not in detected_faces_db:
        return {"error": "영상을 먼저 분석해주세요."}

    # 타겟(내 얼굴) 분석
    target_bytes = await target_face.read()
    target_img = cv2.imdecode(np.frombuffer(target_bytes, np.uint8), cv2.IMREAD_COLOR)
    target_faces = face_analyzer.get(target_img)
    if not target_faces: return {"error": "내 사진 오류"}
    source_face = sorted(target_faces, key=lambda x: x.bbox[2]*x.bbox[3])[-1]

    target_embedding = detected_faces_db['faces'][face_id]['embedding']
    video_path = detected_faces_db['current_video_path']

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    output_path = "output_video.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        faces = face_analyzer.get(frame)
        for face in faces:
            sim = compute_sim(face.embedding, target_embedding)
            if sim > 0.35:
                frame = swapper.get(frame, face, source_face, paste_back=True)
        out.write(frame)

    cap.release()
    out.release()

    with open(output_path, "rb") as f:
        video_b64 = base64.b64encode(f.read()).decode("utf-8")

    return {"video": f"data:video/mp4;base64,{video_b64}"}

# ==========================================
# 4. 서버 실행
# ==========================================
ngrok.kill()
ngrok.set_auth_token("363OxHGjmVb9ZgLDd2e8nrjvCbv_5bQnb9P5811VjpNoj3d6j")
MY_DOMAIN = "leisha-uncommiserating-motherly.ngrok-free.dev"

# 중요: domain=MY_DOMAIN 을 꼭 넣어줘야 합니다!
public_url = ngrok.connect(8000, domain=MY_DOMAIN).public_url

print(f"\n🚀 통합 서버 시작: {public_url}")

nest_asyncio.apply()
config = uvicorn.Config(app, port=8000)
server = uvicorn.Server(config)
await server.serve()
