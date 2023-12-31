import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import { GoDotFill } from "react-icons/go";

const Result = () => {
  const [data, setData] = useState(null);
  const videoRef = useRef(null);

  const params = new URLSearchParams(window.location.search);
  const title = params.get('title');
  const userId = params.get('userId');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_SITE_URL}/presentation/?title=${title}&userId=${userId}`);
        setData(response.data);
        console.log(response);
      } catch (error) {
        console.log('An error occurred:', error);
      }
    };
    fetchData();
  }, [title, userId]);

  function highlightWords(script, recommendedWords, forbiddenWords) {
    let resultScript = script;
    for (const wordObj of recommendedWords) {
      const word = wordObj.word;
      const regExp = new RegExp(`${word}`, 'gi');
      resultScript = resultScript.replace(regExp, `<span class='highlight-recommended'>${word}</span>`);
    }

    for (const wordObj of forbiddenWords) {
      const word = wordObj.word;
      const regExp = new RegExp(`${word}`, 'gi');
      resultScript = resultScript.replace(regExp, `<span class='highlight-forbidden'>${word}</span>`);
    }

    return resultScript;
  }

  const formatTime = (time) => {
    const minutes = String(Math.floor(time / 60)).padStart(2, '0');
    const seconds = String(Math.floor(time % 60)).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };


  const handleVideoSeek = (time) => {
    videoRef.current.currentTime = time;
  };

  return (
    <div className="detail-container">
      {data ? (
        <>
          <div className="left-column">
            <h1>녹화 영상</h1>
            <video ref={videoRef} muted controls className='result-video' width={550}>
              <source src={data.resultVideo} type='video/webm' />
              {/* 이하에 필요한 다른 영상 포맷의 소스를 추가할 수 있습니다. */}
            </video>
          </div>
          <div className="right-column">
            <div className='result-page-comment-container'>
              <h1 className='result-detail-page-title'>유저 코멘트</h1>
              <div className='result-comment-detail'>
                {data.comment.map((user, index) => (
                  <div key={index} className="user-comment-card">
                    <div className='comment-name-time-container'>
                      <GoDotFill className='comment-dot' size={50} />
                      <div className='comment-name-area'>{user.name}</div>
                      <div className='comment-time-area' onClick={() => handleVideoSeek(user.time.minute * 60 + user.time.second)}>
                        <div>{formatTime(user.time.minute * 60 + user.time.second)}</div>
                      </div>
                    </div>
                    <div className='comment-message-area'>
                      {user.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className='result-page-timer-container'>
              <h1 className='result-detail-page-title'>상세 경과 시간</h1>
              <div className='total-time-bar' style={{ display: 'flex', flexDirection: 'column' }}>
                <div className='total-time' style={{ width: '100%', backgroundColor: 'blue', color: 'white' }}>
                  <span>{formatTime(data.progressingTime.minute * 60 + data.progressingTime.second)}</span>
                </div>
                <div className='result-timer-detail' style={{ overflowY: 'scroll', flex: 1 }}>
                  {data.pdfTime.map((time, index) => (
                    <div className='detail-timer-card' key={index} style={{ marginBottom: '10px' }}>
                      <GoDotFill className='dot' />
                      <div className='detail-page-area'>{index + 1} 페이지</div>
                      <div className='detail-time-area' style={{ height: '20px', backgroundColor: 'blue', color: 'white' }}>
                        <span>{formatTime(time.minutes * 60 + time.seconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='result-page-script-container'>
              <h1 className='result-detail-page-title'>음성 데이터</h1>
              <div>
                <h2 className='recommend-word'>강조단어</h2>
                {data.recommendedWord.map((word, index) => (
                  <div key={index} className='recommend-word-card'>
                    <GoDotFill className='dot' />
                    <span className='recommend-word-detail'>{word.word}</span> :
                    <span className='recommend-word-count'>{word.count}회</span>
                  </div>
                ))}
              </div>
              <div>
                <h2 className='forbidden-word'>금지단어</h2>
                {data.forbiddenWord.map((word, index) => (
                  <div key={index} className='forbidden-word-card'>
                    <GoDotFill className='dot' />
                    <span className='forbidden-word-detail'>{word.word}</span> :
                    <span className='forbidden-word-count'>{word.count}회</span>
                  </div>
                ))}
              </div>
              <h2 className='voice-change-result'>음성 텍스트 변환 결과</h2>
              <div className='result-script-detail' dangerouslySetInnerHTML={{ __html: highlightWords(data.sttScript, data.recommendedWord, data.forbiddenWord) }}></div>
            </div>

            <div className='result-page-question-container'>
              <h1 className='result-detail-page-title'>예상 질문 및 답변</h1>
              <div className='result-question-detail' style={{ whiteSpace: 'pre-wrap' }}>{data.qna}</div>
            </div>
          </div>
        </>) : (
        <div>로딩 중...</div>
      )
      }
    </div >
  )
}

export default Result