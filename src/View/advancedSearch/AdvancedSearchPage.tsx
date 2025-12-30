import { Form, Input, Button, Card, Table, Tag, Space, Typography, Tabs, message, Skeleton } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useState, useContext, useMemo } from 'react';
import { ThemeContext } from '../../shared/theme/ThemeContext';
import PatentDetailModal from './PatentDetailModal';
import PatentPdfModal from './PatentPdfModal';
import { fetchPatents } from '../../Service/ip/patentService';

const { Title, Text } = Typography;

export default function AdvancedSearchPage() {
  const [form] = Form.useForm();
  const { theme } = useContext(ThemeContext);

  // 상태 관리
  const [dataSource, setDataSource] = useState<any[]>([]); // 검색 결과 리스트
  const [loading, setLoading] = useState(false);          // 로딩 상태
  const [activeTab, setActiveTab] = useState('all');      // 탭 상태
  const [stats, setStats] = useState({                    // 통계 수치
    total: 0, KR: 0, US: 0, EP: 0, JP: 0, CN: 0, PCT: 0, etc: 0
  });
  const [currentPage, setCurrentPage] = useState(1);      // 현재 페이지
  const [pageSize, setPageSize] = useState(10);          // 페이지당 항목 수
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); // 선택된 행의 키
  const [selectedRows, setSelectedRows] = useState<any[]>([]); // 선택된 행 데이터

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [currentPatent, setCurrentPatent] = useState<any | null>(null);

  //  탭에 따른 데이터 필터링 로직
  const filteredData = useMemo(() => {
    let data = dataSource;
    if (activeTab === 'kr') {
      data = dataSource.filter(item => item.country === 'KR');
    } else if (activeTab === 'overseas') {
      data = dataSource.filter(item => item.country !== 'KR');
    }
    return data;
  }, [dataSource, activeTab]);

  // 페이지네이션을 위한 데이터 슬라이싱
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const onReset = () => {
    form.resetFields();
    setDataSource([]);
    setStats({ total: 0, KR: 0, US: 0, EP: 0, JP: 0, CN: 0, PCT: 0, etc: 0 });
    setSelectedRowKeys([]);
    setSelectedRows([]);
    message.info('검색 조건이 초기화되었습니다.');
  };

  // AND/OR 연산자 추가 함수
  const handleOperator = (fieldName: string, operator: 'AND' | 'OR') => {
    const currentValue = form.getFieldValue(fieldName) || '';
    const trimmedValue = currentValue.trim();
    
    // 현재 값이 있고 마지막이 공백이 아니면 공백 추가
    const newValue = trimmedValue 
      ? (trimmedValue.endsWith(' AND') || trimmedValue.endsWith(' OR') 
          ? trimmedValue + ` ${operator} ` 
          : trimmedValue + ` ${operator} `)
      : '';
    
    form.setFieldsValue({ [fieldName]: newValue });
    
    // 입력 필드에 포커스
    setTimeout(() => {
      const inputElement = document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        // 커서를 끝으로 이동
        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
      }
    }, 0);
  };

  // 2. 다운로드 버튼 핸들러
  const handleDownload = async () => {
    if (selectedRows.length === 0) {
      message.warning('다운로드할 특허를 선택해주세요.');
      return;
    }

    try {
      // xlsx를 동적으로 import
      const XLSX = await import('xlsx');

      // 선택된 행 데이터를 엑셀 형식으로 변환
      const excelData = selectedRows.map((item, index) => ({
        'NO': index + 1,
        '국가': item.country || 'KR',
        '상태': item.status || '공개',
        '출원번호': item.appNo || '',
        '출원일': item.appDate || '',
        '발명의 명칭': item.title || '',
        '책임연구자': item.inventor || '',
        '소속': item.affiliation || ''
      }));

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 컬럼 너비 설정
      const columnWidths = [
        { wch: 5 },   // NO
        { wch: 8 },   // 국가
        { wch: 10 },  // 상태
        { wch: 18 },  // 출원번호
        { wch: 12 },  // 출원일
        { wch: 50 },  // 발명의 명칭
        { wch: 15 },  // 책임연구자
        { wch: 30 }   // 소속
      ];
      worksheet['!cols'] = columnWidths;

      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '특허리스트');

      // 파일명 생성 (현재 날짜 포함)
      const fileName = `특허검색결과_${new Date().toLocaleDateString('ko-KR').replace(/\//g, '-')}.xlsx`;

      // 파일 다운로드
      XLSX.writeFile(workbook, fileName);
      
      message.success(`${selectedRows.length}건의 특허 정보가 다운로드되었습니다.`);
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      message.error('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 3. 테이블 컬럼 정의
  const columns = [
    { title: 'NO', dataIndex: 'key', key: 'no', width: 60, align: 'center' as const },
    { title: '국가', dataIndex: 'country', key: 'country', width: 80, align: 'center' as const },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={status === '공개' ? 'blue' : (status === '등록' ? 'green' : 'default')} style={{ borderRadius: '4px' }}>
          {status || '없음'}
        </Tag>
      )
    },
    {
      title: '출원번호',
      dataIndex: 'appNo',
      key: 'appNo',
      width: 150,
      render: (_text: string, record: any) => (
        <button
          type="button"
          style={{ color: '#1890ff', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          onClick={() => handleShowDetail(record)}
        >
          {record.appNo}
        </button>
      )
    },
    { title: '출원일', dataIndex: 'appDate', key: 'appDate', width: 120 },
    {
      title: '발명의 명칭',
      dataIndex: 'title',
      key: 'title',
      render: (_text: string, record: any) => (
        <span
          style={{ cursor: 'pointer', fontWeight: 600 }}
          onClick={() => handleShowDetail(record)}
        >
          {record.title}
        </span>
      )
    },
    { title: '책임연구자', dataIndex: 'inventor', key: 'inventor', width: 120, align: 'center' as const },
    { title: '소속', dataIndex: 'affiliation', key: 'affiliation', width: 150 },
  ];

  const handleShowDetail = (record: any) => {
    setCurrentPatent(record);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  const handleOpenPdf = () => {
    setIsPdfOpen(true);
  };

  const handleClosePdf = () => {
    setIsPdfOpen(false);
  };

  // 4. 검색 실행 함수
  const onFinish = async (values: any) => {
    setLoading(true);
    setCurrentPage(1); // 검색 시 첫 페이지로 리셋
    try {
      //API 호출 (파라미터명은 백엔드의 tech_q, prod_q 등에 맞춰 전달)
      // limit을 크게 설정하여 전체 데이터를 가져옴 (또는 서버 사이드 페이지네이션 구현)
      const response = await fetchPatents({
        tech_q: values.techKw,
        prod_q: values.prodKw,
        inventor: values.inventor,
        applicant: values.affiliation,
        app_num: values.appNo,
        page: 1,
        limit: 10000 // 전체 데이터를 가져오기 위해 큰 값 설정
      }); 

      //  데이터 매핑 (백엔드 필드명을 UI 컬럼명으로 변환)
      const patentList = response.data.map((item: any, index: number) => ({
        key: index + 1,
        country: item.countryCode || 'KR', // 백엔드 필드명 확인 필요
        status: item.status || '공개',
        appNo: item.applicationNumber,
        appDate: item.applicationDate || item.appDate || item.application_date || "-",
        title: item.title?.ko || item.title, // 다국어 필드 처리
        inventor: item.inventors?.[0]?.name || item.inventor,
        affiliation: item.applicant?.name || item.affiliation
      }));

      setDataSource(patentList);
      
      // 3. 통계 수치 업데이트 (현재 백엔드 응답에 stats가 없다면 total로 대체)
      setStats({
        total: response.total,
        KR: response.total, // 임시: 상세 통계 API가 없다면 전체 수치 활용
        US: 0, EP: 0, JP: 0, CN: 0, PCT: 0, etc: 0
      });

      message.success(`검색 결과 ${response.total}건을 불러왔습니다.`);
    } catch (error) {
      console.error('검색 실패:', error);
      message.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  // 5. 동적 통계 바 컴포넌트
  const StatisticsBar = () => (
    <Space size="large" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap' }}>
      <Text>결과 <b style={{ color: '#1890ff' }}>{filteredData.length.toLocaleString()}</b> 건</Text>
      <div style={{ width: 1, height: 14, background: '#ddd', margin: '0 8px' }} />
      <Text type="secondary">한국 <b>{stats.KR.toLocaleString()}</b></Text>
      <Text type="secondary">미국 <b>{stats.US.toLocaleString()}</b></Text>
      <Text type="secondary">EP <b>{stats.EP.toLocaleString()}</b></Text>
      <Text type="secondary">일본 <b>{stats.JP.toLocaleString()}</b></Text>
      <Text type="secondary">중국 <b>{stats.CN.toLocaleString()}</b></Text>
      <Text type="secondary">PCT <b>{stats.PCT.toLocaleString()}</b></Text>
    </Space>
  );

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px', textAlign: 'left' }}>
      <Title level={3} style={{ marginBottom: 24 }}>특허 상세 검색</Title>

      {/* 검색 필터 영역 */}
      <Card
        bordered={false}
        style={{
          marginBottom: 32,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderRadius: 12,
          background: 'var(--bg-card)'
        }}
      >
        <Form
          form={form}
          layout="horizontal"
          onFinish={onFinish}
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
        >
          <Form.Item name="techKw" label={<b>기술 키워드</b>}>
            <Input 
              size="large" 
              placeholder="예: AI OR 인공지능 AND 학습" 
              suffix={
                <Space split={<span style={{ color: '#ddd', margin: '0 4px' }}>|</span>}>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('techKw', 'AND')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    AND
                  </Button>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('techKw', 'OR')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    OR
                  </Button>
                </Space>
              } 
            />
          </Form.Item>

          <Form.Item name="prodKw" label={<b>제품 키워드</b>}>
            <Input 
              size="large" 
              placeholder="예: 자율주행차 OR 로봇" 
              suffix={
                <Space split={<span style={{ color: '#ddd', margin: '0 4px' }}>|</span>}>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('prodKw', 'AND')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    AND
                  </Button>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('prodKw', 'OR')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    OR
                  </Button>
                </Space>
              } 
            />
          </Form.Item>

          <Form.Item name="inventor" label={<b>책임연구자</b>}>
            <Input 
              size="large" 
              placeholder="예: 김철수 OR 이영희" 
              suffix={
                <Space split={<span style={{ color: '#ddd', margin: '0 4px' }}>|</span>}>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('inventor', 'AND')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    AND
                  </Button>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('inventor', 'OR')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    OR
                  </Button>
                </Space>
              } 
            />
          </Form.Item>

          <Form.Item name="affiliation" label={<b>연구자 소속</b>}>
            <Input 
              size="large" 
              placeholder="예: 전자공학과 OR 첨단융합대학" 
              suffix={
                <Space split={<span style={{ color: '#ddd', margin: '0 4px' }}>|</span>}>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('affiliation', 'AND')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    AND
                  </Button>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => handleOperator('affiliation', 'OR')}
                    style={{ padding: '0 8px', height: '24px', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    OR
                  </Button>
                </Space>
              } 
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="appNo" label={<b>출원번호</b>} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ flex: 1 }}>
              <Input
                size="large"
                style={{
                  background: theme === 'dark' ? '#1A1A1A' : '#F2F2F2',
                  color: theme === 'dark' ? '#E0E0E0' : '#444444',
                  border: theme === 'dark' ? '1px solid #333333' : '1px solid #E2E2E2',
                  borderRadius: '12px'
                }}
                placeholder="예: 10-2020-0000220"
              />
            </Form.Item>
            <Form.Item name="regNo" label={<b>등록번호</b>} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ flex: 1 }}>
              <Input
                size="large"
                style={{
                  background: theme === 'dark' ? '#1A1A1A' : '#F2F2F2',
                  color: theme === 'dark' ? '#E0E0E0' : '#444444',
                  border: theme === 'dark' ? '1px solid #333333' : '1px solid #E2E2E2',
                  borderRadius: '12px'
                }}
                placeholder="예: 10-0000220"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 24, marginTop: 16 }}>
            <Button icon={<ReloadOutlined />} onClick={onReset} size="large">초기화</Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" size="large" loading={loading} style={{ paddingLeft: 40, paddingRight: 40, borderRadius: 8 }}>
              검색하기
            </Button>
          </div>
        </Form>
      </Card>

      {/* 결과 컨트롤 영역 (탭 & 다운로드) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { label: '전체특허', key: 'all' },
            { label: '국내특허', key: 'kr' },
            { label: '해외특허', key: 'overseas' },
          ]}
          style={{ marginBottom: -1 }} // 탭 하단 보더 겹치기
        />
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          disabled={selectedRows.length === 0}
          style={{ marginBottom: 8 }}
        >
          다운로드 ({selectedRows.length})
        </Button>
      </div>

      {/* 통계 바 및 테이블 영역 */}
      <StatisticsBar />

      {loading ? (
        <Card style={{ borderRadius: 8, padding: '24px' }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      ) : (
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rows);
            },
          }}
          dataSource={paginatedData}
          columns={columns}
          bordered
          size="middle"
          pagination={{ 
            current: currentPage,
            pageSize: pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `총 ${total}건`,
            position: ['bottomCenter'],
            onChange: (page) => setCurrentPage(page),
            onShowSizeChange: (_current, size) => {
              setPageSize(size);
              setCurrentPage(1); // 페이지 사이즈 변경 시 첫 페이지로
            }
          }}
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />
      )}

      <PatentDetailModal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        data={currentPatent}
        onPdfOpen={handleOpenPdf}
      />

      <PatentPdfModal
        isOpen={isPdfOpen}
        onClose={handleClosePdf}
        appNo={currentPatent?.appNo}
      />
    </div>
  );
}