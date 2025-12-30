import { Form, Input, Button, Card, Table, Tag, Space, Typography, Tabs, message, Skeleton } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useState, useContext, useMemo } from 'react';
import { ThemeContext } from '../../shared/theme/ThemeContext';
import PatentDetailModal from './PatentDetailModal';
import PatentPdfModal from './PatentPdfModal';
import { fetchPatents } from '../../Service/ip/patentService';
import PatentAdvancedSearchModal from './PatentAdvancedSearchModal';

const { Title, Text } = Typography;

export default function AdvancedSearchPage() {
  const [form] = Form.useForm();
  const { theme } = useContext(ThemeContext);

  // --- 상태 관리 ---
  const [dataSource, setDataSource] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);          
  const [activeTab, setActiveTab] = useState('all');      
  const [stats, setStats] = useState({                    
    total: 0, KR: 0, US: 0, EP: 0, JP: 0, CN: 0, PCT: 0, etc: 0
  });
  const [currentPage, setCurrentPage] = useState(1);      
  const [pageSize, setPageSize] = useState(10);          
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); 
  const [selectedRows, setSelectedRows] = useState<any[]>([]); 

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [currentPatent, setCurrentPatent] = useState<any | null>(null);
  const [isAdvModalOpen, setIsAdvModalOpen] = useState(false); 

  // --- 탭 데이터 필터링 ---
  const filteredData = useMemo(() => {
    let data = dataSource;
    if (activeTab === 'kr') {
      data = dataSource.filter(item => item.country === 'KR');
    } else if (activeTab === 'overseas') {
      data = dataSource.filter(item => item.country !== 'KR');
    }
    return data;
  }, [dataSource, activeTab]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // --- 검색 실행 로직 (핵심) ---
  const onFinish = async (values: any) => {
    setLoading(true);
    setCurrentPage(1); 
    try {
      // 상세 검색 모달과 메인 폼의 데이터를 통합하여 API 파라미터 구성
      const params = {
        tech_q: values.techKw || values.title || "",  // 키워드 혹은 발명의 명칭
        prod_q: values.prodKw || values.description || "", // 제품 키워드 혹은 명세서
        inventor: values.inventor || values.responsible || "", // 연구자
        applicant: values.affiliation || "",
        app_num: values.appNo || "",
        reg_num: values.regNo || "",
        // 날짜 데이터가 존재할 경우 포맷팅
        start_date: values.appDateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: values.appDateRange?.[1]?.format('YYYY-MM-DD'),
        page: 1,
        limit: 10000 
      };

      const response = await fetchPatents(params); 

      if (response && response.data) {
        const patentList = response.data.map((item: any, index: number) => ({
          key: index + 1,
          country: item.countryCode || 'KR',
          status: item.status || '공개',
          appNo: item.applicationNumber,
          appDate: item.applicationDate || "-",
          title: item.title?.ko || item.title,
          inventor: item.inventors?.[0]?.name || item.inventor,
          affiliation: item.applicant?.name || item.affiliation,
          // 상세 페이지용 추가 데이터
          summary: item.abstract || "",
          mainClaim: item.representativeClaim || ""
        }));

        setDataSource(patentList);
        setStats({ ...stats, total: response.total, KR: response.total });
        message.success(`검색 결과 ${response.total}건을 불러왔습니다.`);
      }
    } catch (error) {
      message.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상세 검색 모달 핸들러 (onFinish로 데이터 전달)
  const handleAdvancedSearch = (values: any) => {
    console.log("상세 검색 데이터 수신:", values);
    onFinish(values);
  };

  const onReset = () => {
    form.resetFields();
    setDataSource([]);
    setStats({ total: 0, KR: 0, US: 0, EP: 0, JP: 0, CN: 0, PCT: 0, etc: 0 });
    setSelectedRowKeys([]);
    setSelectedRows([]);
    message.info('검색 조건이 초기화되었습니다.');
  };

  const handleOperator = (fieldName: string, operator: 'AND' | 'OR') => {
    const currentValue = form.getFieldValue(fieldName) || '';
    const newValue = currentValue.trim() ? `${currentValue.trim()} ${operator} ` : '';
    form.setFieldsValue({ [fieldName]: newValue });
  };

  const handleDownload = async () => {
    if (selectedRows.length === 0) {
      message.warning('다운로드할 특허를 선택해주세요.');
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const excelData = selectedRows.map((item, index) => ({
        'NO': index + 1, '국가': item.country, '상태': item.status, '출원번호': item.appNo,
        '출원일': item.appDate, '발명의 명칭': item.title, '책임연구자': item.inventor, '소속': item.affiliation
      }));
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '특허리스트');
      XLSX.writeFile(workbook, `특허검색결과_${new Date().toLocaleDateString()}.xlsx`);
    } catch (e) { message.error('다운로드 중 오류 발생'); }
  };

  const columns = [
    { title: 'NO', dataIndex: 'key', width: 60, align: 'center' as const },
    { title: '국가', dataIndex: 'country', width: 80, align: 'center' as const },
    {
      title: '상태', dataIndex: 'status', width: 80, align: 'center' as const,
      render: (status: string) => <Tag color={status === '등록' ? 'green' : 'blue'}>{status || '공개'}</Tag>
    },
    {
      title: '출원번호', dataIndex: 'appNo', width: 150, align: 'center' as const,
      render: (text: string, record: any) => <a onClick={() => { setCurrentPatent(record); setIsDetailOpen(true); }}>{text}</a>
    },
    { title: '출원일', dataIndex: 'appDate', width: 120, align: 'center' as const },
    {
      title: '발명의 명칭', dataIndex: 'title', align: 'center' as const,
      render: (text: string, record: any) => <b style={{ cursor: 'pointer' }} onClick={() => { setCurrentPatent(record); setIsDetailOpen(true); }}>{text}</b>
    },
    { title: '책임연구자', dataIndex: 'inventor', width: 120, align: 'center' as const },
    { title: '소속', dataIndex: 'affiliation', width: 250, align: 'center' as const },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
      <Title level={3}>특허 검색</Title>

      <Card bordered={false} style={{ marginBottom: 32, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Form form={form} layout="horizontal" onFinish={onFinish} labelCol={{ span: 3 }} wrapperCol={{ span: 21 }}>
          <Form.Item name="techKw" label={<b>기술 키워드</b>}>
            <Input 
              size="large" 
              placeholder="예: AI OR 인공지능 AND 학습 (특허 원문 + AI 기술분석 검색)"
              suffix={
                <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                  <Button size="small" type="text" onClick={() => handleOperator('techKw', 'AND')}>AND</Button>
                  <Button size="small" type="text" onClick={() => handleOperator('techKw', 'OR')}>OR</Button>
                </Space>
              } 
            />
          </Form.Item>
          <Form.Item name="prodKw" label={<b>제품 키워드</b>}>
            <Input 
              size="large" 
              placeholder="예: 자율주행차 OR 로봇 (AI 적용제품 분석 검색)"
              suffix={
                <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                  <Button size="small" type="text" onClick={() => handleOperator('prodKw', 'AND')}>AND</Button>
                  <Button size="small" type="text" onClick={() => handleOperator('prodKw', 'OR')}>OR</Button>
                </Space>
              } 
            />
          </Form.Item>
          <Form.Item name="inventor" label={<b>책임연구자</b>}>
            <Input 
              size="large" 
              placeholder="예: 홍길동 OR 홍길순"
              suffix={
                <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                  <Button size="small" type="text" onClick={() => handleOperator('inventor', 'AND')}>AND</Button>
                  <Button size="small" type="text" onClick={() => handleOperator('inventor', 'OR')}>OR</Button>
                </Space>
              } 
            />
          </Form.Item>
          <Form.Item name="affiliation" label={<b>연구자 소속</b>}>
            <Input 
              size="large" 
              placeholder="예: 전자공학과 OR 첨단융합대학"
              suffix={
                <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                  <Button size="small" type="text" onClick={() => handleOperator('affiliation', 'AND')}>AND</Button>
                  <Button size="small" type="text" onClick={() => handleOperator('affiliation', 'OR')}>OR</Button>
                </Space>
              } 
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="appNo" label={<b>출원번호</b>} style={{ flex: 1 }} labelCol={{ span: 6 }}>
              <Input 
                size="large" 
                placeholder="예: 10-2020-0000220"
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
            <Form.Item name="regNo" label={<b>등록번호</b>} style={{ flex: 1 }} labelCol={{ span: 6 }}>
              <Input 
                size="large" 
                placeholder="예: 10-0000220"
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 24, marginTop: 16 }}>
            <Button icon={<ReloadOutlined />} onClick={onReset} size="large">초기화</Button>
            <Button size="large" style={{ backgroundColor: '#546e7a', borderColor: '#546e7a', color: '#fff' }} onClick={() => setIsAdvModalOpen(true)}>상세 검색</Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" size="large" loading={loading} style={{ padding: '0 40px' }}>검색하기</Button>
          </div>
        </Form>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ label: '전체특허', key: 'all' }, { label: '국내특허', key: 'kr' }, { label: '해외특허', key: 'overseas' }]} style={{ marginBottom: -1 }} />
        <Button icon={<DownloadOutlined />} onClick={handleDownload} disabled={selectedRows.length === 0} style={{ marginBottom: 8 }}>다운로드 ({selectedRows.length})</Button>
      </div>

      <Space size="large" style={{ marginBottom: 16 }}>
        <Text>결과 <b style={{ color: '#1890ff' }}>{filteredData.length.toLocaleString()}</b> 건</Text>
      </Space>

      {loading ? <Skeleton active paragraph={{ rows: 10 }} /> : (
        <Table
          rowSelection={{ selectedRowKeys, onChange: (keys, rows) => { setSelectedRowKeys(keys); setSelectedRows(rows); } }}
          dataSource={paginatedData}
          columns={columns}
          bordered
          pagination={{ 
            current: currentPage, pageSize, total: filteredData.length, 
            onChange: (p) => setCurrentPage(p), onShowSizeChange: (_, s) => setPageSize(s),
            position: ['bottomCenter']
          }}
        />
      )}

      {/* 모달 영역 */}
      <PatentDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} data={currentPatent} onPdfOpen={() => setIsPdfOpen(true)} />
      <PatentPdfModal isOpen={isPdfOpen} onClose={() => setIsPdfOpen(false)} appNo={currentPatent?.appNo} />
      <PatentAdvancedSearchModal isOpen={isAdvModalOpen} onClose={() => setIsAdvModalOpen(false)} onSearch={handleAdvancedSearch} />
    </div>
  );
}