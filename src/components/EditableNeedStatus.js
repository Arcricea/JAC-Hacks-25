import React, { useState, useEffect } from 'react';

// Helper to get priority info (assuming this is defined elsewhere or passed as prop)
// Example: const priorityLevels = [{ level: 1, label: 'Low', color: 'green' }, ...];
// const getPriorityInfo = (level, levels) => levels.find(p => p.level === level) || { label: 'Unknown', color: '#ccc' };

const EditableNeedStatus = ({ 
    auth0Id, // ID of the user whose status this is
    initialPriority, 
    initialMessage, 
    priorityLevels, // Array of { level, label, color }
    getPriorityInfo, // Function to get label/color for a level
    onSave, // Async function to call on save: onSave(auth0Id, { priorityLevel, customMessage })
    disabled = false // Optionally disable editing
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [priority, setPriority] = useState(initialPriority);
    const [message, setMessage] = useState(initialMessage);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Update state if initial props change
    useEffect(() => {
        setPriority(initialPriority);
        setMessage(initialMessage);
    }, [initialPriority, initialMessage]);

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        setError('');
        try {
            await onSave(auth0Id, { priorityLevel: priority, customMessage: message });
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Failed to save status');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to initial values from props
        setPriority(initialPriority);
        setMessage(initialMessage);
        setIsEditing(false);
        setError('');
    };

    const currentPriorityInfo = getPriorityInfo(priority, priorityLevels);
    const initialPriorityInfo = getPriorityInfo(initialPriority, priorityLevels);

    return (
        <div className="editable-need-status">
            {isEditing ? (
                <div className="edit-mode">
                    <div className="status-inputs">
                        <select
                            name="priorityLevel"
                            value={priority}
                            onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                            disabled={isSaving}
                            className="inline-edit-input priority-select"
                        >
                            {priorityLevels.map(p => (
                                <option key={p.level} value={p.level}>{p.level} - {p.label}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            name="customMessage"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isSaving}
                            className="inline-edit-input message-input"
                            placeholder="Enter status message"
                        />
                    </div>
                    <div className="inline-actions">
                        <button onClick={handleSave} disabled={isSaving} className="action-button save-button">
                            {isSaving ? '...' : 'Save'}
                        </button>
                        <button onClick={handleCancel} disabled={isSaving} className="action-button cancel-button">
                            Cancel
                        </button>
                    </div>
                    {error && <p className="inline-error-message">{error}</p>}
                </div>
            ) : (
                <div className="display-mode">
                    <span 
                       className="priority-badge-inline" 
                       style={{ backgroundColor: initialPriorityInfo.color, marginRight: '10px' }}
                    >
                        {initialPriorityInfo.label}
                    </span>
                    <span className="status-message-display">
                        {initialMessage || 'No specific message'}
                    </span>
                    {!disabled && (
                        <button onClick={() => setIsEditing(true)} className="action-button edit-button inline-edit-btn">
                            Edit
                        </button>
                    )}
                </div>
            )}
            {/* Basic Styling (consider moving to CSS file) */}
            <style jsx>{`
                .editable-need-status { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
                .edit-mode { display: flex; flex-direction: column; width: 100%; gap: 5px; }
                .status-inputs { display: flex; gap: 10px; flex-grow: 1; }
                .inline-edit-input { padding: 5px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; }
                .priority-select { min-width: 150px; }
                .message-input { flex-grow: 1; }
                .inline-actions { display: flex; gap: 5px; align-self: flex-start; margin-top: 5px; }
                .display-mode { display: flex; align-items: center; gap: 10px; flex-grow: 1; }
                .inline-edit-btn { margin-left: auto; padding: 3px 8px; font-size: 0.8rem;}
                .priority-badge-inline { padding: 3px 8px; border-radius: 12px; color: white; font-size: 0.8rem; font-weight: bold; }
                .status-message-display { color: #555; font-size: 0.9rem; }
                .inline-error-message { color: red; font-size: 0.8rem; width: 100%; margin-top: 5px; }
                /* Assume action-button, save-button, cancel-button styles are defined globally */
            `}</style>
        </div>
    );
};

export default EditableNeedStatus; 