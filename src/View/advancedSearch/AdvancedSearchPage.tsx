import { Form, Input, Button, Card, Table, Tag, Space, Typography, Tabs, message } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useState, useContext, useMemo } from 'react';
import { ThemeContext } from '../../shared/theme/ThemeContext';
import { fetchPatents } from '../../Service/patentService';

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

  //  탭에 따른 데이터 필터링 로직
  const filteredData = useMemo(() => {
    if (activeTab === 'all') return dataSource;
    if (activeTab === 'kr') return dataSource.filter(item => item.country === 'KR');
    if (activeTab === 'overseas') return dataSource.filter(item => item.country !== 'KR');
    return dataSource;
  }, [dataSource, activeTab]);

  const onReset = () => {
    form.resetFields();
    setDataSource([]);
    setStats({ total: 0, KR: 0, US: 0, EP: 0, JP: 0, CN: 0, PCT: 0, etc: 0 });
    message.info('검색 조건이 초기화되었습니다.');
  };

  // 2. 다운로드 버튼 핸들러
  const handleDownload = () => {
    if (filteredData.length === 0) {
      message.warning('다운로드할 데이터가 없습니다.');
      return;
    }
    console.log('다운로드 데이터:', filteredData);
    message.loading('엑셀 파일 생성 중...', 1.5).then(() => {
      message.success('다운로드가 완료되었습니다.');
    });
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
    { title: '출원번호', dataIndex: 'appNo', key: 'appNo', width: 150, render: (text: string) => <a style={{ color: '#1890ff' }}>{text}</a> },
    { title: '출원일', dataIndex: 'appDate', key: 'appDate', width: 120 },
    {
      title: '발명의 명칭',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <b style={{ cursor: 'pointer' }}>{text}</b>
    },
    { title: '책임연구자', dataIndex: 'inventor', key: 'inventor', width: 120, align: 'center' as const },
    { title: '소속', dataIndex: 'affiliation', key: 'affiliation', width: 150 },
  ];

  // 4. 검색 실행 함수
  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      //API 호출 (파라미터명은 백엔드의 tech_q, prod_q 등에 맞춰 전달)
      const response = await fetchPatents({
        tech_q: values.techKw,
        prod_q: values.prodKw,
        inventor: values.inventor,
        applicant: values.affiliation,
        app_num: values.appNo
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
            <Input size="large" placeholder="예: AI OR 인공지능 AND 학습" suffix={<Space><Button size="small" type="text">AND</Button>| <Button size="small" type="text">OR</Button></Space>} />
          </Form.Item>

          <Form.Item name="prodKw" label={<b>제품 키워드</b>}>
            <Input size="large" placeholder="예: 자율주행차 OR 로봇" suffix={<Space><Button size="small" type="text">AND</Button>| <Button size="small" type="text">OR</Button></Space>} />
          </Form.Item>

          <Form.Item name="inventor" label={<b>책임연구자</b>}>
            <Input size="large" placeholder="예: 김철수 OR 이영희" />
          </Form.Item>

          <Form.Item name="affiliation" label={<b>연구자 소속</b>}>
            <Input size="large" placeholder="예: 전자공학과 OR 첨단융합대학" />
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
          disabled={filteredData.length === 0}
          style={{ marginBottom: 8 }}
        >
          다운로드
        </Button>
      </div>

      {/* 통계 바 및 테이블 영역 */}
      <StatisticsBar />

      <Table
        dataSource={filteredData}
        columns={columns}
        loading={loading}
        bordered
        size="middle"
        pagination={{ 
          pageSize: 10, 
          showSizeChanger: true, 
          position: ['bottomCenter'],
          showTotal: (total) => `총 ${total}건`
        }}
        style={{ borderRadius: 8, overflow: 'hidden' }}
      />
    </div>
  );
}