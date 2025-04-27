import React, { useState, useEffect, useRef } from 'react';

const EditableContactField = ({ 
    auth0Id, // ID of the user this field belongs to
    fieldName, // e.g., 'address', 'phone', 'email', 'openingHours'
    label, 
    initialValue, 
    placeholder = 'Not set',
    onSave, // Async function: onSave(auth0Id, { [fieldName]: newValue })
    inputType = 'text', // 'text', 'email', 'tel', 'textarea'
    disabled = false, // Optionally disable editing
    useGoogleAutocomplete = false, // Specific flag for address
    isGoogleLoaded = false // Prop indicating if Google Maps script is loaded
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null); // Ref for focusing or Google Autocomplete
    const autocompleteRef = useRef(null); // Ref for Google Autocomplete instance

    // Update state if initial value changes
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    // Initialize Google Autocomplete if needed
    useEffect(() => {
      if (isEditing && useGoogleAutocomplete && isGoogleLoaded && inputRef.current) {
        try {
          if (!autocompleteRef.current) { // Prevent re-initialization
             autocompleteRef.current = new window.google.maps.places.Autocomplete(
               inputRef.current,
               { componentRestrictions: { country: ["us", "ca"] }, fields: ["formatted_address"], types: ["address"] }
             );
             autocompleteRef.current.addListener("place_changed", () => {
               const place = autocompleteRef.current.getPlace();
               if (place.formatted_address) {
                 setValue(place.formatted_address); // Update state with selected address
               }
             });
          }
        } catch(err) {
            console.error("Error initializing Google Autocomplete in EditableContactField:", err);
            setError('Autocomplete failed.');
        }
        // Cleanup logic handled in the main component where GoogleMapsScript is loaded
      }
    }, [isEditing, useGoogleAutocomplete, isGoogleLoaded]);

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        setError('');
        try {
            await onSave(auth0Id, { [fieldName]: value.trim() });
            setIsEditing(false);
        } catch (err) {
            setError(err.message || `Failed to save ${label}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to initial value from props
        setValue(initialValue);
        setIsEditing(false);
        setError('');
    };

    const InputComponent = inputType === 'textarea' ? 'textarea' : 'input';

    return (
        <div className="editable-contact-field">
            <h4>{label}</h4>
            <div className="field-content">
                {isEditing ? (
                    <div className="edit-mode">
                        <InputComponent
                            ref={inputRef} // Attach ref
                            type={InputComponent === 'input' ? inputType : undefined}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={`Enter ${label}...`}
                            disabled={isSaving || (useGoogleAutocomplete && !isGoogleLoaded)}
                            rows={InputComponent === 'textarea' ? 3 : undefined}
                            className="inline-edit-input"
                        />
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
                        <span className="display-value">{value || placeholder}</span>
                        {!disabled && (
                            <button onClick={() => setIsEditing(true)} className="action-button edit-button inline-edit-btn">
                                Edit
                            </button>
                        )}
                    </div>
                )}
            </div>
             {/* Basic Styling (consider moving to CSS file) */}
             <style jsx>{`
                .editable-contact-field { margin-bottom: 15px; }
                .editable-contact-field h4 { margin: 0 0 5px 0; font-size: 0.9rem; color: #333; font-weight: 600; }
                .field-content { position: relative; }
                .edit-mode { display: flex; flex-direction: column; gap: 5px; }
                .display-mode { display: flex; align-items: center; justify-content: space-between; padding: 8px; background-color: #f9f9f9; border-radius: 4px; min-height: 36px;}
                .display-value { font-size: 0.95rem; color: #555; white-space: pre-wrap; word-break: break-word; padding-right: 5px; }
                .inline-edit-input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem; box-sizing: border-box; }
                .inline-actions { display: flex; gap: 5px; align-self: flex-start; margin-top: 5px; }
                .inline-edit-btn { padding: 3px 8px; font-size: 0.8rem; }
                .inline-error-message { color: red; font-size: 0.8rem; width: 100%; margin-top: 5px; }
                /* Assume action-button styles are defined globally */
            `}</style>
        </div>
    );
};

export default EditableContactField; 