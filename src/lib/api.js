import axios from 'axios'

// 개발: Vite 프록시가 /api/* → http://localhost:4000/api/* 로 전달
// 프로덕션: Nginx가 /api/* → Express 로 전달
// baseURL 없이 동일 origin의 /api/* 를 호출하면 양쪽 다 동작
const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

export default api
