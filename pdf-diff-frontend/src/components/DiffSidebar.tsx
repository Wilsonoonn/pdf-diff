import React, { useState, useMemo } from 'react';
import { Difference } from '../types';
import './DiffSidebar.css';

interface DiffSidebarProps {
  differences: Difference[];
  onDiffClick: (diff: Difference) => void;
  isOpen: boolean;
  onClose: () => void;
  activeDiffIndex: number | null;
}

const DiffSidebar: React.FC<DiffSidebarProps> = ({ 
  differences, 
  onDiffClick, 
  isOpen, 
  onClose, 
  activeDiffIndex 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'modification' | 'addition' | 'deletion'>('all');

  // 过滤和搜索差异
  const filteredDifferences = useMemo(() => {
    return differences.filter(diff => {
      const matchesSearch = searchTerm === '' || 
        diff.text_a?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diff.text_b?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || diff.type === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [differences, searchTerm, filterType]);

  const getDiffTitle = (type: string) => {
    switch (type) {
      case "modification": return "文本修改";
      case "addition": return "段落新增";
      case "deletion": return "段落删除";
      default: return "未知变更";
    }
  };

  const getDiffIcon = (type: string) => {
    switch (type) {
      case "modification": return "✏️";
      case "addition": return "➕";
      case "deletion": return "➖";
      default: return "❓";
    }
  };

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className={`diff-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="diff-sidebar-header">
        <div className="header-left">
          <span className="header-icon">📋</span>
          <span className="header-title">差异列表</span>
        </div>
        <div className="header-right">
          <button onClick={onClose} className="diff-sidebar-close" title="关闭差异列表">
            <span>&times;</span>
          </button>
        </div>
      </div>
      
      {/* 过滤和搜索控件 */}
      <div className="diff-sidebar-controls">
        <div className="controls-row">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              全部 ({differences.length})
            </button>
            <button 
              className={`filter-btn ${filterType === 'addition' ? 'active' : ''}`}
              onClick={() => setFilterType('addition')}
            >
              ➕ 新增 ({differences.filter(d => d.type === 'addition').length})
            </button>
            <button 
              className={`filter-btn ${filterType === 'deletion' ? 'active' : ''}`}
              onClick={() => setFilterType('deletion')}
            >
              ➖ 删除 ({differences.filter(d => d.type === 'deletion').length})
            </button>
            <button 
              className={`filter-btn ${filterType === 'modification' ? 'active' : ''}`}
              onClick={() => setFilterType('modification')}
            >
              ✏️ 修改 ({differences.filter(d => d.type === 'modification').length})
            </button>
          </div>
        </div>
        <div className="controls-row">
          <div className="search-container">
            <input
              type="text"
              placeholder="搜索差异内容..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* 差异列表 */}
      <div className="diff-list-container">
        {filteredDifferences.length === 0 ? (
          <div className="no-differences">
            {differences.length === 0 ? (
              <p>未发现差异</p>
            ) : (
              <p>没有找到匹配的差异</p>
            )}
          </div>
        ) : (
          <div className="diff-list">
            {filteredDifferences.map((diff, index) => {
              const globalIndex = differences.indexOf(diff);
              const isActive = globalIndex === activeDiffIndex;
              
              return (
                <div
                  key={globalIndex}
                  className={`diff-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => onDiffClick(diff)}
                >
                  <div className="diff-item-header">
                    <span className={`diff-icon ${diff.type}`}>
                      {getDiffIcon(diff.type)}
                    </span>
                    <div className="diff-info">
                      <span className="diff-type">{getDiffTitle(diff.type)}</span>
                      <span className="diff-page">第 {diff.page_index + 1} 页</span>
                    </div>
                  </div>
                  
                  <div className="diff-content">
                    {diff.type === 'deletion' && (
                      <>
                        <div className="diff-section">
                          <div className="diff-label">左:</div>
                          <div className="diff-text">{diff.text_a || '无内容'}</div>
                        </div>
                        <div className="diff-section">
                          <div className="diff-label">右:</div>
                          <div className="diff-text">无内容</div>
                        </div>
                      </>
                    )}
                    {diff.type === 'addition' && (
                      <>
                        <div className="diff-section">
                          <div className="diff-label">左:</div>
                          <div className="diff-text">无内容</div>
                        </div>
                        <div className="diff-section">
                          <div className="diff-label">右:</div>
                          <div className="diff-text">{diff.text_b || '无内容'}</div>
                        </div>
                      </>
                    )}
                    {diff.type === 'modification' && (
                      <>
                        <div className="diff-section">
                          <div className="diff-label">左:</div>
                          <div className="diff-text">{diff.text_a || '无内容'}</div>
                        </div>
                        <div className="diff-section">
                          <div className="diff-label">右:</div>
                          <div className="diff-text">{diff.text_b || '无内容'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffSidebar;