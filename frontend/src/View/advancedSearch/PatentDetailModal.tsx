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

  // fullData가 있으면 사용, 없으면 data 직접 사용
  let patentData = data.fullData || data;
  
  // 데이터 변환 로직 (테이블용 데이터만 넘어왔을 경우 대비)
  if (!data.fullData && data.summary) {
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
      ...data
    };
  }

  // 발명자 텍스트 처리
  const inventorsArray = patentData.inventors || [];
  const inventorsText = Array.isArray(inventorsArray) && inventorsArray.length > 0
    ? inventorsArray.map((v: any) => (typeof v === 'string' ? v : v?.name || '')).filter(Boolean).join(', ')
    : '-';



  // 대리인 텍스트 처리
  const agentInfoArray = patentData.agentInfo || [];
  const agentInfoText = Array.isArray(agentInfoArray) && agentInfoArray.length > 0
    ? agentInfoArray.map((agent: any) => agent?.name || agent?.engName || '').filter(Boolean).join(', ')
    : '-';
  
  const ipcArray = patentData.ipcCodes || [];
  const cpcArray = patentData.cpcCodes || [];
  const ipcText = ipcArray.length > 0 ? ipcArray.join(', ') : '-';

  // CPC 렌더링 함수
  const renderCPCSettings = () => {
    if (!Array.isArray(cpcArray) || cpcArray.length === 0) return '-';
    const isSameAsIPC = cpcArray.every(cpc => ipcArray.includes(cpc)) && cpcArray.length === ipcArray.length;

    if (isSameAsIPC) {
      return <Text type="secondary" style={{ fontSize: '13px' }}>{cpcArray.join(', ')} <Tag style={{ marginLeft: '8px' }}>IPC와 동일</Tag></Text>;
    }
    return <Space wrap>{cpcArray.map((cpc, idx) => <Tag color="purple" key={idx}>{cpc}</Tag>)}</Space>;
  };

  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={onClose}
      zIndex={3000}
      width={1200}
      style={{ top: 20 }}
      styles={{ 
        body: { padding: '24px', backgroundColor: 'var(--bg)', color: 'var(--text)' },
      }}
      footer={[
        <Button key="pdf" type="primary" danger icon={<FilePdfOutlined />} onClick={onPdfOpen}>
          특허공보 (PDF)
        </Button>,
        <Button key="close" onClick={onClose}>닫기</Button>
      ]}
    >
      {/* 1. 헤더 영역 */}
      <div style={{ marginBottom: '20px' }}>
        <Title level={4} style={{ margin: 0, color: 'var(--text)' }}>
          {patentData.title?.ko || patentData.title || '제목 없음'}
        </Title>
        <Text type="secondary" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
          {patentData.title?.en || ''}
        </Text>
      </div>

      {/* 2. 상단 요약 바 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderRight: '1px solid var(--border)' }}>
          <div style={{ width: '120px', backgroundColor: 'var(--bg-sub)', padding: '12px', fontWeight: 'bold', color: 'var(--text)' }}>책임연구자</div>
          <div style={{ padding: '12px', color: 'var(--text)' }}>
            {(() => {
              const invs = patentData.inventors || [];
              if (invs.length > 0) {
                const first = typeof invs[0] === 'string' ? invs[0] : invs[0]?.name || '';
                return `${first}${invs.length > 1 ? ` 외 ${invs.length - 1}명` : ''}`;
              }
              return '-';
            })()}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: '120px', backgroundColor: 'var(--bg-sub)', padding: '12px', fontWeight: 'bold', color: 'var(--text)' }}>소속(출원인)</div>
          <div style={{ padding: '12px', color: 'var(--text)' }}>{patentData.applicant?.name || patentData.applicant || '-'}</div>
        </div>
      </div>

      {/* 3. 메인 컨텐츠 탭 */}
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
                  <Tag color={patentData.status === '등록' ? 'green' : 'blue'}>{patentData.status || '공개'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="출원번호(출원일)">{patentData.applicationNumber} ({patentData.applicationDate})</Descriptions.Item>
                <Descriptions.Item label="공개번호(공개일)">{patentData.openNumber || '-'} ({patentData.publicationDate || '-'})</Descriptions.Item>
                <Descriptions.Item label="등록번호(등록일)" span={2}>{patentData.registrationNumber || '-'} ({patentData.registrationDate || '-'})</Descriptions.Item>
                <Descriptions.Item label="요약" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{patentData.abstract || '요약 정보가 없습니다.'}</div>
                </Descriptions.Item>
                <Descriptions.Item label="대표청구항" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap', padding: '12px', backgroundColor: 'var(--bg-sub)', borderRadius: '4px' }}>
                    {patentData.representativeClaim || '내용 없음'}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="IPC" span={2}>{ipcText}</Descriptions.Item>
                <Descriptions.Item label="CPC" span={2}>{renderCPCSettings()}</Descriptions.Item>
                <Descriptions.Item label="발명자" span={2}>{inventorsText}</Descriptions.Item>
                <Descriptions.Item label="대리인" span={2}>{agentInfoText}</Descriptions.Item>
              </Descriptions>

              {/* 하단 상세 섹션: 패밀리 및 연구사업 정보 */}
              <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '32px' }}>
                {/* 1. 패밀리정보 (KR) */}
                <div>
                  <Title level={5} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', color: 'var(--text)' }}>
                    <span style={{ width: '4px', height: '16px', backgroundColor: '#1890ff', marginRight: '8px', display: 'inline-block' }}></span>
                    패밀리정보 
                  </Title>
                  <Table 
                    size="small" 
                    columns={[
                      { title: '출원번호', dataIndex: 'familyApplicationNumber', width: 180 }
                    ]}
                    dataSource={patentData.familyInfo || []} 
                    locale={{ emptyText: '자국 패밀리 정보가 없습니다.' }} 
                    bordered pagination={false} 
                  />
                </div>

                {/* 2. 글로벌 패밀리 */}
                <div>
                  <Title level={5} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', color: 'var(--text)' }}>
                    <span style={{ width: '4px', height: '16px', backgroundColor: '#52c41a', marginRight: '8px', display: 'inline-block' }}></span>
                    글로벌 패밀리 (DOCDB)
                  </Title>
                  <Table 
                    size="small" 
                    columns={[
                      { title: '국가', dataIndex: 'applicationCountryCode', width: 80 },
                      { title: '출원번호', dataIndex: 'applicationNumber', width: 180 },
                      { title: '출원일', dataIndex: 'applicationDate', width: 120 },
                      { title: '공개번호', dataIndex: 'publicationNumber', width: 180 },
                      { title: '공개일', dataIndex: 'publicationDate', width: 120 },
                      { title: '종류', dataIndex: 'publicationKindCode', width: 80 }
                    ]}
                    dataSource={patentData.docdbFamily || []} 
                    locale={{ emptyText: '글로벌 패밀리 정보가 없습니다.' }} 
                    bordered pagination={false} 
                  />
                </div>

                {/* 3. 국가연구개발사업 */}
                <div>
                  <Title level={5} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', color: 'var(--text)' }}>
                    <span style={{ width: '4px', height: '16px', backgroundColor: '#722ed1', marginRight: '8px', display: 'inline-block' }}></span>
                    국가연구개발사업
                  </Title>
                  <Table 
                    size="small" 
                    columns={[
                      { title: '과제고유번호', dataIndex: 'projectNo', width: 150 },
                      { title: '부처명', dataIndex: 'department', width: 120 },
                      { title: '주관기관', dataIndex: 'projectName' },
                      { title: '연구기관', dataIndex: 'taskName' },
                      { title: '과제명', dataIndex: 'institution', width: 150 }
                    ]}
                    dataSource={patentData.nationalProjects || []} 
                    locale={{ emptyText: '관련 국가연구개발사업 정보가 없습니다.' }} 
                    bordered pagination={false} 
                  />
                </div>
              </Space>
            </div>
          )
        },
        { 
          label: '기술분석', 
          key: '2', 
          children: <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>데이터 분석 중입니다.</div> 
        },
      ]} />
    </Modal>
  );
};

export default PatentDetailModal;