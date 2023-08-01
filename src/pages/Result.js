import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { GoDotFill } from "react-icons/go";

const Result = () => {
  const [data, setData] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const title = params.get('title');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/presentation/?title=${title}`);
        setData(response.data);
        console.log(response);
      } catch (error) {
        console.log('An error occurred:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="detail-container">
      {data ? (
        <>
          <div className="left-column">
            <h1>녹화 영상</h1>
            <video muted controls className='result-video'></video>
          </div>
          <div className="right-column">
            <div className='result-page-comment-container'>
              <h1 className='result-detail-page-title'>유저 코멘트</h1>
              <div className='result-comment-detail'>
                {data.comment.map((user, index) => ( // 중괄호로 감싸기
                  <div key={index} className="user-comment-card">
                    <div className='comment-name-time-container'>
                      <div className='comment-name-area'>{user.name}</div>
                      <div className='comment-time-area'>
                        <div>0{user.time.minute} : {user.time.second}</div>
                      </div>
                    </div>
                    <div className='comment-message-area'>
                      {user.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <hr />
            <div className='result-page-timer-container'>
              <h1 className='result-detail-page-title'>상세 경과 시간</h1>
              <div className='total-time-area'><span>0{data.progressingTime.minute}:{data.progressingTime.second}</span> / <span>0{data.settingTime.minute}:{data.settingTime.second}</span></div>
              <div className='result-timer-detail'>
                {data.pdfTime.map((time, index) => (
                  <div className='detail-timer-card'>
                    <GoDotFill className='dot' />
                    <div className='detail-page-area'>{index + 1} 페이지</div>
                    <div className='detail-time-area'>
                      <span>0{time.minutes}</span>:
                      <span>{time.seconds}</span>
                    </div>
                  </div>
                ))}

              </div>
            </div>
            <hr />
            <div className='result-page-eye-container'>
              <h1 className='result-detail-page-title'>시선 처리</h1>
              <div className='result-eye-detail'>
                <div>
                  <GoDotFill className='dot' />
                  <div>
                    청중 응시
                  </div>
                  <div className='detail-time-area'>
                    <span>00</span>:
                    <span>00</span>
                  </div>
                </div>
              </div>
              <div className='result-eye-detail'>
                <div>
                  <GoDotFill className='dot' />
                  <div>
                    자료 응시
                  </div>
                  <div className='detail-time-area'>
                    <span>00</span>:
                    <span>00</span>
                  </div>
                </div>
              </div>
            </div>
            <hr />
            <div className='result-page-script-container'>
              <h1 className='result-detail-page-title'>음성 데이터</h1>
              <div>
                <h2 className='recommend-word'>권장단어</h2>
                {data.recommendedWord.map((word, index) => (
                  <div key={index} className='recommend-word-card'>
                    <GoDotFill className='dot' />
                    <span className='recommend-word-detail'>{word.word} : </span>
                    <span className='recommend-word-count'>{word.count}회</span>
                  </div>
                ))}
              </div>
              <div>
                <h2 className='forbidden-word'>금지단어</h2>
                {data.forbiddenWord.map((word, index) => (
                  <div key={index} className='forbidden-word-card'>
                    <GoDotFill className='dot' />
                    <span className='forbidden-word-detail'>{word.word} : </span>
                    <span className='forbidden-word-count'>{word.count}회</span>
                  </div>
                ))}
              </div>
              <div className='result-script-detail'>{data.sttScript}</div>
            </div>
            <hr />
            <div className='result-page-question-container'>
              <h1 className='result-detail-page-title'>예상 질문 및 답변</h1>
              <div className='result-question-detail'>{data.qna}</div>
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
