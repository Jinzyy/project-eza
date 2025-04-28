import React from 'react';
import { Card, Typography } from 'antd';
import { DivideIcon as LucideIcon } from 'lucide-react';

const { Title, Paragraph } = Typography;

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, iconColor }) => {
  return (
    <Card className="feature-card h-full">
      <div className="flex flex-col">
        <div 
          className="rounded-full w-12 h-12 flex items-center justify-center mb-4"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <div style={{ color: iconColor }}>{icon}</div>
        </div>
        <Title level={4}>{title}</Title>
        <Paragraph className="text-gray-500">{description}</Paragraph>
      </div>
    </Card>
  );
};

export default FeatureCard;