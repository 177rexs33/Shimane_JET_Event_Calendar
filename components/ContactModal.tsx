import React from 'react';
import { Modal } from './Modal';
import { Mail, MessageSquare } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact Information">
      <div className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 border-b pb-1">Contact ALT or CIR PA</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-400" />
              <span>shimane.alt.pa(at)gmail(dot)com</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-400" />
              <span>shimanecirpa(at)gmail(dot)com</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 border-b pb-1">Contact the developer</h4>
          <p className="text-xs text-gray-500">Justin (2024-2026 Gotsu ALT)</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-400" />
              <span>jwang1770(at)outlook(dot)com</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-gray-400" />
              <span>Discord: stormbow</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
