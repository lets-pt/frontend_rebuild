// Observe.js

import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";
import { IoIosSend } from "react-icons/io";
import { BsFillMicFill, BsFillMicMuteFill } from "react-icons/bs";
import { IoExit } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import axios from "axios";
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const Observe = () => {
  // 실시간 통신을 위한 변수 선언-----------------------------------------------
  const socket = useRef(); //소켓 객체
  const myFaceRef = useRef(); //내 비디오 요소
  const peerFaceRef = useRef({}); //상대방 비디오 요소
  const myStream = useRef(null);
  const myPeerConnection = useRef({}); //피어 연결 객체
  const [showModal, setShowModal] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const [joinUser, setJoinUser] = useState([]); //접속한 유저 정보
  // ----------------------------------------------------------------------

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const visitorCode = searchParams.get("visitorcode");

  //----------------------------------------------------------------------

  const [userId, setUserId] = useState(null);
  const [receiveData, setReceiveData] = useState(null);
  const [comment, setComment] = useState(""); // 코멘트 상태 변수 추가
  const [send, setSend] = useState('');

  const leavePage = () => {
    window.close();
  };

  useEffect(() => {
    // 로컬스토리지에서 토큰 가져오기
    const token = localStorage.getItem("token");

    // Axios 요청 설정
    const config = {
      headers: {
        Authorization: `Bearer ${token}`, // 헤더에 토큰 추가
      },
    };

    // 서버로 데이터를 요청하는 예시 API 엔드포인트
    const apiUrl = `${process.env.REACT_APP_SITE_URL}/user/`;

    // Axios를 사용하여 요청 보내기
    axios
      .get(apiUrl, config)
      .then((response) => {
        // 요청에 성공한 경우
        console.log("서버 응답:", response.data);
        // 서버에서 응답으로 받은 데이터를 처리하거나 상태를 업데이트할 수 있습니다.
        setUserId(response.data.data.name);
      })
      .catch((error) => {
        // 요청에 실패한 경우
        console.error("에러:", error);
        // 에러 처리 로직 추가 가능
      });
  }, []);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        myStream.current = stream;
        myFaceRef.current.srcObject = myStream.current;
      } catch (error) {
        console.log(error);
      }
    };

    console.log(socket);
    socket.current = io(`${process.env.REACT_APP_SITE_URL}/room`, {
      //소켓 연결
      withCredentials: true,
    });
    console.log(socket.current);
    console.log("visitorCode : ", visitorCode);

    socket.current.on("connect", async () => {
      console.log("connect");
      await getMedia(); //비디오, 오디오 스트림 가져오기
      console.log("joinRoom : ", visitorCode, userId);
      await socket.current.emit("joinRoom", {
        visitorcode: visitorCode,
        userId: userId,
      });
    });

    socket.current.on("join-succ", async (data) => {
      console.log("joinRoom : ", data);

      try {
        console.log("socket.current.id: ", socket.current.id);
        for (const id in data.userlist) {
          if (data.userlist[id] !== socket.current.id) {
            if (!myPeerConnection.current[data.userlist[id]]) {
              makeConnection(data.userlist[id]); //상대방과 연결 객체 생성
              //offer 생성
              const offer = await myPeerConnection.current[data.userlist[id]].createOffer();
              myPeerConnection.current[data.userlist[id]].setLocalDescription(offer);
              console.log(`sent the offer ${data.userlist[id]} : `, offer);
              socket.current.emit("offer", {
                visitorcode: visitorCode,
                offer: offer,
                to: data.userlist[id],
              });
            }
          }
        }
        setJoinUser(data.userlist.filter((id) => id !== socket.current.id));
      } catch (error) {
        console.log("Error creating offer!", error);
      }
    });

    socket.current.on("join-fail", (data) => {
      console.log("Fail join-Room : ", data);
      alert(data);
      window.close();
    });

    //참관자 입장
    socket.current.on("user-join", async (data) => {
      console.log("user-join : ", data);
      setJoinUser(data.filter((id) => id !== socket.current.id));
    });

    //offer 받기
    socket.current.on("offer", async (data) => {
      console.log(`${data.from} received the offer : `, data);

      if (!myPeerConnection.current[data.from]) {
        makeConnection(data.from);
      }

      if (myPeerConnection.current[data.from].connectionState === "stable") {
        console.log("Ignoring offer, connection already established.");
        return;
      }

      //answer 보내기
      myPeerConnection.current[data.from].setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      const answer = await myPeerConnection.current[data.from].createAnswer();
      myPeerConnection.current[data.from].setLocalDescription(answer);
      socket.current.emit("answer", {
        visitorcode: visitorCode,
        answer: answer,
        to: data.from,
      });
      console.log(`${data.from} sent the answer : `, answer);
    });

    //answer 받기
    socket.current.on("answer", async (data) => {
      console.log(`${data.from} received the answer : `, data.answer);

      await myPeerConnection.current[data.from].setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
    });

    //icecandidate 받기
    socket.current.on("ice", async (data) => {
      console.log("received candidate", data.visitorcode, data.icecandidate);
      if (myPeerConnection.current[data.from]) {
        await myPeerConnection.current[data.from].addIceCandidate(
          data.icecandidate
        );

      }
    });

    socket.current.on("title-url", (data) => {
      console.log("title-url : ", data);
      setReceiveData(data);
    });

    //pdf 이벤트 받기
    socket.current.on("leftArrow", () => {
      console.log("leftArrow");
      //왼쪽 이벤트 발생
      handlePageChange(-1);
    });

    socket.current.on("rightArrow", () => {
      console.log("rightArrow");
      //오른쪽 이벤트 발생
      handlePageChange(1);
    });

    socket.current.on("start-timer", () => {
      console.log("start-timer");
      socket.current.emit("is-running", {
        visitorcode: visitorCode,
        isRunning: true,
      });
      //타이머 시작
      startTimer();
    });

    socket.current.on("stop-timer", () => {
      console.log("stop-timer");
      socket.current.emit("is-running", {
        visitorcode: visitorCode,
        isRunning: false,
      });
      //타이머 정지
      stopTimer();
      setShowModal(true);
    });
  }, [visitorCode]);

  //RTCPeerConnection 객체 생성-----------------------------------------------
  const makeConnection = (id) => {
    myPeerConnection.current[id] = new RTCPeerConnection({
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

    myPeerConnection.current[id].addEventListener("icecandidate", (data) => handleIce(data, id));

    myPeerConnection.current[id].oniceconnectionstatechange = () => {
      console.log("ICE connection state change:", myPeerConnection.current[id].iceConnectionState);
      if (myPeerConnection.current[id].iceConnectionState === "disconnected") {
        myPeerConnection.current[id].close();
        delete myPeerConnection.current[id];
      }
    };

    myPeerConnection.current[id].ontrack = (event) => {
      console.log("got an stream from my peer", id, event.streams[0]);
      peerFaceRef.current[id].srcObject = event.streams[0];
    };
    console.log(`myPeerConnection.current[${id}].ontrack`, myPeerConnection.current[id]);

    if (myStream.current) {
      myStream.current
        .getTracks()
        .forEach((track) =>
          myPeerConnection.current[id].addTrack(track, myStream.current)
        );
    }
  };

  const handleIce = (data, id) => {
    console.log(`${id} sent candidate : `, data);
    socket.current.emit("ice", {
      visitorcode: visitorCode,
      icecandidate: data.candidate,
      to: id,
    });
  };
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const [pageNumber, setPageNumber] = useState(1);

  const handlePageChange = (change) => {
    setPageNumber((prevPageNumber) => prevPageNumber + change);
  };

  // 타이머 값을 저장할 상태 변수
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

  // 타이머를 시작하는 함수
  const startTimer = () => {
    setIsTimerRunning(true);
    timerIntervalRef.current = setInterval(() => {
      setTimer((prevTimer) => prevTimer + 1);
    }, 1000); // 1초마다 타이머 업데이트 (1000ms)
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    clearInterval(timerIntervalRef.current); // useRef를 이용하여 타이머 interval을 정확히 clearInterval
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // 코멘트를 서버에 전송하는 함수
  const handleCommentSubmit = async (comment) => {
    // 데이터를 서버에 보낼 형식으로 가공
    const dataToSend = {
      title: receiveData.title,
      userId: receiveData.userName,
      userComment: {
        name: userId,
        time: {
          minute: Math.floor(timer / 60),
          second: timer % 60,
        },
        message: comment,
      },
    };

    // 서버에 PUT 요청 보내기
    await axios.put(`${process.env.REACT_APP_SITE_URL}/presentation/update-comment`, dataToSend)
      .then((response) => {
        // 성공적으로 요청이 완료된 경우에 수행할 로직 추가 가능
        setSend("코멘트 전송 완료!");
      })
      .catch((error) => {
        // 요청에 실패한 경우 에러 처리 로직 추가 가능
        setSend("코멘트 전송 실패");
      });

    setComment('');
  };

  useEffect(() => {
    if (send === "코멘트 전송 완료!") {
      const timeout = setTimeout(() => {
        setSend(""); // 1초 뒤에 send 상태를 빈 문자열로 설정하여 메시지를 사라지게 함
      }, 1000);

      // 컴포넌트가 언마운트되면 타임아웃 클리어
      return () => clearTimeout(timeout);
    }
  }, [send]);

  const handleToggleMute = () => {
    // 비디오의 음소거 상태를 토글 (반대값으로 변경)
    myStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
    setIsMuted((prevIsMuted) => !prevIsMuted);
  };


  return (
    <div className="observe-page-container">
      <header>
        <h1 className="observe-title">발표 참관 중</h1>
        {receiveData ? (<h2 className="presentator-name">{receiveData.userName} 님의 발표입니다</h2>) : (<h2></h2>)}
        <div className="practice-user-info">
          <FaUserCircle size={40} className="user-icon" />
          <div className="top-user-info">
            {userId}
          </div>
        </div>
      </header>
      <main>
        <div className="observe-page-middle">
          {receiveData ? (
            <div className="pdf-area">
              <Document className="observe-document" file={receiveData.pdfURL} onLoadSuccess={onDocumentLoadSuccess}>
                <Page pageNumber={pageNumber} width="800" height="450" />
              </Document>
              <h2 className="presentation-title">{receiveData.title}</h2>
            </div>
          ) : (
            <div className="loading-pdf">Loading...</div>
          )}
          <div id="call">
            <div id="myStream">
              {joinUser.map((user, index) => (
                <video key={index}
                  ref={(el) => {
                    peerFaceRef.current[user] = el
                  }}
                  className="observe-camera"
                  autoPlay
                >
                </video>
              ))}
              <video
                ref={myFaceRef}
                className="observe-camera"
                autoPlay
                muted={isMuted}
                playsInline
              />
            </div>
          </div>
        </div>
        <div className="observe-page-bottom">
          <div className="comment-write">
            <p className="timer">{formatTime(timer)}</p>
            {/* 코멘트 입력을 위한 input과 버튼 추가 */}
            <input
              type="text"
              className="comment"
              placeholder="코멘트를 입력해주세요!"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button className="comment-submit" type="submit" onClick={() => handleCommentSubmit(comment)}>
              <IoIosSend size={40} />
            </button>
          </div>
          <div className="comment-record">
            {send}
          </div>
          <button className="mute-button" onClick={handleToggleMute}>
            {isMuted ? <BsFillMicMuteFill size={50} /> : <BsFillMicFill size={50} />}
          </button>
          <button className="leave-observe-page-button" onClick={leavePage}>
            <IoExit size={60} />
          </button>
        </div>
      </main>
      {showModal && (
        <div className="observe-modal">
          <div className="observe-modal-content">
            <p>발표가 종료되었습니다!</p>
            <button onClick={() => setShowModal(false)}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
};


export default Observe;