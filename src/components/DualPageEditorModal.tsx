import React from 'react';
import { VolumeData } from '../types/book';
import { ScreenEditorModal } from './ScreenEditorModal';

interface DualPageEditorModalProps {
  volume: VolumeData;
  currentPage: number;
  onClose: () => void;
  onPageChange?: (page: number) => void;
  onVolumeChange?: (volume: VolumeData) => void;
}

export const DualPageEditorModal: React.FC<DualPageEditorModalProps> = (props) => {
  return <ScreenEditorModal {...props} />;
};

export default DualPageEditorModal;
