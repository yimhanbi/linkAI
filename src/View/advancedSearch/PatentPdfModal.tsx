import React from 'react';
import { Modal, Result, Button } from 'antd';

interface PatentPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  appNo: string | undefined;
}

const PatentPdfModal: React.FC<PatentPdfModalProps> = ({ isOpen, onClose, appNo }) => {
  // 실제 연동 시: const pdfUrl = `https://api.patent.go.kr/viewer/${appNo}`;
  const isApiConnected = false; // 현재 연동 전 상태

  return (
    <Modal
      title={`특허공보 PDF - ${appNo || ''}`}
      open={isOpen}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      footer={null}
      styles={{ body: { height: '85vh', padding: 0 } }}
      destroyOnClose
    >
      {isApiConnected ? (
        <iframe
          src={`/pdf-viewer-placeholder.html?no=${appNo}`}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          title="Patent PDF"
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Result
            status="404"
            title="PDF API 연동 준비 중"
            subTitle={`출원번호 [${appNo}]에 대한 PDF 뷰어 API 연동이 필요합니다.`}
            extra={<Button onClick={onClose}>닫기</Button>}
          />
        </div>
      )}
    </Modal>
  );
};

export default PatentPdfModal;