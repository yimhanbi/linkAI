import { Form, Input, Button, Card, Table, Tag, Space, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function AdvancedSearchPage() {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('검색 조건:', values);
  };

  const onReset = () => {
    form.resetFields();
  };

  // 테이블 데이터 예시
  const dataSource = [
    {
      key: '1',
      appNo: '10-2023-1234567',
      title: '인공지능 기반의 특허 분석 시스템 및 방법',
      inventor: '홍길동',
      status: '등록',
    },
  ];

  const columns = [
    { title: '출원번호', dataIndex: 'appNo', key: 'appNo', render: (text: string) => <a style={{ color: '#1890ff', fontWeight: 500 }}>{text}</a> },
    { title: '발명의 명칭', dataIndex: 'title', key: 'title', render: (text: string) => <b>{text}</b> },
    { title: '책임연구자', dataIndex: 'inventor', key: 'inventor', align: 'center' as const },
    { 
      title: '상태', 
      dataIndex: 'status', 
      key: 'status', 
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={status === '등록' ? 'green' : 'blue'} bordered={false}>
          {status}
        </Tag>
      )
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', textAlign: 'left' }}>
      <Title level={3} style={{ marginBottom: 24 }}>특허 상세 검색</Title>

      <Card 
        bordered={false} 
        style={{ 
          marginBottom: 32, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderRadius: 12,
          background: 'var(--bg-card)' // 기존 테마 변수 활용
        }}
      >
        <Form
          form={form}
          layout="horizontal"
          onFinish={onFinish}
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
          style={{ marginTop: 8 }}
        >
          {/* 주요 키워드 영역 */}
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

          {/* 번호 정보 (2열 배치) */}
          <div style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="appNo" label={<b>출원번호</b>} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ flex: 1 }}>
              <Input size="large" style={{ background: '#F9F7F7', color: '#9E989E', border: 'none' }} placeholder="10-2020-0000220" />
            </Form.Item>
            <Form.Item name="regNo" label={<b>등록번호</b>} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ flex: 1 }}>
              <Input size="large" style={{ background: '#F9F7F7', color: '#9E989E', border: 'none' }} placeholder="10-0000220" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
            <Button icon={<ReloadOutlined />} onClick={onReset} size="large">초기화</Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" size="large" style={{ paddingLeft: 40, paddingRight: 40, borderRadius: 8 }}>
              검색하기
            </Button>
          </div>
        </Form>
      </Card>

      <Title level={4} style={{ marginBottom: 16 }}>검색 결과</Title>
      <Table 
        dataSource={dataSource} 
        columns={columns} 
        pagination={false}
        bordered
        style={{ borderRadius: 8, overflow: 'hidden' }}
      />
    </div>
  );
}