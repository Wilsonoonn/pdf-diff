import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Difference, DocumentInfo } from '../types';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import PdfPage from './PdfPage';

pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface PdfViewerProps {
  fileUrl: string | null;
  highlights: Difference[];
  fileId: string;
  highlightColor: string;
  activeDiffIndex: number | null;
  docInfo: DocumentInfo | null;
  onMarkerClick: (diff: Difference) => void;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  setScrollContainerRef: (el: HTMLDivElement | null) => void;
  setPages: React.Dispatch<React.SetStateAction<PDFPageProxy[]>>; // New prop
  pages: PDFPageProxy[]; // Add pages as a prop
  onScaleChange: (scale: number) => void; // New prop to pass scale back to parent
  activeDiffId?: string; // 新增：当前激活的差异ID
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, highlights, fileId, highlightColor, activeDiffIndex, docInfo, onMarkerClick, onScroll, setScrollContainerRef, setPages, pages, onScaleChange, activeDiffId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState(1.5);
  const viewerContainerRef = useRef<HTMLDivElement>(null); // Ref for the main scrollable container
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const viewerElement = viewerContainerRef.current;

    if (pages.length > 0 && viewerElement) {
      const firstPage = pages[0];

      const updateScale = () => {
        // Calculate scale based on the actual content width
        const contentWidth = viewerElement.clientWidth - (docInfo ? 17 : 0); // Subtract scrollbar width if map is present
        const newCalculatedScale = contentWidth / firstPage.getViewport({ scale: 1 }).width;
        setScale(newCalculatedScale);
        onScaleChange(newCalculatedScale);
      };

      // Set up ResizeObserver to react to container size changes
      const resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(viewerElement);

      // Initial calculation
      updateScale();

      // Cleanup observer on component unmount
      return () => {
        resizeObserver.unobserve(viewerElement);
      };
    }
  }, [pages, docInfo, onScaleChange]); // Rerun when pages or docInfo (which affects contentWidth) change

  useEffect(() => {
    if (!fileUrl) {
      setPages([]); // Update parent state
      return;
    }

    const loadPdf = async () => {
      setIsLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const loadedPdf: PDFDocumentProxy = await loadingTask.promise;
        
        const allPages: PDFPageProxy[] = [];
        for (let i = 1; i <= loadedPdf.numPages; i++) {
          const page = await loadedPdf.getPage(i);
          allPages.push(page);
        }
        setPages(allPages); // Update parent state
      } catch (error) {
        console.error("Error loading PDF:", error);
        setPages([]); // Update parent state
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();

  }, [fileUrl, setPages]); // Add setPages to dependency array

  useEffect(() => {
    // 将 ref 传递给父组件
    if (viewerContainerRef.current) {
      setScrollContainerRef(viewerContainerRef.current);
    }
  }, [setScrollContainerRef]);

  const handleViewerScroll = (event: React.UIEvent<HTMLDivElement>) => {
    onScroll(event); // Call the parent's scroll handler

    const { scrollTop, clientHeight } = event.currentTarget;
    if (pages.length > 0) {
      let newCurrentPage = 0;
      let accumulatedHeight = 0;
      for (let i = 0; i < pages.length; i++) {
        const pageHeight = pages[i].getViewport({ scale }).height;
        if (scrollTop >= accumulatedHeight && scrollTop < accumulatedHeight + pageHeight) {
          newCurrentPage = i + 1;
          break;
        }
        accumulatedHeight += pageHeight;
      }
      setCurrentPage(newCurrentPage);
    }
  };

  return (
    <div 
      className="pdf-viewer-container" 
      ref={viewerContainerRef} 
      onScroll={handleViewerScroll} // 监听此容器的滚动事件
    >
      <div className="all-pages-content"> {/* This wraps all PDF pages */}
        {isLoading && (
          <div className="pdf-placeholder"><p>Loading PDF pages...</p></div>
        )}
        {!isLoading && !fileUrl && (
          <div className="pdf-placeholder"><p>Please upload a PDF file.</p></div>
        )}
        {pages.map((page, index) => (
          <PdfPage
            key={`${fileId}-page-${page.pageNumber}`}
            page={page}
            scale={scale}
            highlights={highlights.filter(h => h.page_index === index)}
            highlightColor={highlightColor}
            activeDiffIndex={activeDiffIndex}
            pageIndex={index}
            fileId={fileId}
            activeDiffId={activeDiffId}
          />
        ))}
      </div>
      {fileUrl && pages.length > 0 && (
        <div className="page-number-display">
          Page {currentPage} of {pages.length}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;