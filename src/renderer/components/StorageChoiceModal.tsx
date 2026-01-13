import React from 'react';
import './StorageChoiceModal.css';

interface StorageChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChoose: (storageType: 'local' | 'cloud') => void;
}

export const StorageChoiceModal: React.FC<StorageChoiceModalProps> = ({
    isOpen,
    onClose,
    onChoose
}) => {
    if (!isOpen) return null;

    return (
        <div className="storage-modal-overlay" onClick={onClose}>
            <div className="storage-modal" onClick={e => e.stopPropagation()}>
                <h2 className="storage-modal-title">
                    📝 Nouvelle conversation
                </h2>
                <p className="storage-modal-subtitle">
                    Où souhaitez-vous enregistrer cette conversation ?
                </p>

                <div className="storage-options">
                    <button
                        className="storage-option storage-option--local"
                        onClick={() => onChoose('local')}
                    >
                        <span className="storage-option-icon">📁</span>
                        <span className="storage-option-title">Local</span>
                        <span className="storage-option-desc">
                            Cet appareil uniquement
                        </span>
                    </button>

                    <button
                        className="storage-option storage-option--cloud"
                        onClick={() => onChoose('cloud')}
                    >
                        <span className="storage-option-icon">☁️</span>
                        <span className="storage-option-title">Cloud</span>
                        <span className="storage-option-desc">
                            Synchronisé en ligne
                        </span>
                    </button>
                </div>

                <button className="storage-modal-cancel" onClick={onClose}>
                    Annuler
                </button>
            </div>
        </div>
    );
};

export default StorageChoiceModal;
