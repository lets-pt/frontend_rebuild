import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import logo from "../img/logo.png";
import axios from "axios";
import Modal from "react-modal";
import { io } from "socket.io-client";
import { BsStopCircleFill, BsStopwatchFill } from "react-icons/bs";

const Practice = () => {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPractice, setIsPractice] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [modal, setModal] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [title, setTitle] = useState("");
  const videoOutputRef = useRef(null);
  const screenRecordedVideoRef = useRef(null);
  const camRecordedVideoRef = useRef(null);
  const screenMediaStreamRef = useRef(null);
  const camMediaStreamRef = useRef(null);
  const screenMediaRecorderRef = useRef(null);
  const camMediaRecorderRef = useRef(null);
  const screenRecordedChunksRef = useRef([]);
  const camRecordedChunksRef = useRef([]);
  const quitFlag = useRef(null); //녹화 종료 버튼 클릭 여부 확인

  // 실시간 통신을 위한 변수 선언-----------------------------------------------
  const socket = useRef(); //소켓 객체
  const myFaceRef = useRef(); //내 비디오 요소
  const peerFaceRef = useRef(); //상대방 비디오 요소
  const [myStream, setMyStream] = useState(null); //내 스트림
  // const [roomName, setRoomName] = useState(""); //참관코드
  let roomName = ""; //참관코드
  const myPeerConnection = useRef(null); //피어 연결 객체
  // ----------------------------------------------------------------------

  useEffect(() => {
    let timer;
    if (playing) {
      setIsTimerRunning(true);
      timer = setInterval(() => {
        setSeconds((prevSeconds) => {
          if (prevSeconds === 59) {
            setMinutes((prevMinutes) => prevMinutes + 1);
            return 0;
          } else {
            return prevSeconds + 1;
          }
        });
      }, 1000);
    } else {
      setIsTimerRunning(false);
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  useEffect(() => {
    // 유저의 화면 공유 요청
    navigator.mediaDevices
      .getDisplayMedia({ video: true })
      .then(function (newMediaStream) {
        screenMediaStreamRef.current = newMediaStream;
      });

    // 유저의 카메라로 부터 입력을 사용할 수 있도록 요청
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(function (newMediaStream) {
        camMediaStreamRef.current = newMediaStream;
        // 카메라의 입력을 실시간으로 비디오 태그에서 확인
        videoOutputRef.current.srcObject = camMediaStreamRef.current;
        videoOutputRef.current.onloadedmetadata = function (e) {
          videoOutputRef.current.play();
        };
      });
  }, [isPractice]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    setPdfFile(file);
  }, []);

  const pdfComponent = useMemo(() => {
    return pdfFile ? (
      <embed
        className="pdf"
        src={URL.createObjectURL(pdfFile) + "#toolbar=0&scrollbar=0"}
        type="application/pdf"
        width="100%"
        height="100%"
      />
    ) : (
      <div>
        <p>PDF 파일을 드래그 앤 드롭하거나</p>
        <input type="file" accept=".pdf" onChange={handleFileChange} />
      </div>
    );
  }, [pdfFile, handleFileChange]);

  const titleChange = (event) => {
    const newInputValue = event.target.value;
    setTitle(newInputValue);
  };

  const startPractice = () => {
    startRecording();
    setMinutes(0);
    setSeconds(0);
  };

  const quitPractice = () => {
    quitFlag.current = true;
    stopRecording();
    setMinutes(0);
    setSeconds(0);
    setModal(true);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    setPdfFile(file);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const startRecording = () => {
    setPlaying(true);
    setIsTimerRunning(true);
    screenRecordedChunksRef.current = [];
    camRecordedChunksRef.current = [];
    screenMediaRecorderRef.current = new MediaRecorder(
      screenMediaStreamRef.current,
      {
        mimetype: "video/webm",
      }
    );
    camMediaRecorderRef.current = new MediaRecorder(camMediaStreamRef.current, {
      mimetype: "video/webm",
    });

    screenMediaRecorderRef.current.ondataavailable = function (event) {
      if (event.data && event.data.size > 0) {
        console.log("ondataavailable");
        screenRecordedChunksRef.current.push(event.data);
        console.log("screenMediaRecorderRef: ", screenRecordedChunksRef);
      }
    };
    camMediaRecorderRef.current.ondataavailable = function (event) {
      if (event.data && event.data.size > 0) {
        console.log("ondataavailable");
        camRecordedChunksRef.current.push(event.data);
        console.log("camMediaRecorderRef: ", camRecordedChunksRef);
      }
    };

    screenMediaRecorderRef.current.onstop = function () {
      if (screenRecordedChunksRef.current.length > 0) {
        const screenBlob = new Blob(screenRecordedChunksRef.current, {
          type: "video/webm",
        });
        console.log("screenMediaRecorderRef.stop blob: ", screenBlob);
        const camBlob = new Blob(camRecordedChunksRef.current, {
          type: "video/webm",
        });
        console.log("camRecordedChunksRef.stop blob: ", camBlob);
        const screenRecordedMediaURL = URL.createObjectURL(screenBlob);
        const camRecordedMediaURL = URL.createObjectURL(camBlob);
        if (screenRecordedVideoRef.current && camRecordedVideoRef.current) {
          //아무 값도 없을 때 참조 금지
          screenRecordedVideoRef.current.src = screenRecordedMediaURL;
          camRecordedVideoRef.current.src = camRecordedMediaURL;
        }

        console.log(quitFlag);
        if (quitFlag.current === true) {
          //녹화 종료 버튼이 눌렸을 때만 서버에 데이터 전송
          const formData = new FormData();
          const nowDate = new Date();

          formData.append(
            //화면 녹화 추가
            "screen",
            screenBlob,
            `screen_userID_${nowDate.getFullYear()}.${
              nowDate.getMonth() + 1
            }.${nowDate.getDate()}_${nowDate.getHours()}:${nowDate.getMinutes()}.webm`
          );

          formData.append(
            //웹캠 녹화 추가
            "cam",
            camBlob,
            `cam_userID_${nowDate.getFullYear()}.${
              nowDate.getMonth() + 1
            }.${nowDate.getDate()}_${nowDate.getHours()}:${nowDate.getMinutes()}.webm`
          );
          console.log(formData);

          //영상 서버 전송
          axios
            .post("http://localhost:3001/ffmpeg/", formData)
            .then((response) => {
              console.log("영상 전송 완료", response.data); // 서버 응답 처리
            })
            .catch((error) => {
              console.error("영상 전송 실패:", error); // 서버 응답 처리
            });
        }
        screenMediaRecorderRef.current = null;
        console.log(screenMediaRecorderRef.current);
        camMediaRecorderRef.current = null;
        console.log(camMediaRecorderRef.current);
      }
    };
    console.log("Recording Start!");
    camMediaRecorderRef.current.start();
    screenMediaRecorderRef.current.start();
    setPlaying(true);
  };

  const stopRecording = () => {
    if (screenMediaRecorderRef.current) {
      camMediaRecorderRef.current.stop();
      screenMediaRecorderRef.current.stop();
      setPlaying(false);
      setIsTimerRunning(false);
    }
  };

  // const downloadVideo = () => {
  //   if (screenRecordedChunksRef.current.length > 0) {
  //     const blob = new Blob(screenRecordedChunksRef.current, { type: "video/webm;" });
  //     const url = URL.createObjectURL(blob);
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.download = "video.webm";
  //     link.click();
  //     URL.revokeObjectURL(url);
  //   }
  // }

  const goToDetailPage = () => {
    const width = 1000;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      "/result",
      "_blank",
      `width=${width}, height=${height}, left=${left}, top=${top}, resizable=no, scrollbars=yes`
    );
  };
  const goToScriptPage = () => {
    const width = 1000;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      "/script",
      "_blank",
      `width=${width}, height=${height}, left=${left}, top=${top}, resizable=no, scrollbars=yes`
    );
  };

  const goToKeywordPage = () => {
    const width = 400;
    const height = 300;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      "/keyword",
      "_blank",
      `width=${width}, height=${height}, left=${left}, top=${top}, resizable=no, scrollbars=yes`
    );
  };

  const stopPractice = () => {
    stopRecording();
    setMinutes(0);
    setSeconds(0);
  };

  //RTCPeerConnection 객체 생성-----------------------------------------------
  const makeConnection = () => {
    myPeerConnection.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
          ],
        },
      ],
    });
    myPeerConnection.current.addEventListener("icecandidate", handleIce);
    myPeerConnection.current.addEventListener("addstream", handleAddStream);
    if (camMediaStreamRef.current) {
      camMediaStreamRef.current
        .getTracks()
        .forEach((track) =>
          myPeerConnection.current.addTrack(track, camMediaStreamRef.current)
        );
    }
  };

  const handleIce = (data) => {
    console.log(`sent candidate : ${roomName}`, data);
    socket.current.emit("icecandidate", {
      visitorcode: roomName,
      icecandidate: data.candidate,
    });
  };

  const handleAddStream = (data) => {
    console.log("got an stream from my peer", data.stream);
    peerFaceRef.current.srcObject = data.stream;
  };
  //----------------------------------------------------------------------

  const realMode = () => {
    //실전모드로 전환
    setIsPractice(false);
    makeConnection(); //피어 연결 - RTCPeerConnection 객체 생성

    // // 카메라 스트림을 가져오고 myFaceRef에 연결합니다.
    // navigator.mediaDevices
    //   .getUserMedia({ video: true, audio: true })
    //   .then(function (newMediaStream) {
    //     camMediaStreamRef.current = newMediaStream;
    //     myFaceRef.current.srcObject = camMediaStreamRef.current;
    //   })
    //   .catch((error) => {
    //     console.error("카메라 스트림을 가져오지 못했습니다:", error);
    //   });

    console.log(socket);
    socket.current = io("http://localhost:3001/room", {
      //소켓 연결
      withCredentials: true,
    });
    console.log(socket.current);

    socket.current.on("connect", () => {
      console.log("connect");
      socket.current.emit("createRoom", { userId: "admin" });
    });

    socket.current.on("create-succ", async (room) => {
      console.log("create-succ", room);
      // setRoomName(room);
      roomName = room;

      //offer를 보내는 쪽
      const offer = await myPeerConnection.current.createOffer();
      await myPeerConnection.current.setLocalDescription(offer);
      socket.current.emit("offer", { visitorcode: room, offer: offer });
      console.log(`sent the offer : ${room}`, offer);
    });
    //offer를 받는 쪽
    socket.current.on("offer", async (data) => {
      console.log(`received the offer : ${data.visitorcode}`, data);
      myPeerConnection.current.setRemoteDescription(data.offer);
      const answer = await myPeerConnection.current.createAnswer();
      myPeerConnection.current.setLocalDescription(answer);
      socket.current.emit("answer", { visitorcode: data.visitorcode, answer: answer });
      console.log(`sent the answer : ${data.visitorcode}`, answer);
    });

    //answer를 받는 쪽
    socket.current.on("answer", async (data) => {
      console.log(`received the answer : ${data.visitorcode}`, data);
      await myPeerConnection.current.setRemoteDescription(data.answer);
    });

    //ice를 받는 쪽
    socket.current.on("icecandidate", async (data) => {
      console.log("received candidate", data);
      await myPeerConnection.current.addIceCandidate(data.icecandidate);
    });
  };

  return (
    <div className="practice-container">
      <div className="practice-top">
        <BsStopwatchFill className="timer-icon" size={30} />
        <div className="timer-container">
          <div className="timer-area">
            <span>{minutes < 10 ? `0${minutes}` : minutes}</span> :&nbsp;
            <span>{seconds < 10 ? `0${seconds}` : seconds}</span>
            &nbsp;/&nbsp;
            <input type="number" className="minutes-input" />
            &nbsp;:&nbsp;
            <input type="number" className="seconds-input" />
          </div>
        </div>
        <button className="stop-button" onClick={stopPractice}>
          <BsStopCircleFill size={30} />
        </button>
        <div className="change-mode-button-container">
          <button className="" onClick={() => setIsPractice(true)}>
            연습모드
          </button>
          &nbsp;/&nbsp;
          <button onClick={realMode}>실전모드</button>
        </div>
        <button className="change-script-button" onClick={goToScriptPage}>
          스크립트 변환
        </button>
        <button className="keyword-button" onClick={goToKeywordPage}>
          키워드 등록
        </button>
        <div className="practice-user-info">유저정보</div>
      </div>
      {isPractice ? (
        <div className="practice-camera-pdf-container">
          <div className="practice-left">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="practice-pdf-area"
            >
              {pdfComponent}
            </div>
            <textarea
              className="script-input"
              placeholder="스크립트 작성"
            ></textarea>
          </div>
          <div className="practice-right">
            <video
              ref={videoOutputRef}
              className="practice-live-camera"
              muted
            ></video>
            {playing ? (
              <p className="practice-title-save">{title}</p>
            ) : (
              <input
                type="text"
                className="practice-title"
                placeholder="발표 제목을 입력해주세요"
                value={title}
                onChange={(e) => titleChange(e)}
              />
            )}
            <br />
            {playing ? (
              <button onClick={quitPractice} className="start-stop-button">
                발표 종료
              </button>
            ) : (
              <button onClick={startPractice} className="start-stop-button">
                발표 시작
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="real-camera-pdf-container">
            <div className="real-left">
              <div
                className="real-pdf-area"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {pdfComponent}
              </div>
            </div>
            <div className="real-right">
              <h2 className="observe-code-title">참관코드</h2>
              <h2 className="observe-code">{roomName}</h2>
              <video
                ref={videoOutputRef}
                className="real-live-camera"
                muted
              ></video>
              <video
                ref={peerFaceRef}
                autoPlay
                playsInline
                width="200"
                height="200"
              />
              {playing ? (
                <p className="real-title-save">{title}</p>
              ) : (
                <input
                  type="text"
                  className="real-title"
                  placeholder="발표 제목을 입력해주세요"
                  value={title}
                  onChange={(e) => titleChange(e)}
                />
              )}

              <br />
              {playing ? (
                <button onClick={quitPractice} className="start-stop-button">
                  발표 종료
                </button>
              ) : (
                <button onClick={startPractice} className="start-stop-button">
                  발표 시작
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={modal} onRequestClose={() => setModal(false)}>
        <div className="modal-container">
          <img src={logo} className="modal-logo" alt="logo" width={200} />
          <h2 className="modal-title">{title}</h2>
          <video
            className="modal-video"
            ref={camRecordedVideoRef}
            autoPlay
            controls
          ></video>
          <div className="modal-button-container">
            <button className="detail-button" onClick={goToDetailPage}>
              상세보기
            </button>
            <button className="save-button">저장하기</button>
          </div>
        </div>
        <button onClick={() => setModal(false)} className="modal-close">
          닫기
        </button>
      </Modal>
    </div>
  );
};

export default Practice;
