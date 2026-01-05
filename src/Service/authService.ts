import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/auth';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data; // 여기서 access_token이 넘어옵니다.
  },
  signup: async (userData: {name: string; email: string; password: string; role: string}) => {
    const response = await axios.post(`${API_URL}/signup`, userData);
    return response.data;
  }
};