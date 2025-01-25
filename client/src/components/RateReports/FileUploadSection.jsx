import React, { useEffect } from 'react';
import { Paper, TextInput, Select, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

const FileUploadSection = ({
    formData,
    loading,
    error,
    handleInputChange,
    handleFileUpload,
    occupations,
    extractedData,
    onDataExtracted
}) => {
    const handleFileChange = async (event) => {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        // Validate file
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB');
            return;
        }

        // Call the parent's upload handler
        handleFileUpload(file);
    };

    return (
        <Paper p="md" radius="md" withBorder>
            <div style={{ position: 'relative' }}>
                <LoadingOverlay visible={loading} blur={2} />
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Upload Medical Report (PDF)
                    </label>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="w-full p-2 border rounded"
                    />
                </div>
                {error && (
                    <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" className="mb-4">
                        {error}
                    </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <TextInput
                        label="Applicant Name"
                        name="applicantName"
                        value={formData.applicantName}
                        onChange={(e) => handleInputChange({ target: { name: 'applicantName', value: e.target.value } })}
                    />
                    <TextInput
                        label="Case Number"
                        name="caseNumber"
                        value={formData.caseNumber}
                        onChange={(e) => handleInputChange({ target: { name: 'caseNumber', value: e.target.value } })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <TextInput
                        label="Group Number"
                        name="groupNumber"
                        value={formData.groupNumber}
                        readOnly
                    />
                    <Select
                        label="Gender"
                        name="gender"
                        value={formData.gender}
                        onChange={(value) => handleInputChange({ target: { name: 'gender', value } })}
                        data={[
                            { value: 'male', label: 'Male' },
                            { value: 'female', label: 'Female' }
                        ]}
                    />
                </div>

                <Select
                    label="Occupation"
                    name="occupation"
                    value={formData.occupation}
                    onChange={(value) => handleInputChange({ target: { name: 'occupation', value } })}
                    data={[
                        { value: '', label: '----- Select Occupation -----' },
                        ...occupations.map(occ => ({
                            value: occ.occupation_title,
                            label: `${occ.occupation_title} ${occ.industry ? `(${occ.industry})` : ''} Group ${occ.group_number}`
                        }))
                    ]}
                    className="mt-4"
                    searchable
                    clearable
                />
            </div>
        </Paper>
    );
};

export default FileUploadSection;
