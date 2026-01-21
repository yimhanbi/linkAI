import React from 'react';
import { Modal, Result, Button } from 'antd';
import { API_BASE_URL } from '@/Service/apiBaseUrl';

interface PatentPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  appNo: string | undefined;
  pdfPath?: string; // DB에서 가져온 /static/pdfs/... 경로
}

const PatentPdfModal: React.FC<PatentPdfModalProps> = ({ isOpen, onClose, appNo, pdfPath }) => {
  // 백엔드 서버 주소 (FastAPI 8000 포트 기준)
  const BASE_URL: string = API_BASE_URL;
  
  // 전체 URL 조합
  const fullPdfUrl = pdfPath ? `${BASE_URL}${pdfPath}` : null;

  return (
    <Modal
      title={`특허공보 PDF - ${appNo || ''}`}
      open={isOpen}
      onCancel={onClose}
      zIndex={3000}
      width="95%"
      style={{ top: 20 }}
      footer={null}
      styles={{ body: { height: '85vh', padding: 0 } }}
      destroyOnClose
    >
      {fullPdfUrl ? (
        <iframe
          src={fullPdfUrl}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          title="Patent PDF Viewer"
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Result
            status="warning"
            title="PDF 파일을 찾을 수 없습니다"
            subTitle={`출원번호 [${appNo}]에 해당하는 로컬 PDF 파일이 서버에 존재하지 않습니다.`}
            extra={<Button type="primary" onClick={onClose}>닫기</Button>}
          />
        </div>
      )}
    </Modal>
  );
};

export default PatentPdfModal;