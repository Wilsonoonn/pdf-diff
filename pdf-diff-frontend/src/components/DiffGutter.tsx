
import React from 'react';
import { Difference } from '../types';
import './DiffGutter.css';

interface Props {
  differences: Difference[];
  baseFile: 'file1' | 'file2';
  onDiffClick: (diff: Difference, index: number) => void;
  activeDiffIndex: number | null;
}

const DiffGutter: React.FC<Props> = ({ differences, baseFile, onDiffClick, activeDiffIndex }) => {

  const getMarkerSymbol = (diff: Difference): '+' | '-' | '~' => {
    if (baseFile === 'file1') {
      if (diff.type === 'addition') return '+';
      if (diff.type === 'deletion') return '-';
    } else { // baseFile is 'file2'
      if (diff.type === 'addition') return '-';
      if (diff.type === 'deletion') return '+';
    }
    return '~'; // For modifications
  };

  return (
    <div className="diff-gutter">
      {differences.map((diff, index) => {
        const bbox = baseFile === 'file1' ? diff.bbox_a : diff.bbox_b;
        if (!bbox) return null;

        return (
          <div
            key={index}
            className={`gutter-marker ${activeDiffIndex === index ? 'active' : ''}`}
            style={{ top: `${bbox[1]}px` }}
            onClick={() => onDiffClick(diff, index)}
          >
            {getMarkerSymbol(diff)}
          </div>
        );
      })}
    </div>
  );
};

export default DiffGutter;
