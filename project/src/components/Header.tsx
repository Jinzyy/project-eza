import React, { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, LogOutIcon, UserIcon, SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserIcon size={16} />,
      label: 'Profile'
    },
    {
      key: 'settings',
      icon: <SettingsIcon size={16} />,
      label: 'Settings'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogOutIcon size={16} />,
      label: 'Sign out',
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  return (
    <AntHeader className={`landing-header px-4 py-0 flex items-center justify-between ${scrolled ? 'scrolled' : ''}`}>
      <div className="flex items-center">
        <div className="text-xl font-bold flex items-center mr-6">
          <span className="text-primary">Business</span>
          <span>Dashboard</span>
        </div>
        <Menu
          mode="horizontal"
          className="border-0 bg-transparent"
          selectedKeys={['dashboard']}
          items={[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'analytics', label: 'Analytics' },
            { key: 'reports', label: 'Reports' },
            { key: 'settings', label: 'Settings' },
          ]}
        />
      </div>
      <div className="flex items-center">
        <Space>
          <Button type="default">Upgrade</Button>
          <Dropdown 
            menu={{ items: userMenuItems }} 
            placement="bottomRight" 
            trigger={['click']}
          >
            <div className="avatar-dropdown">
              <Avatar src={user?.avatar} size="small" />
              <span className="hidden sm:inline">{user?.name}</span>
              <ChevronDownIcon size={16} />
            </div>
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;