import axios from "axios";
import type { AxiosInstance } from "axios";

export interface FetchPatentsParams {
  tech_q?: string;
  prod_q?: string;
  inventor?: string;
  applicant?: string;
  app_num?: string;
  status?: string | string[]; // 법적 상태 (단일 또는 배열)
  page?: number;
  limit?: number;
}

export interface PatentSearchResponse {
  total: number;
  page: number;
  limit: number;
  data: any[];
  engine: string;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 30000
});

export async function fetchPatents(params: FetchPatentsParams): Promise<PatentSearchResponse> {
  const queryParams: FetchPatentsParams = {
    ...params,
    page: params.page ?? 1,
    limit: params.limit ?? 10000
  };

  const response = await apiClient.get<PatentSearchResponse>("/api/patents", {
    params: queryParams
  });

  return response.data;
}

