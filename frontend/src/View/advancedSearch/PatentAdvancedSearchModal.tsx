import React from 'react';
import { Modal, Form, Input, DatePicker, Select, Row, Col, Button, Space } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

interface PatentAdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (values: any) => void;
}

const PatentAdvancedSearchModal: React.FC<PatentAdvancedSearchModalProps> = ({ isOpen, onClose, onSearch }) => {
  const [form] = Form.useForm();

  // AND/OR 연산자 추가 함수
  const handleOperator = (fieldName: string, operator: 'AND' | 'OR') => {
    const currentValue = form.getFieldValue(fieldName) || '';
    const newValue = currentValue.trim() ? `${currentValue.trim()} ${operator} ` : '';
    form.setFieldsValue({ [fieldName]: newValue });
  };

  // 오타 수정: cosnt -> const
  const handleFinish = (values: any) => {
    onSearch(values);
    onClose();
  };

  return (
    <Modal
      title={<b style={{ fontSize: '18px' }}>상세 검색 조건 설정</b>}
      open={isOpen}
      onCancel={onClose}
      zIndex={3000}
      width={800}
      footer={null}
      centered
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: '20px' }}>
        <Row gutter={[16, 0]}>
          {/* 1행: 발명의 명칭 */}
          <Col span={24}>
            <Form.Item name="title" label="발명의 명칭">
              <Input 
                placeholder="발명의 명칭을 입력하세요" 
                suffix={
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <Button size="small" type="text" onClick={() => handleOperator('title', 'AND')}>AND</Button>
                    <Button size="small" type="text" onClick={() => handleOperator('title', 'OR')}>OR</Button>
                  </Space>
                }
              />
            </Form.Item>
          </Col>

          {/* 2행: 명세서, 청구범위 */}
          <Col span={12}>
            <Form.Item name="description" label="명세서">
              <Input 
                placeholder="명세서 내 키워드" 
                suffix={
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <Button size="small" type="text" onClick={() => handleOperator('description', 'AND')}>AND</Button>
                    <Button size="small" type="text" onClick={() => handleOperator('description', 'OR')}>OR</Button>
                  </Space>
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="claims" label="청구범위">
              <Input 
                placeholder="청구범위 내 키워드" 
                suffix={
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <Button size="small" type="text" onClick={() => handleOperator('claims', 'AND')}>AND</Button>
                    <Button size="small" type="text" onClick={() => handleOperator('claims', 'OR')}>OR</Button>
                  </Space>
                }
              />
            </Form.Item>
          </Col>

          {/* 3행: 발명자, 책임연구자 */}
          <Col span={12}>
            <Form.Item name="inventors" label="발명자">
              <Input 
                placeholder="발명자 성함" 
                suffix={
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <Button size="small" type="text" onClick={() => handleOperator('inventors', 'AND')}>AND</Button>
                    <Button size="small" type="text" onClick={() => handleOperator('inventors', 'OR')}>OR</Button>
                  </Space>
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="responsible" label="책임연구자">
              <Input 
                placeholder="책임연구자 성함" 
                suffix={
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <Button size="small" type="text" onClick={() => handleOperator('responsible', 'AND')}>AND</Button>
                    <Button size="small" type="text" onClick={() => handleOperator('responsible', 'OR')}>OR</Button>
                  </Space>
                }
              />
            </Form.Item>
          </Col>

          {/* 4행: 연구자 소속 */}
          <Col span={24}>
            <Form.Item name="affiliation" label="연구자 소속">
              <Input 
                placeholder="대학명 또는 연구소명" 
                suffix={
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <Button size="small" type="text" onClick={() => handleOperator('affiliation', 'AND')}>AND</Button>
                    <Button size="small" type="text" onClick={() => handleOperator('affiliation', 'OR')}>OR</Button>
                  </Space>
                }
              />
            </Form.Item>
          </Col>

          {/* 5행: 출원번호, 등록번호 */}
          <Col span={12}>
            <Form.Item name="appNo" label="출원번호">
              <Input placeholder="10-202X-XXXXXXX" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="regNo" label="등록번호">
              <Input placeholder="10-XXXXXXX" />
            </Form.Item>
          </Col>

          {/* 6행: 출원일자, 등록일자 */}
          <Col span={12}>
            <Form.Item name="appDateRange" label="출원일자">
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="regDateRange" label="등록일자">
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>

          {/* 7행: 법적상태 */}
          <Col span={24}>
            <Form.Item name="status" label="법적상태">
              <Select mode="multiple" placeholder="상태 선택" allowClear>
                <Select.Option value="공개">공개</Select.Option>
                <Select.Option value="등록">등록</Select.Option>
                <Select.Option value="거절">거절</Select.Option>
                <Select.Option value="소멸">소멸</Select.Option>
                <Select.Option value="취하">취하</Select.Option>
                <Select.Option value="포기">포기</Select.Option>

              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* 하단 버튼 영역 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', borderTop: '1px solid #f0f0f0', paddingTop: '20px' }}>
          <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>초기화</Button>
          <Button type="primary" icon={<SearchOutlined />} htmlType="submit" style={{ padding: '0 30px' }}>적용 후 검색</Button>
        </div>
      </Form>
    </Modal>
  );
};

export default PatentAdvancedSearchModal;