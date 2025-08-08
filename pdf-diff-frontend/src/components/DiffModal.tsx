
import React from 'react';
import { Difference } from '../types';
import './DiffModal.css';

interface Props {
  differences: Difference[];
  onDiffClick: (diff: Difference) => void;
  onClose: () => void;
}

const DiffModal: React.FC<Props> = ({ differences, onDiffClick, onClose }) => {
  const handleItemClick = (diff: Difference) => {
    onDiffClick(diff);
    onClose();
  };

  const getDiffTitle = (type: string) => {
      switch(type) {
          case "modification": return "Text Changed";
          case "addition": return "Text Added";
          case "deletion": return "Text Deleted";
          default: return "Unknown Change";
      }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Differences Report</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <ul>
            {differences.map((diff, index) => (
              <li key={index} onClick={() => handleItemClick(diff)}>
                <strong>{getDiffTitle(diff.type)}</strong> (Page {diff.page_index + 1})
                {diff.type === 'deletion' && <p>Deleted: "{diff.text_a}"</p>}
                {diff.type === 'addition' && <p>Added: "{diff.text_b}"</p>}
                {diff.type === 'modification' && (
                  <>
                    <p>Original: "{diff.text_a}"</p>
                    <p>Modified: "{diff.text_b}"</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DiffModal;
