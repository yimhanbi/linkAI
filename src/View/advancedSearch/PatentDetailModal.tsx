import React from 'react';
import { Modal, Typography, Button, Descriptions, Tabs, Table, Space } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface PatentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onPdfOpen: () => void;
}

const PatentDetailModal: React.FC<PatentDetailModalProps> = ({ isOpen, onClose, data, onPdfOpen }) => {
  if (!data) return null;

  // 패밀리 정보 및 국가연구개발사업 테이블 컬럼 정의 (필요 시 사용)
  const familyColumns = [
    { title: 'NO', dataIndex: 'key', width: 60, align: 'center' as const },
    { title: '국가', dataIndex: 'country', width: 80, align: 'center' as const },
    { title: '특허번호', dataIndex: 'patentNo', width: 180 },
    { title: '발명의 명칭', dataIndex: 'title' },
  ];

  const projectColumns = [
    { title: 'NO', dataIndex: 'key', width: 60, align: 'center' as const },
    { title: '부처명', dataIndex: 'dept', width: 120 },
    { title: '주관기관', dataIndex: 'leadOrg', width: 150 },
    { title: '연구기관', dataIndex: 'researchOrg', width: 150 },
    { title: '과제명', dataIndex: 'projectName' },
  ];

  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={onClose}
      width={1200}
      style={{ top: 20 }}
      styles={{ body: { padding: '24px' } }}
      footer={[
        <Button key="pdf" type="primary" danger icon={<FilePdfOutlined />} onClick={onPdfOpen}>
          특허공보 (PDF)
        </Button>,
        <Button key="close" onClick={onClose}>닫기</Button>
      ]}
    >
      {/* 헤더 영역 */}
      <div style={{ marginBottom: '20px' }}>
        <Title level={4} style={{ margin: 0 }}>{data.title}</Title>
        <Text type="secondary" style={{ fontSize: '12px' }}>{data.titleEn || ''}</Text>
      </div>

      {/* 상단 요약 바 (책임연구자 / 소속) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #f0f0f0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ width: '100px', backgroundColor: '#f9f9f9', padding: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>책임연구자</div>
          <div style={{ padding: '12px', display: 'flex', alignItems: 'center' }}>{data.inventor}</div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: '100px', backgroundColor: '#f9f9f9', padding: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>소속</div>
          <div style={{ padding: '12px', display: 'flex', alignItems: 'center' }}>{data.affiliation}</div>
        </div>
      </div>

      <Tabs type="card" items={[
        {
          label: '특허정보',
          key: '1',
          children: (
            <div style={{ maxHeight: '650px', overflowY: 'auto', paddingRight: '8px' }}>
              <Descriptions 
                bordered 
                column={2} 
                size="small" 
                labelStyle={{ width: '160px', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}
              >
                <Descriptions.Item label="국가">{data.country}</Descriptions.Item>
                <Descriptions.Item label="행정상태">{data.status}</Descriptions.Item>
                <Descriptions.Item label="출원번호(출원일)">{data.appNo} ({data.appDate})</Descriptions.Item>
                <Descriptions.Item label="공개번호(공개일)">{data.pubNo || '-'} ({data.pubDate || '-'})</Descriptions.Item>
                <Descriptions.Item label="등록번호(등록일)">{data.regNo || '-'}</Descriptions.Item>
                <Descriptions.Item label="우선권정보">{data.priorityInfo || '-'}</Descriptions.Item>
                <Descriptions.Item label="존속기간만료일">{data.expiryDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="연차료납부">{data.feeStatus || '-'}</Descriptions.Item>
                <Descriptions.Item label="출원인" span={2}>{data.applicant || data.affiliation}</Descriptions.Item>
                <Descriptions.Item label="최종권리자" span={2}>{data.owner || '-'}</Descriptions.Item>
                
                {/* 요약 */}
                <Descriptions.Item label="요약" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', minHeight: '50px' }}>{data.summary}</div>
                </Descriptions.Item>

                {/* 대표청구항 */}
                <Descriptions.Item label="대표청구항" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', minHeight: '50px' }}>{data.mainClaim || '내용 없음'}</div>
                </Descriptions.Item>

                {/* 기술 분류 및 상세 정보 */}
                <Descriptions.Item label="IPC" span={2}>{data.ipc || '-'}</Descriptions.Item>
                <Descriptions.Item label="CPC" span={2}>{data.cpc || '-'}</Descriptions.Item>
                <Descriptions.Item label="발명자" span={2}>{data.inventors || data.inventor}</Descriptions.Item>
                <Descriptions.Item label="대리인" span={2}>{data.agent || '-'}</Descriptions.Item>
                <Descriptions.Item label="심사청구여부(일자)">{data.reviewStatus || '-'}</Descriptions.Item>
                <Descriptions.Item label="심사청구항수">{data.claimCount || '-'}</Descriptions.Item>
              </Descriptions>

              {/* 하단 패밀리/국가연구사업 정보 (필요 시 테이블 데이터 연결) */}
              <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '32px' }}>
                <div>
                  <Title level={5} style={{ marginBottom: '12px' }}>패밀리정보</Title>
                  <Table size="small" columns={familyColumns} dataSource={[]} locale={{ emptyText: '정보 없음' }} bordered pagination={false} />
                </div>
                <div>
                  <Title level={5} style={{ marginBottom: '12px' }}>DOCDB 패밀리</Title>
                  <Table size="small" columns={familyColumns} dataSource={[]} locale={{ emptyText: '정보 없음' }} bordered pagination={false} />
                </div>
                <div>
                  <Title level={5} style={{ marginBottom: '12px' }}>국가연구개발사업</Title>
                  <Table size="small" columns={projectColumns} dataSource={[]} locale={{ emptyText: '정보 없음' }} bordered pagination={false} />
                </div>
              </Space>
            </div>
          )
        },
        { label: '기술분석', key: '2', children: <div style={{ padding: '40px', textAlign: 'center' }}>데이터 분석 중입니다.</div> },
        { label: '적용제품', key: '3', children: <div style={{ padding: '40px', textAlign: 'center' }}>준비 중입니다.</div> },
        { label: '시장분석', key: '4', children: <div style={{ padding: '40px', textAlign: 'center' }}>준비 중입니다.</div> },
        { label: '수요기업', key: '5', children: <div style={{ padding: '40px', textAlign: 'center' }}>준비 중입니다.</div> },
        { label: 'TRL', key: '6', children: <div style={{ padding: '40px', textAlign: 'center' }}>준비 중입니다.</div> },
      ]} />
    </Modal>
  );
};

export default PatentDetailModal;