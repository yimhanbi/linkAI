import React from 'react';
import { Modal, Typography, Button, Descriptions, Tabs, Table, Space, Tag } from 'antd';
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

  // 디버깅: 데이터 구조 확인
  console.log('PatentDetailModal received data:', data);
  console.log('Has fullData?', !!data.fullData);
  
  // fullData가 있으면 fullData 사용, 없으면 data 직접 사용
  // 하지만 data가 테이블용 간소화 데이터인 경우, 필드 매핑 필요
  let patentData = data.fullData || data;
  
  // fullData가 없는 경우 (테이블용 데이터만 있는 경우) 필드 매핑
  if (!data.fullData && data.summary) {
    // 테이블용 간소화 데이터를 MongoDB 스키마 형태로 변환
    patentData = {
      applicationNumber: data.appNo,
      applicationDate: data.appDate,
      status: data.status,
      title: typeof data.title === 'string' ? { ko: data.title, en: null } : data.title,
      abstract: data.summary,
      representativeClaim: data.mainClaim || '',
      inventors: data.inventor ? [{ name: data.inventor, country: null }] : [],
      applicant: data.affiliation ? { name: data.affiliation, country: null } : null,
      claims: [],
      ipcCodes: [],
      cpcCodes: [],
      ...data  // 나머지 필드 유지
    };
  }
  
  // 디버깅: patentData 구조 확인
  console.log('PatentData being used:', patentData);
  console.log('Inventors:', patentData.inventors);
  console.log('Applicant:', patentData.applicant);
  console.log('Abstract:', patentData.abstract);
  console.log('Claims:', patentData.claims);

  // 발명자 배열을 문자열로 변환 
  // MongoDB 스키마: inventors는 Array<{ name: string, country: string | null }>
  const inventorsArray = patentData.inventors || [];
  const inventorsText = Array.isArray(inventorsArray) && inventorsArray.length > 0
    ? inventorsArray.map((v: any) => {
        if (typeof v === 'string') return v;
        return v?.name || v?.name || '';
      }).filter(Boolean).join(', ')
    : '-';
  
  // 1. IPC와 CPC 배열 가져오기
  const ipcArray = patentData.ipcCodes || [];
  const cpcArray = patentData.cpcCodes || [];

  // 2. IPC 문자열 생성
  const ipcText = Array.isArray(ipcArray) && ipcArray.length > 0
    ? ipcArray.filter(Boolean).join(', ')
    : '-';

  // 3. CPC 구분 출력 로직
  // IPC와 완전히 똑같은 값들만 있다면 "IPC와 동일"로 표시하고, 
  // 더 상세한 정보가 있다면 해당 코드를 출력합니다.
  const renderCPCSettings = () => {
    if (!Array.isArray(cpcArray) || cpcArray.length === 0) return '-';

    // 모든 CPC 코드가 IPC 배열에 포함되어 있는지 확인
    const isSameAsIPC = cpcArray.every(cpc => ipcArray.includes(cpc)) && cpcArray.length === ipcArray.length;

    if (isSameAsIPC) {
      return (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {cpcArray.join(', ')} <Tag style={{ marginLeft: '8px' }}>IPC와 동일</Tag>
        </Text>
      );
    }

    // CPC가 더 상세하거나 다를 경우 강조
    return (
      <Space wrap>
        {cpcArray.map((cpc, idx) => (
          <Tag color="purple" key={idx}>{cpc}</Tag>
        ))}
      </Space>
    );
  };

  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={onClose}
      width={1200}
      style={{ top: 20, backgroundColor: 'var(--bg)' }}
      styles={{ 
        body: { padding: '24px', backgroundColor: 'var(--bg)', color: 'var(--text)' },
        header: { backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' },
        footer: { backgroundColor: 'var(--bg)', borderTop: '1px solid var(--border)' }
      }}
      footer={[
        <Button key="pdf" type="primary" danger icon={<FilePdfOutlined />} onClick={onPdfOpen}>
          특허공보 (PDF)
        </Button>,
        <Button key="close" onClick={onClose}>닫기</Button>
      ]}
    >
      {/* 헤더 영역 - MongoDB title.ko 참조 */}
      <div style={{ marginBottom: '20px' }}>
        <Title level={4} style={{ margin: 0, color: 'var(--text)' }}>{patentData.title?.ko || patentData.title || '제목 없음'}</Title>
        <Text type="secondary" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{patentData.title?.en || ''}</Text>
      </div>

      {/* 상단 요약 바 - 첫 번째 발명자와 출원인 표시 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderRight: '1px solid var(--border)' }}>
          <div style={{ width: '100px', backgroundColor: 'var(--bg-sub)', padding: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>책임연구자</div>
          <div style={{ padding: '12px', display: 'flex', alignItems: 'center', color: 'var(--text)' }}>
            {(() => {
              const inventors = patentData.inventors || [];
              if (Array.isArray(inventors) && inventors.length > 0) {
                const firstInventor = typeof inventors[0] === 'string' 
                  ? inventors[0] 
                  : inventors[0]?.name || '';
                const count = inventors.length;
                return `${firstInventor}${count > 1 ? ` 외 ${count - 1}명` : ''}`;
              }
              return '-';
            })()}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: '100px', backgroundColor: 'var(--bg-sub)', padding: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>소속(출원인)</div>
          <div style={{ padding: '12px', display: 'flex', alignItems: 'center', color: 'var(--text)' }}>
            {patentData.applicant?.name || patentData.applicant || '-'}
          </div>
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
                labelStyle={{ width: '160px', backgroundColor: 'var(--bg-sub)', fontWeight: 'bold', color: 'var(--text)' }}
                contentStyle={{ color: 'var(--text)' }}
              >
                <Descriptions.Item label="국가">KR</Descriptions.Item>
                <Descriptions.Item label="행정상태">
                  <Tag color={
                    patentData.status === '등록' ? 'green' : 
                    patentData.status === '공개' ? 'blue' : 
                    patentData.status === '거절' ? 'red' : 
                    patentData.status === '취하' ? 'default' : 
                    patentData.status === '소멸' ? 'orange' : 
                    patentData.status === '포기' ? 'purple' : 
                    'default'
                  }>
                    {patentData.status || '공개'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="출원번호(출원일)">
                  {patentData.applicationNumber || '-'} ({patentData.applicationDate || '-'})
                </Descriptions.Item>
                <Descriptions.Item label="공개번호(공개일)">
                  {patentData.openNumber || patentData.publicationNumber || '-'} ({patentData.publicationDate || '-'})
                </Descriptions.Item>
                <Descriptions.Item label="등록번호(등록일)">
                  {patentData.registrationNumber || '-'} ({patentData.registrationDate || '-'})
                </Descriptions.Item>
                <Descriptions.Item label="출원인" span={2}>{patentData.applicant?.name || '-'}</Descriptions.Item>
                
                {/* 요약 */}
                <Descriptions.Item label="요약" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', minHeight: '50px', color: 'var(--text)' }}>
                    {patentData.abstract || '요약 정보가 없습니다.'}
                  </div>
                </Descriptions.Item>

                {/* 대표청구항 */}
                <Descriptions.Item label="대표청구항" span={2}>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: '1.6', 
                    padding: '12px', 
                    backgroundColor: 'var(--bg-sub)', 
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)'
                  }}>
                    {patentData.representativeClaim || '내용 없음'}
                  </div>
                </Descriptions.Item>

                {/* 전체 청구항 (배열 활용) */}
                <Descriptions.Item label="전체 청구항" span={2}>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', color: 'var(--text)' }}>
                    {patentData.claims && patentData.claims.length > 0 ? (
                      patentData.claims.map((claim: string, idx: number) => (
                        <div key={idx} style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text)' }}>
                          {claim}
                        </div>
                      ))
                    ) : <span style={{ color: 'var(--text-sub)' }}>상세 청구항 정보가 없습니다.</span>}
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="IPC" span={2}>
                  <span style={{ color: 'var(--text)' }}>{ipcText}</span>
                </Descriptions.Item>
                <Descriptions.Item label="CPC" span={2}>
                  {renderCPCSettings()}
                </Descriptions.Item>
                <Descriptions.Item label="발명자" span={2}>
                  <span style={{ color: 'var(--text)' }}>{inventorsText}</span>
                </Descriptions.Item>
              </Descriptions>

              {/* 하단 패밀리/국가연구사업 정보 (현재 데이터에는 없으므로 비워둠) */}
              <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '32px' }}>
                <div>
                  <Title level={5} style={{ marginBottom: '12px', color: 'var(--text)' }}>패밀리정보</Title>
                  <Table size="small" dataSource={[]} locale={{ emptyText: '정보 없음' }} bordered pagination={false} />
                </div>
              </Space>
            </div>
          )
        },
        { label: '기술분석', key: '2', children: <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>데이터 분석 중입니다.</div> },
      ]} />
    </Modal>
  );
};

export default PatentDetailModal;
