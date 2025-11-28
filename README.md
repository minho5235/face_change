🎭 얼굴 변환기 (Video & Image)

이 프로젝트는 InsightFace와 FastAPI를 활용하여 개발된 AI 기반 얼굴 합성(Deepfake) 서버입니다.
Google Colab의 GPU 자원을 활용하여 고성능 얼굴 인식 및 교체 작업을 수행하며, ngrok 고정 도메인을 통해 외부 프론트엔드(React 등)와 안정적으로 통신합니다.

✨ 주요 기능 (Key Features)

🎬 영상 분석 (Video Analysis)

영상 내 등장인물을 자동으로 탐지하고 클러스터링합니다.

스마트 중복 제거(V2 Algorithm): 코사인 유사도(Cosine Similarity)를 기반으로 동일 인물을 하나로 묶고, 흔들리거나 작은 얼굴은 필터링하여 정확도를 높였습니다.

🔄 영상 얼굴 합성 (Video Face Swap)

사용자가 선택한 영상 속 인물의 얼굴을 타겟 이미지(내 사진)로 자연스럽게 변환합니다.

프레임 단위로 얼굴을 추적하여 교체합니다.

📸 사진 얼굴 합성 (Image Face Swap)

단일 이미지에 대해서도 고품질 얼굴 합성을 지원합니다.

🌐 고정 도메인 지원 (Static Domain)

ngrok의 Static Domain 기능을 적용하여, 서버 재시작 시에도 API 주소가 변경되지 않습니다.

🛠 기술 스택 (Tech Stack)

Language: Python 3.10+

Framework: FastAPI, Uvicorn

AI/CV Models:

InsightFace: 얼굴 탐지(Buffalo_l) 및 인식

Inswapper_128: 얼굴 교체 (ONNX Runtime-GPU 가속)

OpenCV: 영상 프레임 처리 및 이미지 전처리

Infra/Network: Google Colab (Tesla T4 GPU), ngrok (Tunneling)

🚀 실행 방법 (How to Run)

이 서버는 Google Colab 환경에서 실행되도록 최적화되어 있습니다.

1. 필수 라이브러리 및 모델 준비

스크립트 실행 시 자동으로 필요한 라이브러리(insightface, onnxruntime-gpu 등)를 설치하고 inswapper_128.onnx 모델을 다운로드합니다.

2. Ngrok 설정

Combined_Server_V2.py 파일 하단의 MY_DOMAIN 변수에 본인의 ngrok 고정 도메인을 입력해야 합니다.

# Combined_Server_V2.py
ngrok.kill()
MY_DOMAIN = "your-static-domain.ngrok-free.dev" # 본인의 도메인으로 변경
public_url = ngrok.connect(8000, domain=MY_DOMAIN).public_url


3. 서버 실행

Colab에서 코드를 실행하면 FastAPI 서버가 8000번 포트에서 시작되며, ngrok을 통해 외부에서 접속 가능한 URL이 출력됩니다.

🚀 통합 서버 시작: [https://leisha-uncommiserating-motherly.ngrok-free.dev](https://leisha-uncommiserating-motherly.ngrok-free.dev)


📡 API 명세 (API Reference)

1. 영상 분석 (POST /analyze)

설명: 영상을 업로드하면 등장인물들의 썸네일 리스트를 반환합니다.

Parameter: video (File)

Response:

{
  "faces": [
    { "id": 0, "image": "base64_encoded_string..." },
    { "id": 1, "image": "base64_encoded_string..." }
  ]
}


2. 영상 얼굴 교체 (POST /swap_video)

설명: 분석된 영상의 특정 인물(face_id)을 타겟 이미지(target_face)로 교체합니다.

Parameters:

target_face (File): 교체할 대상의 얼굴 사진 (내 사진)

face_id (Integer): /analyze에서 반환된 인물 ID

Response:

{ "video": "data:video/mp4;base64,..." }


3. 사진 얼굴 교체 (POST /swap_image)

설명: 소스 이미지의 얼굴을 타겟 이미지의 얼굴로 교체합니다.

Parameters:

source (File): 얼굴을 추출할 원본 사진

target (File): 얼굴이 합성될 배경 사진

Response:

{ "image": "data:image/jpeg;base64,..." }


⚠️ 주의사항 (Notes)

GPU 필수: 얼굴 인식 및 교체 모델은 연산량이 많으므로 Colab 런타임 유형을 반드시 T4 GPU 이상으로 설정해야 합니다.

런타임 유지: 브라우저 탭을 닫으면 Colab 세션이 종료될 수 있습니다.

속도: 영상 길이에 따라 변환 시간이 소요될 수 있습니다 (10초 영상 기준 약 30초~1분).

Developed for Portfolio/Graduation Project# face_change
