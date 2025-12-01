import { useState } from 'react';
import axios from 'axios';

// ✅ 고정 도메인 적용
const API_URL = "https://leisha-uncommiserating-motherly.ngrok-free.dev"; 

function App() {
  // 모드 선택 (image | video)
  const [mode, setMode] = useState("video");
  
  // 공통 상태
  const [status, setStatus] = useState("원하는 모드를 선택해주세요!");
  
  // 영상 모드용 상태
  const [videoFile, setVideoFile] = useState(null);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [selectedFaceId, setSelectedFaceId] = useState(null);
  const [resultVideo, setResultVideo] = useState(null);

  // 사진 모드용 상태
  const [imgSource, setImgSource] = useState(null); // 내 얼굴
  const [imgTarget, setImgTarget] = useState(null); // 바꿀 사진
  const [resultImage, setResultImage] = useState(null);
  
  const [myFaceFile, setMyFaceFile] = useState(null); // (공통) 내 얼굴 파일

  const getHeaders = () => ({ "ngrok-skip-browser-warning": "true" });

  // ============================================================
  // 🔥 [핵심 수정] 모바일 다운로드 해결 함수 (Base64 -> Blob)
  // ============================================================
  const downloadFile = (dataUrl, fileName) => {
    try {
      // 1. Data URL에서 Base64 데이터만 분리
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while(n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      // 2. Blob 객체 생성 (가상의 파일)
      const blob = new Blob([u8arr], { type: mime });

      // 3. 브라우저 메모리에 URL 생성
      const url = URL.createObjectURL(blob);

      // 4. 가상의 링크를 만들어 클릭 (다운로드 트리거)
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // 5. 뒷정리
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (e) {
      console.error("다운로드 실패:", e);
      alert("다운로드 중 오류가 발생했습니다. (앱 브라우저라면 크롬/사파리에서 열어주세요)");
    }
  };

  // [영상] 1. 분석
  const handleAnalyze = async () => {
    if (!videoFile) return alert("영상을 올려주세요!");
    setStatus("🔍 영상 분석 중... (잠시만 기다려주세요)");
    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      // 타임아웃 5분(300000ms) 설정
      const res = await axios.post(`${API_URL}/analyze`, formData, { 
        headers: getHeaders(),
        timeout: 300000 
      });
      setDetectedFaces(res.data.faces);
      setStatus("👥 바꿀 사람을 선택하고 내 사진을 올려주세요!");
    } catch (err) {
      console.error(err);
      setStatus("❌ 분석 실패 (서버 확인 필요)");
      alert("분석 에러: " + (err.response?.data?.error || err.message));
    }
  };

  // [영상] 2. 변환 (여기가 에러가 났던 부분)
  const handleSwapVideo = async () => {
    if (selectedFaceId === null || !myFaceFile) return alert("대상 선택 & 내 사진 필수!");
    setStatus("🎬 영상 변환 중... (1분 영상 기준 약 3~5분 소요)");
    const formData = new FormData();
    formData.append("target_face", myFaceFile);
    formData.append("face_id", selectedFaceId);

    try {
      // ✅ [수정] 타임아웃을 20분(1,200,000ms)으로 대폭 늘림 (1분 영상 지원)
      const res = await axios.post(`${API_URL}/swap_video`, formData, { 
        headers: getHeaders(),
        timeout: 1200000 
      });

      if(res.data.video) {
          setResultVideo(res.data.video);
          setStatus("✨ 영상 변환 완료!");
      } else {
          // 서버가 200 OK를 보냈지만 에러 메시지가 있는 경우
          setStatus("⚠️ 실패: " + (res.data.error || "알 수 없는 오류"));
          alert("서버 오류: " + res.data.error);
      }
    } catch (err) {
      console.error("영상 변환 에러 상세:", err);
      
      // 에러 원인을 정확히 알려줌
      let errMsg = "변환 에러";
      if (err.code === 'ECONNABORTED') {
        errMsg = "시간 초과! (서버가 응답하지 않습니다)";
      } else if (err.message.includes("Network Error")) {
        errMsg = "네트워크 에러 (파일이 너무 커서 전송 실패)";
      } else {
        errMsg = err.message;
      }

      setStatus("❌ " + errMsg);
      alert("에러 발생: " + errMsg + "\n(1분 이상의 고화질 영상은 모바일 메모리 문제로 튕길 수 있습니다)");
    }
  };

  // [사진] 변환
  const handleSwapImage = async () => {
    if (!imgSource || !imgTarget) return alert("사진 2장을 모두 올려주세요!");
    setStatus("📸 사진 변환 중... (약 5초)");
    
    const formData = new FormData();
    formData.append("source", imgSource);
    formData.append("target", imgTarget);

    try {
      const res = await axios.post(`${API_URL}/swap_image`, formData, { headers: getHeaders() });
      if(res.data.image) {
        setResultImage(res.data.image);
        setStatus("✨ 사진 변환 완료!");
      } else {
        setStatus("⚠️ 실패: " + res.data.error);
      }
    } catch (err) {
      setStatus("❌ 변환 에러");
      alert("사진 변환 에러: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎭 얼굴 변환기</h1>
      
      {/* 탭 메뉴 */}
      <div style={styles.tabContainer}>
        <button 
          style={{...styles.tabBtn, backgroundColor: mode === 'video' ? '#007bff' : '#eee', color: mode === 'video' ? '#fff' : '#333'}}
          onClick={() => setMode('video')}
        >
          🎥 영상 합성
        </button>
        <button 
          style={{...styles.tabBtn, backgroundColor: mode === 'image' ? '#28a745' : '#eee', color: mode === 'image' ? '#fff' : '#333'}}
          onClick={() => setMode('image')}
        >
          📸 사진 합성
        </button>
      </div>

      <div style={styles.statusBox}>{status}</div>

      {/* ================= 영상 모드 ================= */}
      {mode === 'video' && (
        <div style={styles.modeBox}>
          <div style={styles.section}>
            <h3>1. 원본 영상</h3>
            <p style={{fontSize: "12px", color: "#666"}}>※ 1분 이내 영상 권장 (변환 시간이 오래 걸릴 수 있습니다)</p>
            <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} />
            <button onClick={handleAnalyze} style={styles.actionBtn}>🔍 분석하기</button>
          </div>

          {detectedFaces.length > 0 && (
            <div style={styles.section}>
              <h3>2. 바꿀 인물 선택</h3>
              <div style={styles.faceGrid}>
                {detectedFaces.map((face) => (
                  <div 
                    key={face.id} 
                    onClick={() => setSelectedFaceId(face.id)}
                    style={{...styles.faceCard, border: selectedFaceId === face.id ? "4px solid #007bff" : "2px solid #ddd"}}
                  >
                    <img src={face.image} alt="face" style={styles.faceImg} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFaceId !== null && (
            <div style={styles.section}>
              <h3>3. 넣을 사진 (Source)</h3>
              <input type="file" accept="image/*" onChange={(e) => setMyFaceFile(e.target.files[0])} />
              <br/>
              <button onClick={handleSwapVideo} style={styles.mainBtn}>🚀 영상 변환 시작</button>
            </div>
          )}

          {resultVideo && (
            <div style={styles.resultBox}>
              <video controls src={resultVideo} style={{width: "100%", borderRadius: "10px"}} />
              <br/>
              {/* 수정된 다운로드 버튼 */}
              <button 
                onClick={() => downloadFile(resultVideo, "swapped_video.mp4")} 
                style={styles.downloadBtn}
              >
                💾 영상 다운로드
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= 사진 모드 ================= */}
      {mode === 'image' && (
        <div style={styles.modeBox}>
          <div style={styles.flexBox}>
            <div style={styles.uploadBox}>
              <h3>넣을 얼굴 (Source)</h3>
              <input type="file" accept="image/*" onChange={(e) => setImgSource(e.target.files[0])} />
            </div>
            <div style={styles.uploadBox}>
              <h3>원본 사진 (Target)</h3>
              <input type="file" accept="image/*" onChange={(e) => setImgTarget(e.target.files[0])} />
            </div>
          </div>
          
          <button onClick={handleSwapImage} style={{...styles.mainBtn, backgroundColor: '#28a745'}}>
            ✨ 사진 변환 시작
          </button>

          {resultImage && (
            <div style={styles.resultBox}>
              <img src={resultImage} alt="result" style={{maxWidth: "100%", borderRadius: "10px"}} />
              <br/>
              {/* 수정된 다운로드 버튼 */}
              <button 
                onClick={() => downloadFile(resultImage, "swapped_face.jpg")} 
                style={styles.downloadBtn}
              >
                💾 이미지 저장
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { maxWidth: "700px", margin: "0 auto", padding: "20px", textAlign: "center", fontFamily: "sans-serif" },
  title: { color: "#333", marginBottom: "20px" },
  tabContainer: { display: "flex", justifyContent: "center", marginBottom: "20px", gap: "10px" },
  tabBtn: { padding: "10px 30px", fontSize: "16px", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", transition: "0.3s" },
  statusBox: { padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "5px", fontWeight: "bold", color: "#666", marginBottom: "20px" },
  modeBox: { animation: "fadeIn 0.5s" },
  section: { marginBottom: "20px", padding: "15px", border: "1px solid #eee", borderRadius: "10px", backgroundColor: "#fff" },
  actionBtn: { marginLeft: "10px", padding: "5px 15px", cursor: "pointer", borderRadius: "5px", border: "1px solid #ccc" },
  faceGrid: { display: "flex", justifyContent: "center", gap: "10px" },
  faceCard: { cursor: "pointer", borderRadius: "8px", overflow: "hidden", width: "80px" },
  faceImg: { width: "100%", height: "80px", objectFit: "cover" },
  mainBtn: { marginTop: "15px", padding: "15px 40px", fontSize: "18px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  resultBox: { marginTop: "30px", padding: "20px", backgroundColor: "#eef7ff", borderRadius: "10px", border: "2px solid #007bff" },
  downloadBtn: { marginTop: "10px", padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" },
  flexBox: { display: "flex", gap: "20px", justifyContent: "center", marginBottom: "20px" },
  uploadBox: { flex: 1, padding: "20px", border: "2px dashed #ccc", borderRadius: "10px" }
};

export default App;