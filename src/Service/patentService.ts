// src/services/patentService.ts
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const fetchPatents = async (params: any) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/patents/`, {
      params: params, // 쿼리 파라미터로 techKw, appNo 등이 전달됩니다.
    });
    return response.data;
  } catch (error) {
    console.error("데이터 로드 실패:", error);
    throw error;
  }
};