import React from 'react';
import { Modal } from './Modal';
import { ShieldAlert } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy">
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-0.5">Data & Privacy</p>
            <p className="opacity-90">
              This site uses local browser storage and Firebase Authentication to anonymously distinguish unique visitors and secure database requests.
            </p>
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
