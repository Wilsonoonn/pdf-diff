import React, { useState, useRef } from 'react';
import axios from 'axios';
import PdfViewer from './components/PdfViewer';
import DiffSidebar from './components/DiffSidebar'; // Import the new sidebar component
import { Difference, DocumentInfo } from './types';
import { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import './App.css';

function App() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file1Url, setFile1Url] = useState<string | null>(null);
  const [file2Url, setFile2Url] = useState<string | null>(null);
  const [pagesA, setPagesA] = useState<PDFPageProxy[]>([]);
  const [pagesB, setPagesB] = useState<PDFPageProxy[]>([]);
  const [scaleA, setScaleA] = useState(1.5);
  const [scaleB, setScaleB] = useState(1.5);
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [docInfoA, setDocInfoA] = useState<DocumentInfo | null>(null);
  const [docInfoB, setDocInfoB] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightColor, setHighlightColor] = useState('#007bff');
  const [activeDiffIndex, setActiveDiffIndex] = useState<number | null>(null);
  const [activeDiffId, setActiveDiffId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility


  
  // Refs for the scrollable containers
  const viewerRefA = useRef<HTMLDivElement | null>(null);
  const viewerRefB = useRef<HTMLDivElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
    if (e.target.files) {
      const file = e.target.files[0];
      const fileUrl = URL.createObjectURL(file);
      if (fileNumber === 1) {
        setFile1(file);
        if (file1Url) URL.revokeObjectURL(file1Url);
        setFile1Url(fileUrl);
      } else {
        setFile2(file);
        if (file2Url) URL.revokeObjectURL(file2Url);
        setFile2Url(fileUrl);
      }
    }
  };

  const handleCompare = async () => {
    if (!file1 || !file2) {
      setError('Please select two files.');
      return;
    }
    setLoading(true);
    setError(null);
    setDifferences([]);
    setDocInfoA(null);
    setDocInfoB(null);
    setActiveDiffIndex(null);

    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);

    try {
      const response = await axios.post('http://localhost:8000/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDifferences(response.data.differences);
      setDocInfoA(response.data.document_info.a);
      setDocInfoB(response.data.document_info.b);
    } catch (err) {
      setError('An error occurred during comparison.');
      console.error(err);
    }
    setLoading(false);
  };

  const handleMarkerClick = (diff: Difference) => {
    const pageIndex = diff.page_index;

    const calculateScrollPosition = (pages: PDFPageProxy[], bbox: number[] | null, absoluteY: number | null, viewerRef: React.MutableRefObject<HTMLDivElement | null>, currentScale: number, fileLabel: string) => {
      if (!viewerRef.current || pages.length === 0) {
        return;
      }

      // 计算目标位置：跳转到指定页面的顶部
      let accumulatedHeight = 0;
      for (let i = 0; i < pageIndex; i++) {
        if (pages[i]) {
          accumulatedHeight += pages[i].getViewport({ scale: currentScale }).height;
        }
      }

      // 跳转到页面顶部
      const targetY = accumulatedHeight;
      
      // 使用强制滚动
      viewerRef.current.scrollTop = targetY;
      
      // 添加视觉反馈：短暂闪烁背景
      const originalBackground = viewerRef.current.style.backgroundColor;
      viewerRef.current.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
      setTimeout(() => {
        if (viewerRef.current) {
          viewerRef.current.style.backgroundColor = originalBackground;
        }
      }, 500);
    };
    
    // 跳转到文件A的对应位置
    if (viewerRefA.current) {
      calculateScrollPosition(pagesA, diff.bbox_a, diff.absolute_y_a, viewerRefA, scaleA, 'File A');
    }
    
    // 跳转到文件B的对应位置
    if (viewerRefB.current) {
      calculateScrollPosition(pagesB, diff.bbox_b, diff.absolute_y_b, viewerRefB, scaleB, 'File B');
    }
    
    // 高亮显示选中的差异
    const diffIndex = differences.indexOf(diff);
    setActiveDiffIndex(diffIndex);
    
    // 设置激活的差异ID用于视觉反馈
    // 格式：fileId-pageIndex-diffIndex
    const diffIdA = `file1-${diff.page_index}-${diffIndex}`;
    const diffIdB = `file2-${diff.page_index}-${diffIndex}`;
    
    // 根据差异类型设置对应的ID
    if (diff.bbox_a) {
      setActiveDiffId(diffIdA);
    } else if (diff.bbox_b) {
      setActiveDiffId(diffIdB);
    } else {
      // 如果两边都有，优先显示A
      setActiveDiffId(diffIdA);
    }
    
    // 5秒后清除激活状态
    setTimeout(() => {
      setActiveDiffId(null);
    }, 5000);
  };

  // Scroll handler for PDF Viewer A
  const handleScrollA = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    
    // 同步滚动功能
    if (viewerRefB.current) {
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      viewerRefB.current.scrollTop = scrollRatio * (viewerRefB.current.scrollHeight - viewerRefB.current.clientHeight);
    }
  };

  // Scroll handler for PDF Viewer B
  const handleScrollB = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    // 同步滚动功能
    if (viewerRefA.current) {
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      viewerRefA.current.scrollTop = scrollRatio * (viewerRefA.current.scrollHeight - viewerRefA.current.clientHeight);
    }
  };

  return (
    <div className={`App ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <header className="App-header">
        <h1>PDF差异对比工具</h1>
        <button 
          className={`diff-list-toggle ${isSidebarOpen ? 'active' : ''}`} 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? '隐藏差异列表' : '显示差异列表'}
        >
          <span className="toggle-icon">📋</span>
          <span className="toggle-text">
            {isSidebarOpen ? '隐藏差异' : '显示差异'}
          </span>
          {differences.length > 0 && (
            <span className="diff-count">{differences.length}</span>
          )}
        </button>
      </header>
      <main>
        <div className="controls">
          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 1)} />
          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 2)} />
          <button onClick={handleCompare} disabled={loading}>
            {loading ? 'Comparing...' : 'Compare'}
          </button>
          <div className="color-picker-wrapper">
            <label htmlFor="highlight-color">Highlight Color:</label>
            <input
              type="color"
              id="highlight-color"
              value={highlightColor}
              onChange={(e) => setHighlightColor(e.target.value)}
            />
          </div>
          {error && <p className="error">{error}</p>}
        </div>
        
        <div className="main-content">
          <div className="side-view">
            <PdfViewer
              fileUrl={file1Url}
              highlights={differences.filter(d => d.bbox_a !== null)}
              fileId="file1"
              highlightColor={highlightColor}
              activeDiffIndex={activeDiffIndex}
              docInfo={docInfoA}
              onMarkerClick={handleMarkerClick}
              onScroll={handleScrollA}
              setScrollContainerRef={(el) => (viewerRefA.current = el)}
              setPages={setPagesA}
              pages={pagesA}
              onScaleChange={setScaleA}
              activeDiffId={activeDiffId || undefined}
            />
          </div>
          <div className="side-view">
            <PdfViewer
              fileUrl={file2Url}
              highlights={differences.filter(d => d.bbox_b !== null)}
              fileId="file2"
              highlightColor={highlightColor}
              activeDiffIndex={activeDiffIndex}
              docInfo={docInfoB}
              onMarkerClick={handleMarkerClick}
              onScroll={handleScrollB}
              setScrollContainerRef={(el) => (viewerRefB.current = el)}
              setPages={setPagesB}
              pages={pagesB}
              onScaleChange={setScaleB}
              activeDiffId={activeDiffId || undefined}
            />
          </div>
        </div>
      </main>
      <DiffSidebar
        differences={differences}
        onDiffClick={handleMarkerClick}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeDiffIndex={activeDiffIndex}
      />
    </div>
  );
}

export default App;