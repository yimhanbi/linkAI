import { Form, Input, Button, Card, Table, Tag, Space, Typography, Tabs, message, Skeleton, theme } from 'antd';
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
  const { theme: appTheme } = useContext(ThemeContext);
  const { token } = theme.useToken();

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


  // --- 검색 실행 로직  ---
  const onFinish = async (values: any) => {
    setLoading(true);
    setCurrentPage(1); 
    try {
      const cleanParams: any = {};
      
      const mapping: Record<string, string> = {
        // 상세 검색 모달 필드 (우선순위 높음)
        title: 'tech_q',
        description: 'desc_q',
        claims: 'claim_q',
        inventors: 'inventor',
        responsible: 'manager',
        affiliation: 'applicant',
        appNo: 'app_num',
        regNo: 'reg_num',
        status: 'status',
        // 메인 폼 필드 (상세 검색 모달에 값이 없을 때만 사용)
        techKw: 'tech_q',
        prodKw: 'prod_q',
        inventor: 'manager',  // 책임연구자 → responsibleInventor 필드 검색
      };

      // 1. 상세 검색 모달 필드 우선 처리
      const modalFields = ['title', 'description', 'claims', 'inventors', 'responsible', 'affiliation', 'appNo', 'regNo', 'status'];
      const mainFormFields = ['techKw', 'prodKw', 'inventor', 'affiliation', 'appNo'];
      
      // 상세 검색 모달 필드 처리
      modalFields.forEach(key => {
        const value = values[key];
        const apiField = mapping[key] || key;
        
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'status' && Array.isArray(value)) {
            cleanParams[apiField] = value;
          } else if (typeof value === 'string' && value.trim() !== '') {
            cleanParams[apiField] = value.trim();
          }
        }
      });
      
      // 메인 폼 필드 처리 (상세 검색 모달에 해당 필드가 없을 때만)
      mainFormFields.forEach(key => {
        const apiField = mapping[key] || key;
        // 이미 상세 검색 모달에서 설정된 필드는 건너뛰기
        if (cleanParams[apiField]) return;
        
        const value = values[key];
        if (value !== undefined && value !== null && value !== '' && typeof value === 'string' && value.trim() !== '') {
          cleanParams[apiField] = value.trim();
        }
      });

      // 2. API 호출 
      const response = await fetchPatents({
        ...cleanParams,
        page: 1,
        limit: 10000 
      });

      if (response && response.data) {
        // 디버깅: 실제 응답 데이터 구조 확인
        if (response.data.length > 0) {
          console.log('Sample patent data from API:', response.data[0]);
        }
        
        // 3. 데이터 매핑 (테이블용 간소화 + 모달용 전체 데이터 보존)
        let patentList = response.data.map((item: any, index: number) => {
          // Elasticsearch에서 반환된 원본 데이터를 그대로 보존 (중요!)
          // item은 Elasticsearch _source의 원본 데이터입니다
          const fullData = {
            ...item,  // 모든 원본 필드 포함
            // 명시적으로 필요한 필드들 확인
            applicationNumber: item.applicationNumber,
            abstract: item.abstract,
            applicant: item.applicant,
            claims: item.claims,
            inventors: item.inventors,
            ipcCodes: item.ipcCodes,
            cpcCodes: item.cpcCodes,
            rawRef: item.rawRef,
            title: item.title,
            applicationDate: item.applicationDate,
            openNumber: item.openNumber,
            status: item.status,
            publicationDate: item.publicationDate,
            publicationNumber: item.publicationNumber,
            registrationDate: item.registrationDate,
            registrationNumber: item.registrationNumber,
            representativeClaim: item.representativeClaim
          };
          
          // 하이라이팅 정보 추출
          const highlight = item._highlight || {};
          
          return {
            key: index + 1,
            // 테이블 표시용 필드
            country: item.countryCode || 'KR',
            status: item.status || '공개',
            appNo: item.applicationNumber,
            appDate: item.applicationDate || "-",
            title: item.title?.ko || item.title || '',
            inventor: item.inventors?.[0]?.name || item.inventor || '',
            affiliation: item.applicant?.name || item.affiliation || '',
            // 하이라이팅 정보
            _highlight: highlight,
            // 모달에 전달할 전체 원본 데이터 (Elasticsearch _source 그대로)
            fullData: fullData
          };
        });

        // 4. 강제 필터링 로직 (백엔드에서 '포기' 외 다른게 섞여올 경우 대비)
        if (values.status && Array.isArray(values.status) && values.status.length > 0) {
          patentList = patentList.filter((patent: any) => 
            values.status.includes(patent.status)
          );
        }

        setDataSource(patentList);
        setStats({ ...stats, total: patentList.length, KR: patentList.length });
        message.success(`검색 결과 ${patentList.length}건을 불러왔습니다.`);
      }
    } catch (error) {
      console.error("Search Error:", error);
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

  const columns = useMemo(() => [
    { title: 'NO', dataIndex: 'key', width: 60, align: 'center' as const },
    { title: '국가', dataIndex: 'country', width: 80, align: 'center' as const },
    {
      title: '상태', dataIndex: 'status', width: 80, align: 'center' as const,
      render: (status: string) => {
        let color = 'default';
        if (status === '등록') {
          color = 'green';
        } else if (status === '공개') {
          color = 'blue';
        } else if (status === '거절') {
          color = 'red';
        } else if (status === '취하') {
          color = 'default'; // 회색
        } else if (status === '소멸') {
          color = 'orange';
        } else if (status === '포기') {
          color = 'purple'; 
        }
        return <Tag color={color} style={{ borderRadius: '4px' }}>{status || '공개'}</Tag>;
      }
    },
    {
      title: '출원번호', dataIndex: 'appNo', width: 150, align: 'center' as const,
      render: (text: string, record: any) => (
        <a style={{ color: token.colorLink }} onClick={() => { setCurrentPatent(record.fullData || record); setIsDetailOpen(true); }}>
          {text}
        </a>
      )
    },
    { title: '출원일', dataIndex: 'appDate', width: 120, align: 'center' as const },
    {
      title: '발명의 명칭', dataIndex: 'title', align: 'left' as const,
      render: (text: string, record: any) => {
        const highlight = record._highlight || {};
        // 한국어 하이라이팅만 사용 
        const titleHighlight = highlight['title.ko'] || null;
        const originalTitle = record.fullData?.title || text;
        
        // 한국어만 추출
        let koTitle: string = '';
        if (typeof originalTitle === 'object' && originalTitle !== null) {
          koTitle = originalTitle.ko || '';
        } else {
          koTitle = String(originalTitle || text || '');
        }
        
        // 하이라이팅 적용
        const highlightedTitle = titleHighlight ? (
          <span dangerouslySetInnerHTML={{ __html: titleHighlight }} />
        ) : (
          <span>{koTitle}</span>
        );
        
        return (
          <b style={{ cursor: 'pointer', color: token.colorText, textAlign: 'left' }} onClick={() => { setCurrentPatent(record.fullData || record); setIsDetailOpen(true); }}>
            {highlightedTitle}
          </b>
        );
      }
    },
    { title: '책임연구자', dataIndex: 'inventor', width: 120, align: 'center' as const },
    { title: '소속', dataIndex: 'affiliation', width: 250, align: 'center' as const },
  ], [token.colorText, token.colorLink]);

  // 출원번호/등록번호 필드 배경색 (다크 모드 대응)
  // 다크 모드에서는 더 밝은 회색으로, 라이트 모드에서는 연한 회색으로 설정
  const numberInputBg = appTheme === 'dark' 
    ? '#3a3d45'  // 다크 모드: 약간 밝은 회색 (텍스트가 잘 보이도록)
    : '#f5f5f5'; // 라이트 모드: 연한 회색

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: token.paddingLG }}>
      <Title level={3}>특허 검색</Title>

      <Card 
        bordered={false} 
        style={{ 
          marginBottom: token.marginLG * 2, 
          borderRadius: token.borderRadiusLG, 
          boxShadow: token.boxShadow 
        }}
      >
        <Form form={form} layout="horizontal" onFinish={onFinish} labelCol={{ span: 3 }} wrapperCol={{ span: 21 }}>
          <Form.Item name="techKw" label={<b>기술 키워드</b>}>
            <Input 
              size="large" 
              placeholder="예: AI OR 인공지능 AND 학습 (특허 원문 + AI 기술분석 검색)"
              suffix={
                <Space split={<span style={{ color: token.colorTextTertiary }}>|</span>}>
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
                <Space split={<span style={{ color: token.colorTextTertiary }}>|</span>}>
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
                <Space split={<span style={{ color: token.colorTextTertiary }}>|</span>}>
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
                <Space split={<span style={{ color: token.colorTextTertiary }}>|</span>}>
                  <Button size="small" type="text" onClick={() => handleOperator('affiliation', 'AND')}>AND</Button>
                  <Button size="small" type="text" onClick={() => handleOperator('affiliation', 'OR')}>OR</Button>
                </Space>
              } 
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: token.marginLG }}>
            <Form.Item name="appNo" label={<b>출원번호</b>} style={{ flex: 1 }} labelCol={{ span: 6 }}>
              <Input 
                size="large" 
                placeholder="예: 10-2020-0000220"
                style={{ 
                  backgroundColor: numberInputBg,
                  color: token.colorText
                }}
              />
            </Form.Item>
            <Form.Item name="regNo" label={<b>등록번호</b>} style={{ flex: 1 }} labelCol={{ span: 6 }}>
              <Input 
                size="large" 
                placeholder="예: 10-0000220"
                style={{ 
                  backgroundColor: numberInputBg,
                  color: token.colorText
                }}
              />
            </Form.Item>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: token.marginSM, 
            borderTop: `1px solid ${token.colorSplit}`, 
            paddingTop: token.paddingLG, 
            marginTop: token.marginMD 
          }}>
            <Button icon={<ReloadOutlined />} onClick={onReset} size="large">초기화</Button>
            <Button 
              size="large" 
              style={{ 
                backgroundColor: '#546e7a', 
                borderColor: '#546e7a', 
                color: '#fff' 
              }} 
              onClick={() => setIsAdvModalOpen(true)}
            >
              상세 검색
            </Button>
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              htmlType="submit" 
              size="large" 
              loading={loading} 
              style={{ padding: `0 ${token.paddingXL * 2}` }}
            >
              검색하기
            </Button>
          </div>
        </Form>
      </Card>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: token.marginMD, 
        borderBottom: `1px solid ${token.colorSplit}` 
      }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={[
            { label: '전체특허', key: 'all' }, 
            { label: '국내특허', key: 'kr' }, 
            { label: '해외특허', key: 'overseas' }
          ]} 
          style={{ marginBottom: -1 }} 
        />
        <Button 
          icon={<DownloadOutlined />} 
          onClick={handleDownload} 
          disabled={selectedRows.length === 0} 
          style={{ marginBottom: token.marginXS }}
        >
          다운로드 ({selectedRows.length})
        </Button>
      </div>

      <Space size="large" style={{ marginBottom: token.marginMD }}>
        <Text>결과 <b style={{ color: token.colorPrimary }}>{filteredData.length.toLocaleString()}</b> 건</Text>
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

     {/* --- 모달 영역 연동 --- */}
      {/* 1. 상세 정보 모달 */}
      <PatentDetailModal 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        data={currentPatent} 
        onPdfOpen={() => setIsPdfOpen(true)} // PDF 버튼 클릭 시 PDF 모달 활성화
      />

      {/* 2. PDF 뷰어 모달 (appNo와 pdfPath를 모두 전달) */}
      <PatentPdfModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)} 
        appNo={currentPatent?.applicationNumber || currentPatent?.appNo} 
        pdfPath={currentPatent?.pdfPath} 
      />

      {/* 3. 상세 검색 모달 */}
      <PatentAdvancedSearchModal 
        isOpen={isAdvModalOpen} 
        onClose={() => setIsAdvModalOpen(false)} 
        onSearch={handleAdvancedSearch} 
      />
    </div>
  );
}