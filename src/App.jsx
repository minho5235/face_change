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

  // [영상] 1. 분석
  const handleAnalyze = async () => {
    if (!videoFile) return alert("영상을 올려주세요!");
    setStatus("🔍 영상 분석 중... (잠시만 기다려주세요)");
    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      const res = await axios.post(`${API_URL}/analyze`, formData, { headers: getHeaders() });
      setDetectedFaces(res.data.faces);
      setStatus("👥 바꿀 사람을 선택하고 내 사진을 올려주세요!");
    } catch (err) {
      console.error(err);
      setStatus("❌ 분석 실패 (서버 확인 필요)");
    }
  };

  // [영상] 2. 변환
  const handleSwapVideo = async () => {
    if (selectedFaceId === null || !myFaceFile) return alert("대상 선택 & 내 사진 필수!");
    setStatus("🎬 영상 변환 중... (30초~1분)");
    const formData = new FormData();
    formData.append("target_face", myFaceFile);
    formData.append("face_id", selectedFaceId);

    try {
      const res = await axios.post(`${API_URL}/swap_video`, formData, { headers: getHeaders() });
      if(res.data.video) {
          setResultVideo(res.data.video);
          setStatus("✨ 영상 변환 완료!");
      } else {
          setStatus("⚠️ 실패: " + res.data.error);
      }
    } catch (err) {
      setStatus("❌ 변환 에러");
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
            <h3>1. 원본 영상 (짧은 영상 추천)</h3>
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
              <a href={resultVideo} download="result.mp4"><button style={styles.downloadBtn}>💾 다운로드</button></a>
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
              <a href={resultImage} download="swapped_face.jpg"><button style={styles.downloadBtn}>💾 이미지 저장</button></a>
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
  downloadBtn: { marginTop: "10px", padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  flexBox: { display: "flex", gap: "20px", justifyContent: "center", marginBottom: "20px" },
  uploadBox: { flex: 1, padding: "20px", border: "2px dashed #ccc", borderRadius: "10px" }
};

export default App;